const fs = require('node:fs')
const path = require('node:path')
const { randomUUID } = require('node:crypto')

function profileId(value) {
  if (typeof value !== 'string' || !value.trim() || value.length > 150 ||
      /[<>:"/\\|?*\x00-\x1f]/u.test(value) || /[. ]$/.test(value) ||
      /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(value)) {
    throw new Error('Enter a valid server identifier.')
  }
  return value
}

function portNumber(value) {
  const port = Number(value)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Enter a port from 1 to 65535.')
  return port
}

class Profiles {
  constructor(userData) {
    this.userData = userData
    this.directory = path.join(userData, 'FileModels', 'servers')
    fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 })
  }
  filename(id) {
    return path.join(this.directory, profileId(id) + '.json')
  }
  list() {
    return fs.readdirSync(this.directory, { withFileTypes: true })
      .filter(file => file.isFile() && file.name.endsWith('.json'))
      .map(file => file.name.slice(0, -5)).sort()
  }
  get(id) {
    const data = JSON.parse(fs.readFileSync(this.filename(id), 'utf8'))
    return { ...data, env: { APP_NAME: id, APP_LOGO: '', PASSWORD: '',
      DB_FOLDER: path.join(this.userData, id + '.db'), PORT: 3000, ...data.env },
      extensions: data.extensions ?? {} }
  }
  inspect(id) {
    try { return { id, config: this.get(id) } }
    catch (error) { return { id, error: error.message } }
  }
  create(rawId) {
    const id = profileId(String(rawId).trim().toLowerCase())
    const ids = this.list()
    if (ids.some(other => other.toLowerCase() === id)) throw new Error('A server already uses this identifier.')
    const used = new Set(ids.map(other => Number(this.inspect(other).config?.env.PORT)))
    let port = 3000
    while (used.has(port)) port++
    const data = { env: { APP_NAME: id, APP_LOGO: '', PASSWORD: '',
      DB_FOLDER: path.join(this.userData, id + '.db'), PORT: portNumber(port) },
      extensions: { 'tournamenter-obr': true } }
    fs.writeFileSync(this.filename(id), JSON.stringify(data), { flag: 'wx', mode: 0o600 })
    return id
  }
  save(id, edit) {
    const data = this.get(id)
    for (const key of ['APP_NAME', 'APP_LOGO', 'PASSWORD', 'DB_FOLDER']) {
      if (typeof edit.env?.[key] !== 'string') throw new Error('Invalid server settings.')
      data.env[key] = edit.env[key]
    }
    if (!path.isAbsolute(data.env.DB_FOLDER)) throw new Error('Choose an absolute database path.')
    data.env.PORT = portNumber(edit.env.PORT)
    data.extensions = Object.fromEntries(Object.entries(edit.extensions ?? {}).map(([name, on]) => [name, on === true]))
    const target = this.filename(id)
    const temp = target + '.' + randomUUID() + '.tmp'
    try {
      fs.writeFileSync(temp, JSON.stringify(data), { mode: 0o600, flag: 'wx' })
      fs.renameSync(temp, target)
    } finally { fs.rmSync(temp, { force: true }) }
  }
  remove(id) {
    fs.unlinkSync(this.filename(id))
  }
}

module.exports = { Profiles, portNumber }
