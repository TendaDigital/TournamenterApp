const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')
const { setTimeout: delay } = require('node:timers/promises')
const { portNumber } = require('./profiles.cjs')

function canonicalPath(input) {
  const resolved = path.resolve(input)
  const existing = fs.existsSync(resolved)
    ? fs.realpathSync(resolved)
    : path.join(canonicalPath(path.dirname(resolved)), path.basename(resolved))
  return process.platform === 'win32' ? existing.toLowerCase() : existing
}

class Servers {
  constructor(profiles, extensions, runtime, spawnServer, notify) {
    Object.assign(this, { profiles, extensions, runtime, spawnServer, notify })
    this.active = new Map()
    this.logs = new Map()
  }
  status(id) { return this.active.get(id)?.status ?? 'Stopped' }
  append(id, message) {
    const logs = this.logs.get(id) ?? []
    logs.push(String(message).trimEnd().slice(-8192))
    if (logs.length > 500) logs.shift()
    this.logs.set(id, logs)
    this.notify()
  }
  start(id, retries = 0) {
    if (this.active.has(id)) return
    const { env, extensions } = this.profiles.get(id)
    const port = portNumber(env.PORT)
    const file = /\.db$/i.test(env.DB_FOLDER) ? env.DB_FOLDER : path.join(env.DB_FOLDER, id + '.db')
    const database = canonicalPath(file)
    for (const server of this.active.values()) {
      if (server.port === port) throw new Error('Another server already uses this port.')
      if (server.database === database) throw new Error('Another server already uses this database.')
    }
    const token = randomUUID()
    const paths = this.extensions.paths(extensions)
    const cwd = path.join(this.runtime, 'core')
    const server = { status: 'Starting', port, database, retries }
    const temp = path.join(this.profiles.userData, 'tmp', id)
    fs.mkdirSync(temp, { recursive: true })
    const child = this.spawnServer(path.join(cwd, 'bin', 'tournamenter.js'), [], {
      cwd, stdio: 'pipe', serviceName: 'Tournamenter ' + id,
      env: { ...process.env, ...env, HOST: '0.0.0.0', PORT: String(port), APP_UID: id,
        TMP_PATH: temp, NODE_ENV: 'production',
        TOURNAMENTER_INSTANCE_TOKEN: token, TOURNAMENTER_EXTENSIONS_JSON: JSON.stringify(paths) }
    })
    server.child = child
    this.active.set(id, server)
    if (!retries) this.logs.set(id, [])
    this.append(id, 'Starting server ' + id)
    child.on('error', err => this.append(id, String(err?.message ?? err)))
    child.stdout?.on('data', data => this.append(id, data))
    child.stderr?.on('data', data => this.append(id, data))
    server.done = new Promise(resolve => {
      child.once('exit', code => {
        clearTimeout(server.forceStop)
        this.active.delete(id)
        this.append(id, 'Server exited (' + code + ')')
        resolve()
        if (server.status === 'Running' && retries < 5) {
          try { this.start(id, retries + 1) } catch (err) { this.append(id, err.message) }
        }
      })
    })
    this.waitForReady(id, server, token).catch(error => {
      if (this.active.get(id) !== server || server.status !== 'Starting') return
      this.append(id, error.message)
      this.stop(id)
    })
  }
  async waitForReady(id, server, token) {
    const until = Date.now() + 60000
    while (Date.now() < until && this.active.get(id) === server && server.status === 'Starting') {
      try {
        const response = await fetch('http://127.0.0.1:' + server.port + '/health', {
          signal: AbortSignal.timeout(1000), redirect: 'error'
        })
        const health = response.ok && await response.json()
        if (health.instance === token && this.active.get(id) === server && server.status === 'Starting') {
          server.status = 'Running'
          this.notify()
          return
        }
      } catch { /* The server may still be loading its database or plugins. */ }
      await delay(200)
    }
    throw new Error('Timed out waiting for Tournamenter. Check the server logs and port.')
  }
  stop(id) {
    const server = this.active.get(id)
    if (!server) return
    if (server.status === 'Stopping') return server.done
    server.status = 'Stopping'
    try {
      server.child.postMessage('shutdown')
      server.forceStop = setTimeout(() => server.child.kill(), 8000)
      server.forceStop.unref()
    } catch {
      server.child.kill()
    }
    this.notify()
    return server.done
  }
  async stopAll() {
    await Promise.all([...this.active.keys()].map(id => this.stop(id)))
  }
}

module.exports = { Servers }
