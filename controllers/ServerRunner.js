'use strict';
var TAG = _TAG('ServerRunner');

var path = require('path');
var forever = require('forever-monitor');

// Single Callback for global state change
exports.onStateChange = null;

// Current running instances of Tournamenter
exports._instances = {};

// Initialize deamon configurations
exports.init = function (){
  var ipc = electron.ipcMain

  // Pipe Settings to IPC
  ipc.on('ServerRunner:start', function (event, id) {
    exports.start(id);
  })

  ipc.on('ServerRunner:stop', function (event, id) {
    exports.stop(id)
  })

  ipc.on('ServerRunner:state', function (event, id) {
    event.returnValue = exports.state(id);
  })

  // Binds beforeExit to process in order to stop all running instances
  eApp.on('before-quit', () => {
    // Kills all processes
    for(var k in exports._instances){
      let instance = exports._instances[k];
      if(!instance || !instance.running)
        continue;

      console.log(TAG, chalk.red(`Killing ${k}`));
      instance.kill(true);
    }
  })

  // Initialize collections
  app.controllers.GenericFileModel.createCollection('servers', {

    // Called on save, to apply defaults
    beforeSave: function (id, data) {
      data = data || {}

      // Defalts on process options
      data = _.defaults(data, {
        minUptime: 2000,
        spinSleepTime: 2000,
        extensions: {},
      })

      // Defaults on Environment vars
      data.env = _.defaults(data.env, {
        APP_NAME: id,
        APP_LOGO: '',
        PASSWORD: '',
        DB_FOLDER: path.join(eApp.getPath('userData'), id + '.db'),
        // TODO: Improve default port selection
        PORT: 3000 + Math.round(Math.random(1000)),
      })
      console.log('new data', data)

      return data
    }
  });
}

// Starts a server
exports.start = function (serverId, cb) {
  const ExtensionManager = app.controllers.ExtensionManager;

  var isStarted = serverId in exports._instances && exports._instances[serverId];

  if(isStarted)
    return console.log(TAG, `Server ${serverId} already stared. Skipping`);

  console.log(TAG, `Starting new server: ${serverId}`);

  // Load instance configurations from files db
  let optsDb = app.controllers.GenericFileModel.get('servers', serverId) || {};

  // Find out tournamenter location
  let electronCmd = path.join(__dirname, '../node_modules/.bin/electron');
  let tournamenterModule = require.resolve('tournamenter');
  let tournamenterScript = path.basename(tournamenterModule);
  let tournamenterDir = path.dirname(tournamenterModule);

  // Emit a debug log
  exports.emitLog(serverId, 'server', `Starting new server: ${serverId}`);

  // Gatter extensions used and join paths with `:`
  let extensions = optsDb.extensions || {}
  extensions = _.pickBy(extensions, v => v)
  extensions = _.keys(extensions)

  // Log it
  if(extensions.length > 0)
    exports.emitLog(serverId, 'server', `Use: ${extensions.join(',')}`);

  extensions = ExtensionManager.getExtensionsPaths(extensions);
  extensions = extensions.join(':');

  // Prepare instance options
  let opts = {
    max: 0,
    uid: serverId,
    silent: true,
    killTree: true,
    // command: 'node',
    // fork: true,
    // cwd: path.join(__dirname, '../'),

    minUptime: optsDb.minUptime || 2000,
    spinSleepTime: optsDb.spinSleepTime || 2000,

    env: _.defaults(optsDb.env, {
      APP_NAME: 'Tournamenter',
      APP_UID: serverId,
      TMP_PATH: path.join(eApp.getPath('temp'), 'tournamenter_' + serverId),
      ELECTRON_RUN_AS_NODE: 1,
      TOURNAMENTER_EXTENSIONS: extensions,
    }),
  };

  // Launch server
  let child = new (forever.Monitor)(tournamenterModule, opts);

  // Save spawned process to instances array
  exports._instances[serverId] = child;

  // Bind events
  exports._bindEvents(serverId, child);

  // Binds cb event if needed
  cb && child.on('start', cb);

  // Start server
  child.start();

  // Emit general update
  exports.emitUpdate(serverId);
}


// Stops a server
exports.stop = function (serverId) {
  if(serverId in exports._instances){
    // Emit a debug log
    exports.emitLog(serverId, 'server', `Killing server: ${serverId}`);

    exports._instances[serverId].kill(true);
  }
}


// Gets a list of states for the servers
exports.states = function (){
  let states = {};

  for(let k in exports._instances)
    states[k] = exports._instances[k].running;

  return states;
}


// Gets the state of a server or for all of them if not specified
exports.state = function (serverId) {
  if(!serverId)
    return exports.states();

  if(!(serverId in exports._instances))
    return null;

  return exports._instances[serverId].running;
}


// Bind events to the process (links state and emits events)
exports._bindEvents = function (serverId, child) {
  // child.STATE = null;

  child.on('start', () => {
    // child.STATE = 'START';
    exports.emitUpdate(serverId);
  })

  child.on('stop', () => {
    // child.STATE = 'STOP';
    exports.emitUpdate(serverId);
  })

  child.on('restart', () => {
    // child.STATE = 'START';
    exports.emitUpdate(serverId);
  })

  child.on('exit', () => {
    // child.STATE = null;
    // Destroy instance
    delete exports._instances[serverId];

    // Emits the destroyed instance
    exports.emitUpdate(serverId);
  })

  // Logs handling
  child.on('stdout', (message) => {
    exports.emitLog(serverId, 'debug', message);
  });

  child.on('stderr', (message) => {
    exports.emitLog(serverId, 'error', message);
  });
}


// Notifies changes in UI (about changes to an server STATE)
exports.emitUpdate = function (serverId) {
  // Emits the event to the target main window
  let state = exports.state(serverId);
  let _window = app.controllers.MainWindow.getWindow();
  _window && _window.webContents.send('ServerRunner:update:'+serverId, state);

  console.log(TAG, `${chalk.cyan(serverId)} -> ${chalk.green(state)}`);
  exports.emitUpdates();
}


// Notifies about new console messages
exports.emitLog = function (serverId, type, message) {
  let _window = app.controllers.MainWindow.getWindow();
  _window && _window.webContents.send('ServerRunner:log:'+serverId, type, message.toString());
}


// Emit the states of the servers
exports.emitUpdates = function (){
  let _window = app.controllers.MainWindow.getWindow();
  let states = exports.states()
  _window && _window.webContents.send('ServerRunner:update', states);

  // Notify application
  exports.onStateChange && exports.onStateChange(states);
}
