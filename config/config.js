'use strict';
/**
 * Module dependencies.
 */

var path = require('path');
var extend = require('util')._extend;

// Join configurations under app.config
var ENV = process.env.NODE_ENV || 'development';
var enviroment = require('./env/'+ENV);

var defaults = {
  root: path.normalize(path.join(__dirname, '/..')),
  env: ENV,
};

app.config = extend(enviroment, defaults);

/**
 * Expose
 */
module.exports = function (app, next){
  next();
}
