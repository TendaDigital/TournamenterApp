// Get IPC in electron
var ipc = require('electron').ipcRenderer;

angular.module('App', [
  'ServerRunner',
  'ExtensionManager',

  'Panel',
  'Window',
  'Notify',
  'Common',
  'GenericFileModel',

  'luegg.directives',
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

  $mdThemingProvider.theme('dark', 'default')
    .primaryPalette('yellow')
    .dark();
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

// Set menu bindings
.run( function ($rootScope) {

  // Open DevTools
  $rootScope.$on('App:openDevTools', function (){
    require('electron').remote.getCurrentWindow().toggleDevTools();
  })

  // Reload Page
  $rootScope.$on('App:reload', function (){
    location.reload();
  })

  // Open AppData folder
  $rootScope.$on('App:openAppData', function () {
    var AppData = require('electron').remote.app.getPath('userData')
    require('electron').shell.showItemInFolder(AppData)
  })

  // Open Extensions folder
  $rootScope.$on('App:openExtensions', function () {
    var AppData = require('electron').remote.app.getPath('userData')
    var Extensions = require('path').join(AppData, '/extensions/node_modules')
    require('electron').shell.showItemInFolder(Extensions)
  })
})

// Safelly provides binding/unbinding to ipcRenderer of Electron
.service('ipcRenderer', function (){
  var service = this;

  // Override 'on' method to listen to $scope and stop listening on destroy
  service.on = function ($scope, channel, callback) {
    ipc.on(channel, callback)

    // Set destroy handler only if scope is defined
    $scope && $scope.$on('$destroy', handler);

    // Remove listener
    function handler(){
      ipc.removeListener(channel, callback)
    }

    return handler;
  }

  // Expose the same methods for sending
  service.send = ipc.send.bind(ipc)
  service.sendSync = ipc.sendSync.bind(ipc)
})

// Keep Settings in sync with main process
.service('Settings', function (ipcRenderer){
  var service = this;
  console.log('Settings started');

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
  $scope.version = require('electron').remote.app.getVersion();
  $scope.versionTournamenter = require('tournamenter/package.json').version;
  $scope.newUpdate = require('electron').remote.require('./helpers/CheckUpdate.js').newUpdate;

  $scope.openExternal = function openExternal(link){
    const {shell} = require('electron');
    shell.openExternal(link);
  }

  $scope.showUpdateInfo = function showUpdateInfo(){
    require('electron').remote.dialog.showMessageBox({
      type: 'info',
      title: $scope.newUpdate.name,
      message: $scope.newUpdate.notes,
    })
  }

  $timeout(function (){
    $scope._loaded = true;
  }, 1000);

  // Update newUpdate once fetch is done
  ipc.on('newUpdate', function (update) {
    $scope.newUpdate = update

    // Apply changes to scope if not in digest phase
    if(!$scope.$$phase)
      $scope.$apply();
  })
})
