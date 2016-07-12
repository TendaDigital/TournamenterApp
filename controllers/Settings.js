'use strict';
var TAG = _TAG('Settings')

const fs = require('fs');
const EventEmitter = require('events');

var _settings = {};

var Settings = exports;

// Set Default values in settings
Settings.setDefaults = function () {
  // TODO
}

// Initialize Settings by loading it, then piping and connecting to Electron IPC
Settings.init = function (){
  // Load settings
  app.controllers.Settings.load();

  // Set Defaults
  Settings.setDefaults();

  // Get IPC
  var ipc = require('electron').ipcMain;

  // Pipe Settings to IPC
  app.controllers.Settings.subscribe(() => {
    // Get main window to emit even
    var _window = app.controllers.MainWindow.getWindow();
    _window && _window.webContents.send('Settings:updated', _settings)
  });

  // Listen for Settings requests
  ipc.on('Settings:set', (event, key, value) => {
    event.returnValue = Settings.set(key, value);
  })

  ipc.on('Settings:get', (event, key) => {
    event.returnValue = Settings.get(key);
  })
}

// Event emitter
Settings.eventEmitter = new EventEmitter();

// Expose subscribe method publicly
Settings.subscribe = function (next){
  Settings.eventEmitter.on('Settings:updated', next);
}

// Persists _settings to file
Settings.save = function () {
  var data = JSON.stringify(_settings);
  var status = fs.writeFileSync(app.config.settings_file, data);
  console.log(TAG, chalk.green('Saved settings file'))
  return status;
}

// Prevent saving repeatedly, and only saves after a period of time
Settings.saveThrottled = _.throttle(Settings.save, 2000, {}, false, true);

// Load settings from file
Settings.load = function (avoidCheck) {
  // Check if settings file exists
  try{
    fs.statSync(app.config.settings_file);
  }catch (e){
    // Override settings and saves it
    console.log(TAG, chalk.cyan('Settings file not found. Creating...'))
    _settings = {};
    Settings.save();
  }

  // Load Settings in Text
  var data = fs.readFileSync(app.config.settings_file);

  try {
    data = JSON.parse(data);
  } catch (err) {
    console.error(TAG, chalk.red('Failed to load settings. Reseting JSON'))

    _settings = data = {};
    Settings.save();
  }

  // Update data
  Settings._update(data);
}

// Sets values without notifying
Settings._update = function (object) {
  for(var k in object){
    if(_settings[k] == object[k])
      continue;

    // Update and notify
    _settings[k] = object[k];
  }

  // Remove inexistent keys
  for(var k in _settings){
    if(k in object)
      continue;

    delete object[k];
  }
  // Notify update (even when none ocurred)
  Settings.eventEmitter.emit('Settings:updated', _settings);
}

// Sets a single value into key
Settings.set = function (key, value){
  console.log(TAG, chalk.cyan('Set'), chalk.yellow(key), 'to', value)

  // Skip updating if didn't change
  if(_settings[key] == value)
    return;

  // Save to local data
  _settings[key] = value;
  Settings.eventEmitter.emit('Settings:updated', _settings);

  // Persists to file
  Settings.saveThrottled();
}

// Gets the entire settings, or, a single key
Settings.get = function (key){
  // Return entire settings object if no key passed
  if(!key)
    return _settings;

  // Return specific key
  if(key in _settings)
    return _settings[key]

  return null;
}
