const { app, BrowserWindow, dialog, ipcMain, shell, utilityProcess, Menu } = require('electron')
const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { Profiles } = require('./profiles.cjs')
const { Extensions } = require('./extensions.cjs')
const { Servers } = require('./servers.cjs')

const dashboard = path.join(__dirname, '..', 'public', 'index.html')
const dashboardUrl = pathToFileURL(dashboard).href
const runtime = app.isPackaged ? path.join(process.resourcesPath, 'runtime') : path.join(__dirname, '..', 'runtime-local')
const userData = app.getPath('userData')
let window, servers, extensions, profiles, timer, closing
if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => { if (window?.isMinimized()) window.restore(); window?.focus() })
  app.whenReady().then(initialize).catch(err => { dialog.showErrorBox('Tournamenter Manager', err.message); app.quit() })
}

function addresses() {
  return [...new Set(['127.0.0.1', ...Object.values(os.networkInterfaces()).flat()
    .filter(x => x?.family === 'IPv4' && !x.internal).map(x => x.address)])]
}
function notify() {
  if (timer) return
  timer = setTimeout(() => {
    timer = null
    window?.webContents.send('manager:change')
    app.setBadgeCount?.(servers.active.size)
  }, 100)
}
function openWindow() {
  if (window) { window.focus(); return }
  window = new BrowserWindow({ width: 850, height: 600, minWidth: 850, minHeight: 600,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true } })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (event, target) => { if (target !== dashboardUrl) event.preventDefault() })
  window.on('closed', () => { window = undefined })
  return window.loadFile(dashboard)
}
function stopped(id) {
  if (servers.active.has(id)) throw new Error('Stop the server before changing its settings.')
}
function initialize() {
  const core = JSON.parse(fs.readFileSync(path.join(runtime, 'core', 'package.json'), 'utf8'))
  profiles = new Profiles(userData)
  extensions = new Extensions(userData, runtime, notify)
  servers = new Servers(profiles, extensions, runtime, (...args) => utilityProcess.fork(...args), notify)
  const handlers = {
    snapshot: () => ({
      version: app.getVersion(), coreVersion: core.version, addresses: addresses(),
      extensions: extensions.list().map(({ folder, ...info }) => info),
      extensionLogs: extensions.logs, busy: extensions.busy,
      servers: profiles.list().map(id => ({ ...profiles.inspect(id), status: servers.status(id),
        logs: servers.logs.get(id) ?? [] }))
    }),
    create: id => { const created = profiles.create(id); notify(); return created },
    save: (id, edit) => { stopped(id); profiles.save(id, edit); notify() },
    remove: async id => {
      stopped(id)
      const { response } = await dialog.showMessageBox(window, { type: 'question', buttons: ['Cancel', 'Delete Server'],
        defaultId: 0, cancelId: 0, message: 'Delete server “' + id + '”?', detail: 'Tournament data stays in the database folder.' })
      if (response === 1) { stopped(id); profiles.remove(id); servers.logs.delete(id); notify() }
    },
    start: id => {
      if (closing) throw new Error('Tournamenter is shutting down.')
      if (extensions.busy) throw new Error('Wait for the extension command to finish.')
      return servers.start(id)
    },
    stop: id => servers.stop(id),
    open: (id, host) => {
      if (servers.status(id) !== 'Running' || !addresses().includes(host)) throw new Error('Server is unavailable.')
      return shell.openExternal('http://' + host + ':' + servers.active.get(id).port + '/')
    },
    select: async kind => {
      if (!['logo', 'database'].includes(kind)) throw new Error('Invalid selection.')
      const opts = kind === 'logo' ? { properties: ['openFile'], filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'svg'] }] }
        : { properties: ['openDirectory', 'createDirectory'] }
      const result = await dialog.showOpenDialog(window, opts)
      return result.filePaths[0] ?? null
    },
    extensions: (action, spec) => {
      if (!['install', 'uninstall'].includes(action) || typeof spec !== 'string') throw new Error('Invalid extension command.')
      if (servers.active.size) throw new Error('Stop the servers before modifying installed extensions.')
      return extensions.run(action, spec.trim())
    },
    developer: action => {
      if (action === 'tools') window.webContents.openDevTools({ mode: 'detach' })
      if (action === 'reload') window.reload()
      if (action === 'data') return shell.openPath(userData)
      if (action === 'extensions') return shell.openPath(extensions.root)
    },
    project: name => {
      const urls = { repo: 'https://github.com/TendaDigital/TournamenterApp',
        author: 'https://github.com/ivanseidel', releases: 'https://github.com/TendaDigital/TournamenterApp/releases' }
      if (Object.hasOwn(urls, name)) return shell.openExternal(urls[name])
    }
  }
  for (const [method, handle] of Object.entries(handlers)) {
    ipcMain.handle('manager:' + method, (event, ...args) => {
      if (event.sender !== window?.webContents || event.senderFrame !== window.webContents.mainFrame ||
          event.senderFrame.url !== dashboardUrl) throw new Error('Unknown window.')
      return handle(...args)
    })
  }
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []), { role: 'editMenu' }
  ]))
  app.on('activate', openWindow)
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit() })
  app.on('before-quit', event => {
    extensions.child?.kill()
    if (!servers.active.size) return
    event.preventDefault()
    if (closing) return
    closing = true
    servers.stopAll().finally(() => app.quit())
  })
  return openWindow()
}
