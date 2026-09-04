'use strict';
var TAG = _TAG('config.electron');

// Wait electron to be ready
var start = function (app, next){
  // Wait Electron initialization
  eApp.on('ready', function (a, b){
    try {
      require('@electron/remote/main').initialize();
    } catch (e) {
      console.log(TAG, 'remote main init error or optional:', e.message);
    }
    next && next()
  })
}

module.exports = start
