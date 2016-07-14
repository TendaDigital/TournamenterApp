'use strict';

/**
 * Module dependencies
 */
var async = require('async');
var Nuts = require('nuts-serve').Nuts;
var express = require('express');

/**
 * Global App Object
 */
var app = {
};

/**
 * Define Globals
 */
global.app = app;

global._ = require('lodash');
global.chalk = require('chalk');
global._TAG = function (tag){
  return chalk.yellow(`[${tag}]`);
}

/**
 *  Define TAG
 */
var TAG = _TAG('TournamenterServer');

/*
 * Bootstrap Process
 */
var configSetps = [
  // Load Express
  (app, next) => {
    console.log(TAG, 'Setup Express');
    app.express = express();
    next();
  },

  // Setup Nuts
  (app, next) => {
    console.log(TAG, 'Setup Nuts');

    if(!process.env.GITHUB_TOKEN)
      throw new Error('GITHUB_TOKEN not set!')

    app.nuts = Nuts({
      // GitHub configuration
      repository: process.env.GITHUB_REPO || 'ivanseidel/TournamenterApp',
      token: process.env.GITHUB_TOKEN,
    });

    app.express.use('/', app.nuts.router);
    next();
  },

  // Lift app
  (app, next) => {
    console.log(TAG, 'Lift');
    app.express.listen(process.env.PORT || 4000, next);
  },
];

// Configure steps and initialize
async.eachSeries(configSetps, function (config, next){
	config(app, next);
}, function (err){
  // Check if an error ocurred during initialization
	if(err){
		console.error(TAG, 'Failed to initialize TournamenterServer: %s', err);
		throw err;
    return
	}

  // App started OK.
	console.log(TAG, chalk.green('App started'));
});
