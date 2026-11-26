const { contextBridge, ipcRenderer } = require('electron')

const methods = ['snapshot', 'create', 'save', 'remove', 'start', 'stop', 'open', 'select',
  'extensions', 'developer', 'project']
const api = Object.fromEntries(methods.map(name => [name, (...args) => ipcRenderer.invoke('manager:' + name, ...args)]))
api.subscribe = callback => {
  const listener = () => callback()
  ipcRenderer.on('manager:change', listener)
  return () => ipcRenderer.removeListener('manager:change', listener)
}
contextBridge.exposeInMainWorld('tournamenter', api)
