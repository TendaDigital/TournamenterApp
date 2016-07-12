angular.module('App', [
  'Panel',
  'Window',
  'Common',
  'GenericFileModel',

  'ngMaterial',
  'ngAnimate',
	'ui.router',
  'ngFx',
])

// Configure theme
.config( function ($mdThemingProvider) {

  $mdThemingProvider.theme('default')
    .primaryPalette('blue', {
      'default': '700'
    })
    .accentPalette('pink')
})

.config( function ($stateProvider, $urlRouterProvider) {
  // Setup routes
  $stateProvider
	.state('dashboard', {
		url: '/dashboard',
		templateUrl: '/views/dashboard.html',
    controller: 'DashboardCtrl',
	});

	// $urlRouterProvider.otherwise('/dashboard')
})

// Safelly provides binding/unbinding to ipcRenderer of Electron
.service('ipcRenderer', function (){
  var service = this;
  var ipcRenderer = require('electron').ipcRenderer;

  // Override 'on' method to listen to $scope and stop listening on destroy
  service.on = function ($scope, channel, callback) {
    ipcRenderer.on(channel, callback)
    $scope.$on('$destroy', handler);

    // Remove listener
    function handler(){
      ipcRenderer.removeListener(channel, callback)
    }

    return handler;
  }

  // Expose the same methods for sending
  service.send = ipcRenderer.send.bind(ipcRenderer)
  service.sendSync = ipcRenderer.sendSync.bind(ipcRenderer)
})

// Keep Settings in sync with main process
.service('Settings', function (ipcRenderer){
  var service = this;
  console.log('Settings started');

  // Get IPC in electron
  var ipc = require('electron').ipcRenderer;

  // Load Settings
  service.settings = ipc.sendSync('Settings:get', null);

  // Listen for changes in settings and saves to service
  ipc.on('Settings:updated', updateSettings);

  // Update current settings
  function updateSettings (event, settings) {
    // Remove keys that doesn't exist
    for(var k in service.settings)
      if(!(k in settings))
        delete settings[k];

    // Set keys that exists
    for(var k in settings)
      service.settings[k] = settings[k];
  }

  // Set settings
  service.set = function (key, value){
    ipc.send('Settings:set', key, value);
  }

})


.controller('AppCtrl', function ($timeout, $scope) {
  $scope._loaded = false;

  $timeout(function (){
    $scope._loaded = true;
  }, 1000);
})
