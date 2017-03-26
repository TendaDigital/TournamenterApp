const TAG = _TAG('AutoUpdater');

const { autoUpdater, BrowserWindow } = require('electron');
const os = require('os');

const UPDATE_SERVER_HOST = 'tournamenter.herokuapp.com';

exports.init = function init(window) {
  if(app.helpers.isDev()) {
    console.log(TAG, chalk.gray('Dev Mode. Skip autoupdate'));
    return
  }

  if(os.platform() !== 'win32') {
    console.log(TAG, chalk.gray('Skip AutoUpdater. running on ' + os.platform()));
    return;
  }

  const version = eApp.getVersion()
  autoUpdater.addListener('update-available', (event) => {
    console.log(TAG, chalk.green('A new update is available'));
    app.controllers.MainWindow.notify('', 'New Update available. Downloading...', 8000);
  })

  autoUpdater.addListener('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateURL) => {
    app.controllers.MainWindow.notify(
      'A new update is ready to install',
      `Version ${releaseName} is downloaded and will be automatically installed on Quit`,
      'OK'
    );
  })

  autoUpdater.addListener('error', (error) => {
    console.error(TAG, error)
  })

  autoUpdater.addListener('checking-for-update', (event) => {
    console.log(TAG, 'checking-for-update')
    app.controllers.MainWindow.notify('', 'Checking for updates...');
  })

  autoUpdater.addListener('update-not-available', () => {
    console.log(TAG, 'update-not-available')
  })

  autoUpdater.setFeedURL(`http://${UPDATE_SERVER_HOST}/update/${os.platform()}_${os.arch()}/${version}`)

  var win = app.controllers.MainWindow.getWindow();

  if(win){
    win.webContents.once('did-frame-finish-load', (event) => {
      autoUpdater.checkForUpdates()
    })
  }else{
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 6000);
  }
}
