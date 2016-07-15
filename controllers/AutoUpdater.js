const TAG = _TAG('AutoUpdater');

const { autoUpdater, BrowserWindow } = require('electron');
const os = require('os');

const UPDATE_SERVER_HOST = 'tournamenter.herokuapp.com';

exports.init = function init(window) {
  if(app.helpers.isDev()) {
    console.log(TAG, chalk.gray('Dev Mode. Skip autoupdate'));
    return
  }

  if(os.platform() !== 'darwin' && os.platform() !== 'win32') {
    console.log(TAG, chalk.gray('Skip AutoUpdater. running on ' + os.platform()));
    return;
  }

  const version = eApp.getVersion()
  autoUpdater.addListener('update-available', (event) => {
    console.log(TAG, chalk.green('A new update is available'));
  })

  autoUpdater.addListener('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateURL) => {
    app.controllers.MainWindow.notify(
      'A new update is ready to install',
      `Version ${releaseName} is downloaded and will be automatically installed on Quit`
    );
  })

  autoUpdater.addListener('error', (error) => {
    console.error(TAG, error)
  })

  autoUpdater.addListener('checking-for-update', (event) => {
    console.log(TAG, 'checking-for-update')
  })

  autoUpdater.addListener('update-not-available', () => {
    console.log(TAG, 'update-not-available')
  })

  autoUpdater.setFeedURL(`http://${UPDATE_SERVER_HOST}/update/${os.platform()}_${os.arch()}/${version}`)

  window.webContents.once('did-frame-finish-load', (event) => {
    autoUpdater.checkForUpdates()
  })
}
