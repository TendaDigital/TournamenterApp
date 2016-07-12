'use strict';
var TAG = _TAG('config.helpers');

var fs = require('fs');
var path = require('path');

// Load instantly, so that files can access helpers directly on root scope
var helpersDirectory = __dirname + '/..' + '/helpers/';

app.helpers = {};

// Load only the loader by default
var loader = require('../helpers/loader');

// Load all helpers (including the loader itself lol)
loader.load(helpersDirectory, app.helpers);

console.log(TAG, 'Installed Helpers:', _.keys(app.helpers).join(','));

module.exports = function config(app, next){
	next();
}
