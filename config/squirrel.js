const path = require('path');
const spawn = require('child_process').spawn;

function run(args, done){
  const updateExe = path.resolve(path.dirname(process.execPath), '..', 'Update.exe')

  console.log(`Spawning ${updateExe} with args ${args}`, updateExe, args)

  spawn(updateExe, args, {
    detached: true
  }).on('close', done)
}

module.exports = function handleStartupEvent(){
  if (process.platform !== 'win32') {
    return false
  }

  const cmd = process.argv[1]

  console.log(`Processing squirrel command ${cmd}`, cmd)

  const target = path.basename(process.execPath)
  if (cmd === '--squirrel-install' || cmd === '--squirrel-updated') {
    run(['--createShortcut=' + target + ''], eApp.quit);
    return true;
  } else if (cmd === '--squirrel-uninstall') {
    run(['--removeShortcut=' + target + ''], eApp.quit);
    return true;
  } else if (cmd === '--squirrel-obsolete') {
    eApp.quit()
    return true;
  } else {
    return false;
  }
}
