'use strict';
var TAG = _TAG('TournamenterModules');
//
// Manages (extra) extensions for Tournamenter
//
// It can:
//  + list currently installed extensions
//  + install extension (from: URL, or NPM name)
//    (Install it's dependencies)
//  + remove extension
//    (And it's installed dependencies)
//
const fs = require('fs');
const path = require('path');
const fork = require('child_process').fork;
const readline = require('readline');

const emit = app.helpers.emit;

//
// Initialize module
//
exports.init = function () {
  var ipc = electron.ipcMain
  var extensionsFolder = exports.getInstallPath();

  try {
    // Create extensions folder
    fs.mkdirSync(extensionsFolder);
    console.log(TAG, chalk.cyan('Initialize extensions folder'));
  }catch (e){
    console.log(TAG, chalk.gray('Extensions folder already created'));
  }

  // Link IPC to actions

  // Pipe Settings to IPC
  ipc.on('ExtensionManager:list', function (event) {
    event.returnValue = exports.list();
  })

  ipc.on('ExtensionManager:get', function (event, id) {
    event.returnValue = exports.get(id);
  })

  ipc.on('ExtensionManager:install', function (event, id) {
    event.returnValue = !!exports.install(id);
  })

  ipc.on('ExtensionManager:remove', function (event, id) {
    event.returnValue = !!exports.remove(id);
  })

  ipc.on('ExtensionManager:executing', function (event, id) {
    event.returnValue = exports.isExecuting();
  })
}


//
// Ge the installation where all extensions are
//
exports.getInstallPath = function () {
  return path.join(electron.app.getPath('userData'), 'extensions');
}

//
// Given a list of extension names, returns a list of paths to the extensions
//
exports.getExtensionsPaths = function (extensions) {
  // Filter extensions
  if(!_.isArray(extensions))
    extensions = [];

  let paths = [];
  extensions.forEach(ext => {
    ext = exports.get(ext);

    // Skip if didn't found extension
    if(!ext) return;

    // Add to the paths list
    paths.push(ext.path);
  })

  return paths;
}

//
// List packages with it's `package.js` information
//
exports._cachedExtensions = null
exports.list = function () {
  const installPath = path.join(exports.getInstallPath(), 'node_modules');

  // Return cached extensions if already saved
  if(exports._cachedExtensions != null)
    return exports._cachedExtensions;

  // Read all files from that path and load into modules
  let folders;
  try{
    folders = fs.readdirSync(installPath).filter((file) => {
      if(file.startsWith('.'))
        return false;

      if(fs.statSync(path.join(installPath, file)).isDirectory())
        return true;

      return false;
    });
  }catch(e){
    // node_modules does not exists yet?
    return [];
  }

  // Check if folders contains a package.json
  let extensions = folders.map((folder) => {
    // Read file and parse json
    try{
      let folderPath = path.join(installPath, folder);
      let filePath = path.join(folderPath, 'package.json');
      var json = fs.readFileSync(filePath).toString();
      json = JSON.parse(json);

      // Include folderPath in object (saves the folder location)
      json.path = folderPath;
    }catch(e){
      return null;
    }
    return json;
  })

  // Filter out dependencies that are not installed by the USER
  // Read: https://github.com/Microsoft/nodejstools/issues/603
  extensions = extensions.filter((extension) => {
    // Filter out json parsing errors from previous step
    if(extension === null)
      return false;

    // No _requiredBy. Set as a true root dependency
    if(!('_requiredBy' in extension))
      return true;

      // It's a root dependency (installed by `npm install <dep>`)
    if(extension._requiredBy.indexOf('#USER') >= 0)
      return true;

    // By default, it's a dependency's dependency
    return false;
  })

  // Select only important keys in each extension
  extensions = extensions.map((extension) => {
    return _.pick(extension, [
      'path',

      'name',
      'author',
      'gitHead',
      'version',
      'description',

      '_resolved',
    ])
  })

  // Save cache
  exports._cachedExtensions = extensions;

  return extensions;
}

