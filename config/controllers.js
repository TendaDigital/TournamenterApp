'use strict';
var TAG = _TAG('config.controllers');

function config(app, next){
	var controllersDirectory = __dirname + '/..' + '/controllers/';

  // Load All controllers
  app.controllers = {};
	app.helpers.loader.load(controllersDirectory, app.controllers);

  // Debug loaded controllers
	console.log(TAG, 'Loaded Controllers:', _.keys(app.controllers).join(','));

	next();
}

module.exports = config;
