'use strict';
var TAG = _TAG('MainWindow');

const BrowserWindow = electron.BrowserWindow

let mainWindow = null

exports.getWindow = function (){
  return mainWindow;
}

exports.launch = function (){
  // Skip re-opening window on re-launch
  if(mainWindow)
    return

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: app.config.icon,
  })

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/../public/index.html`)

  // Open the DevTools.
  if(app.helpers.isDev())
    mainWindow.webContents.openDevTools({detached: true})

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    mainWindow = null
    console.log(TAG, chalk.red('Closed mainWindow'))
  })

  console.log(TAG, chalk.cyan('Launching mainWindow'))
}

exports.notify = function notify(title, message, stick) {
  if (!mainWindow) {
    return;
  }

  mainWindow.webContents.send('notify', title, message, stick);
}
