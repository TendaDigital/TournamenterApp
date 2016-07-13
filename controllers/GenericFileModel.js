'use strict';
var TAG = _TAG('GenericFileModel');
//
// This Controller works like a simple DB of Files.
// + list(type)
//    will list json files within the directory.
//
// + get(type, id)
//    will load the json file and return it
//
// + save(type, id, json)
//    will save the json within the type dir with id as name
//
// + remove(type, id)
//    will remove the file within dir with id as name
//
var fs = require('fs');
var path = require('path');

var Settings = require('./Settings');
var dirName = app.config.fileModelsDir;

exports.init = function (){
  var fileModels = path.join(electron.app.getPath('userData'), dirName)
  var ipc = electron.ipcMain

  // Create the FileModels directory
  try {
    fs.mkdirSync(fileModels)
  }catch (e){}

  // Initialize collections
  exports.createCollection('servers');

  // Pipe Settings to IPC
  ipc.on('GenericFileModel:list', function (event, type) {
    event.returnValue = exports.list(type);
  })

  ipc.on('GenericFileModel:get', function (event, type, id) {
    event.returnValue = exports.get(type, id);
  })

  ipc.on('GenericFileModel:getPath', function (event, type, id) {
    event.returnValue = exports.getPath(type, id);
  })

  ipc.on('GenericFileModel:save', function (event, type, id, data) {
    event.returnValue = exports.save(type, id, data);
  })

  ipc.on('GenericFileModel:remove', function (event, type, id) {
    event.returnValue = exports.remove(type, id);
  })
}

// Emits to electron ipc
exports.emit = function (type, id){
  // Emits the event to the target main window
  var _window = app.controllers.MainWindow.getWindow();
  _window && _window.webContents.send('GenericFileModel:update:'+type, id);
}

// Creates a new collection (creates the collection folder)
exports.createCollection = function (type) {
  var modelsFolder = path.join(electron.app.getPath('userData'), dirName, type)

  try {
    fs.mkdirSync(modelsFolder);
    console.log(TAG, chalk.cyan('createCollection'), chalk.red(type));
  }catch (e){}
}

// List file names (id's)
exports.list = function (type){
  console.log(TAG, chalk.cyan('list'), chalk.red(type));

  var dir = path.join(electron.app.getPath('userData'), dirName, type)

  var ids = [];
  fs.readdirSync(dir).forEach( (file) => {
		if (file.indexOf('.json') < 0)
			return;

		ids.push(path.basename(file, '.json'));
	});

  return ids;
}

// Get the object by id
exports.get = function (type, id) {
  console.log(TAG, chalk.cyan('get'), chalk.red(type), chalk.red(id))

  var dir = path.join(electron.app.getPath('userData'), dirName, type)
  var file = path.join(dir, id + '.json')

  // Check if file exists
  try{
    fs.statSync(file)
  }catch (e){
    // File doesn't exists. Return null
    return null
  }

  // Load Settings in Text
  var data = fs.readFileSync(file);

  try {
    return JSON.parse(data);
  } catch (err) {
    console.error(TAG, 'Invalid file', err);
  }

  return null;
}

// Get the object by id
exports.getPath = function (type, id) {
  console.log(TAG, chalk.cyan('getPath'), chalk.red(type), chalk.red(id))

  var dir = path.join(electron.app.getPath('userData'), dirName, type)
  var file = path.join(dir, id + '.json')

  // Check if file exists
  try{
    fs.statSync(file)
  }catch (e){
    // File doesn't exists. Return null
    return null
  }

  return file;
}

// Save object as file with id in type's folder
exports.save = function (type, id, json) {
  console.log(TAG, chalk.cyan('save'), chalk.red(type), chalk.red(id))

  var dir = path.join(electron.app.getPath('userData'), dirName, type)
  var file = path.join(dir, id + '.json')

  var data = JSON.stringify(json || {})

  // Save File
  fs.writeFileSync(file, data);

  // Notify ipc
  exports.emit(type, id);
  return json;
}

// Remove an object
exports.remove = function (type, id) {
  console.log(TAG, chalk.cyan('remove'), chalk.red(type), chalk.red(id))

  var dir = path.join(electron.app.getPath('userData'), dirName, type)
  var file = path.join(dir, id + '.json')

  try{
    fs.unlinkSync(file);
  }catch (e){
    // Prevent emiting. Didn't delete (doesn't exists)
    return false;
  }

  // Notify ipc
  exports.emit(type, id);
  return id;
}
