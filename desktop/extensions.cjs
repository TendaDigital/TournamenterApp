const fs = require('node:fs')
const path = require('node:path')
const { spawn } = require('node:child_process')

const namePattern = /^(?:@[a-z0-9_.-]+\/)?[a-z0-9][a-z0-9_.-]*$/i
const registrySpec = /^(?:@[a-z0-9_.-]+\/)?[a-z0-9][a-z0-9_.-]*(?:@[a-z0-9~^.*+-]+)?$/i
const githubSpec = /^https:\/\/github\.com\/[a-z0-9_.-]+\/[a-z0-9_.-]+(?:#[a-z0-9_.\/-]+)?$/i

function readPackage(folder) {
  return JSON.parse(fs.readFileSync(path.join(folder, 'package.json'), 'utf8'))
}

class Extensions {
  constructor(userData, runtime, notify) {
    this.root = path.join(userData, 'extensions')
    this.runtime = runtime
    this.notify = notify
    this.logs = []
    this.busy = false
    fs.mkdirSync(this.root, { recursive: true })
  }
  list() {
    const bundled = path.join(this.runtime, 'obr')
    const byName = new Map()
    const add = (folder, fixed = false) => {
      const pkg = readPackage(folder)
      if (!namePattern.test(pkg.name) || byName.has(pkg.name)) return
      byName.set(pkg.name, { name: pkg.name, version: pkg.version, description: pkg.description,
        author: typeof pkg.author === 'string' ? pkg.author : pkg.author?.name, folder, fixed })
    }
    add(bundled, true)
    const modules = path.join(this.root, 'node_modules')
    const candidates = fs.existsSync(modules) ? fs.readdirSync(modules).filter(name => !name.startsWith('.')) : []
    const manifest = fs.existsSync(path.join(this.root, 'package.json')) ? readPackage(this.root) : {}
    const explicit = new Set(Object.keys(manifest.dependencies ?? {}))
    for (const candidate of candidates) {
      const names = candidate.startsWith('@') ?
        fs.readdirSync(path.join(modules, candidate)).map(name => candidate + '/' + name) : [candidate]
      for (const name of names) {
        const folder = path.join(modules, name)
        if (!fs.existsSync(path.join(folder, 'package.json'))) continue
        const pkg = readPackage(folder)
        // npm 3 installations can lack a root manifest. Keep their directly installed packages.
        if (explicit.has(name) || (!Object.hasOwn(manifest, 'dependencies') &&
            (!pkg._requiredBy || pkg._requiredBy.includes('#USER')))) add(folder)
      }
    }
    return [...byName.values()]
  }
  paths(enabled) {
    const available = new Map(this.list().map(ext => [ext.name, ext.folder]))
    return Object.entries(enabled).filter(([, on]) => on).map(([name]) => {
      if (!available.has(name)) throw new Error('Missing extension: ' + name)
      return available.get(name)
    })
  }
  async run(action, spec) {
    const remove = action === 'uninstall'
    if (this.busy) throw new Error('An extension command is already running.')
    if (remove ? !this.list().some(ext => ext.name === spec && !ext.fixed) :
        !(registrySpec.test(spec) || githubSpec.test(spec))) throw new Error('Enter an npm package name or GitHub URL.')
    if (spec === 'tournamenter-obr' || spec.startsWith('tournamenter-obr@')) throw new Error('OBR is included with Tournamenter.')
    if (!fs.existsSync(path.join(this.root, 'package.json'))) {
      const dependencies = Object.fromEntries(this.list().filter(ext => !ext.fixed).map(ext => [ext.name, ext.version]))
      fs.writeFileSync(path.join(this.root, 'package.json'), JSON.stringify({ private: true, dependencies }), { flag: 'wx' })
    }
    this.busy = true
    this.logs = []
    this.notify()
    try {
      const cli = path.join(this.runtime, 'npm', 'bin', 'npm-cli.js')
      await new Promise((resolve, reject) => {
        const proc = spawn(process.execPath, [cli, remove ? 'uninstall' : 'install',
          '--no-audit', '--no-fund', '--ignore-scripts', '--', spec], {
          cwd: this.root, env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
          windowsHide: true, stdio: ['ignore', 'pipe', 'pipe']
        })
        this.child = proc
        const append = chunk => {
          this.logs = [...this.logs, String(chunk).trimEnd().slice(-8192)].slice(-200)
          this.notify()
        }
        proc.stdout.on('data', append)
        proc.stderr.on('data', append)
        proc.on('error', reject)
        proc.on('close', code => code === 0 ? resolve() : reject(new Error('Extension command failed. See Logs.')))
      })
    } finally {
      this.child = null
      this.busy = false
      this.notify()
    }
  }
}

module.exports = { Extensions }