//
// Get an extension (by it's id)
//
exports.get = function (extension) {
  let extensions = exports.list();

  let ext = extensions.find((ext) => {
    if(ext.name == extension)
      return ext;
  }) || null;

  return ext;
}

//
// Flag indicating that a instalation is already in progress
//
exports._isExecuting = false;
exports.isExecuting = function () {
  return exports._isExecuting;
}
exports.setExecuting = function (state) {
  exports._isExecuting = !!state;

  // Notify listeners
  emit('ExtensionManager:executing', exports._isExecuting);
}


//
// Install an extension
//
exports.install = function (extension, cb) {
  console.log(TAG, chalk.green(`Installing ${extension}...`));
  emit('ExtensionManager:log', 'server', `Installing ${extension}`);

  var proc = exports.runNpm([
    'install', extension,
    '--no-progress',
  ], cb);

  if(!proc)
    return;

  // Bind stdout and stderr read events and pipes to ipc
  app.helpers.bindProcessLogsToIPC(proc, 'ExtensionManager', {
    error: /ERR!/g,
  });
}


//
// Removes a extension
//
exports.remove = function (extension, cb){
  console.log(TAG, chalk.green(`Removing ${extension}...`));
  emit('ExtensionManager:log', 'server', `Removing ${extension}`);

  var proc = exports.runNpm([
    'remove', extension,
    '--no-progress',
  ], cb);

  if(!proc)
    return;

  // Bind stdout and stderr read events and pipes to ipc
  app.helpers.bindProcessLogsToIPC(proc, 'ExtensionManager', {
    error: /ERR!/g,
  });
}


//
// Low level call for NPM
//
exports.runNpm = function (params, cb){
  const npmMain = require.resolve('npm');
  const npmRoot = npmMain.split('lib')[0];
  const npmCli = path.join(npmRoot, 'bin/npm-cli.js');
  const installPath = exports.getInstallPath();
  const regError = /npm ERR!/g;
  const regExit = /npm verb exit\s+\[\s*(\d+)\,\s*true\s*\]/gi;

  var parsedCode = null;

  // Inject --prefix instalation path into params
  params.push('--prefix', installPath, '--verbose', '--_exit', 'true');

  // Check if it's already installing something
  if(exports.isExecuting()){
    // Callback with error
    cb && cb('Cannot run npm command before finishing previous one');

    // Return null
    return null;
  }

  // Set installing flag to `true`
  console.log(TAG, chalk.green(`npm run ${params[0]} ${params[1]}...`));
  exports.setExecuting(true);

  // Stores errors came from stdout
  let errors = [];

  var proc = fork(npmCli, params, {
    silent: true,
    detached: true,
    stdio: [ 'ignore', 'ignore', 'ignore', 'ignore'],
  });

  // Wait process to exit
  proc.on('exit', (code, signal) => {
    code = parsedCode !== null ? parsedCode : code;
    let failed = (code != 0);

    // Release cache
    exports._cachedExtensions = null;

    // Lower flag of installing
    exports.setExecuting(false);
    console.log(TAG, chalk.green(`npm run ${params[0]} ${params[1]}... finish: ${code}`));
    emit('ExtensionManager:log', 'server', `Install finished. Code ${code}`);

    // Callback with error
    cb && cb(failed ? errors && errors.join('\r\n') : null);
  })

  // Pipe error interface to electron's IPC
  // Join error messages that matches pattern (for possible error throw)
  readline.createInterface({
    input: proc.stderr, terminal: false
  }).on('line', function(line) {
    // Push to errors if matches NPM error log output
    if(regError.test(line))
      errors.push(line);

    // Check if it's the end of script
    let matches = regExit.exec(line)
    if(matches){
      parsedCode = parseInt(matches[1]);
      proc.kill();
    }
  });

  return proc;
}
