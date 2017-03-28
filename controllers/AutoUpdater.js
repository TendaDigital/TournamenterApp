const TAG = _TAG('AutoUpdater');

const { autoUpdater, BrowserWindow } = require('electron');
const os = require('os');

const UPDATE_SERVER_HOST = 'tournamenter.herokuapp.com';
const UPDATABLE_PLATFORMS = ['darwin', 'win32'];
const DELAY_BEFORE_CHECKING = 10000;

const VERSION = eApp.getVersion()
const FEED_URL = `http://${UPDATE_SERVER_HOST}/update/${os.platform()}_${os.arch()}/${VERSION}`

exports.init = function init(window) {

  if(app.helpers.isDev()) {
    console.log(TAG, chalk.dim('Dev Mode. Skip autoDownload'));
    return;
  }

  var supportUpdates = (UPDATABLE_PLATFORMS.indexOf(os.platform()) > -1)
  if(!supportUpdates) {
    console.log(TAG, chalk.dim('Platform does  AutoUpdater. running on ' + os.platform()));

    // Manual Check if update is available
    setTimeout(exports.manualCheckUpdate, DELAY_BEFORE_CHECKING)
    return;
  }

  autoUpdater.addListener('update-available', (event) => {
    console.log(TAG, chalk.green('A new update is available'));
    app.controllers.MainWindow.notify('Updater', 'New Update available. Downloading...', 8000);
  })

  autoUpdater.addListener('update-downloaded', (event, releaseNotes, releaseName, releaseDate, updateURL) => {
    app.controllers.MainWindow.notify(
      'Updater Ready',
      `Version ${releaseName} is downloaded and will be automatically installed on Quit`,
      'OK'
    );
  })

  autoUpdater.addListener('error', (error) => {
    console.error(TAG, error)
    app.controllers.MainWindow.notify('Update Error', 'Failed to download Update: ' + error, 'OK');
  })

  autoUpdater.addListener('checking-for-update', (event) => {
    console.log(TAG, 'checking-for-update')
    app.controllers.MainWindow.notify('Updater', 'Checking for updates...');
  })

  autoUpdater.addListener('update-not-available', () => {
    console.log(TAG, 'update-not-available')
    app.controllers.MainWindow.notify('Updater', 'Tournamenter is up to date! Swweeeeeeet');
  })

  autoUpdater.setFeedURL(FEED_URL)

  setTimeout(() => {
    autoUpdater.checkForUpdates();
  }, DELAY_BEFORE_CHECKING);
}

exports.manualCheckUpdate = function () {
  app.helpers.CheckUpdate(FEED_URL, function (err, update) {
    if (err) {
      console.error(TAG, err)
      app.controllers.MainWindow.notify('Update Error', 'Failed to check for updates');
      return
    }

    if (!update) {
      app.controllers.MainWindow.notify('Updater', 'Tournamenter is up to date! Swweeeeeeet');
      return
    }

    // Update is available. Notify window
    app.controllers.MainWindow.notify(
      'Updater Available',
      `Version ${update.version} is available for download.`,
      'OK'
    );

    app.controllers.MainWindow.send('newUpdate', update);
  })
}
