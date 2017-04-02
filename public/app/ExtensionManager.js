angular.module('ExtensionManager', [
  'Panel',
  'Window',
  'Common',
])

.run(function ($rootScope, PanelService) {
  // Opens Servers panel
  PanelService.open({
    name: 'Extensions',
    icon: 'mdi-puzzle',
    template: 'views/extensions.panel.html',
    open: true,
  })
})

.service('ExtensionManagerService', function (ipcRenderer) {
  var service = this;

  service.subscribe = function ($scope, channel, callback) {
    ipcRenderer.on($scope, 'ExtensionManager:'+channel, callback);
  }

  service.list = function () {
    return ipcRenderer.sendSync('ExtensionManager:list');
  }

  service.get = function (id) {
    return ipcRenderer.sendSync('ExtensionManager:get', id);
  }

  service.isExecuting = function (id) {
    return ipcRenderer.sendSync('ExtensionManager:executing');
  }

  service.install = function (extension) {
    return ipcRenderer.sendSync('ExtensionManager:install', extension);
  }

  service.remove = function (extension) {
    return ipcRenderer.sendSync('ExtensionManager:remove', extension);
  }

  window.EMS = service;
})


.controller('ExtensionsWindowCtrl', function ($scope, ExtensionManagerService){
  const MAX_LOG_COUNT = 1000;

  // `extensions` holds the list of all servers
  $scope.extensions = null;

  // `executing` keeps track if there is an running process (install/uninstall
  $scope.executing = null;

  // Keep logs here
  $scope.logs = [];

  // A private counter for logs
  var counter = 1;

  // Module to be installed model-input box
  $scope.extensionName = '';

  // Update list of servers and it's states on update
  update();
  ExtensionManagerService.subscribe($scope, 'update', update);
  ExtensionManagerService.subscribe($scope, 'executing', update);

  // Listen to logs
  ExtensionManagerService.subscribe($scope, 'log', readLogs);
  function readLogs(evt, type, message){
    $scope.logs.push([counter++, type, message]);

    // Limit logs
    if($scope.logs.length > MAX_LOG_COUNT)
      $scope.logs.splice(0, logs.length - MAX_LOG_COUNT);

    // Apply changes to scope if not in digest phase
    if(!$scope.$$phase)
      $scope.$apply();
  }

  // Remove extension
  $scope.removeExtension = function (extensionId){
    // Clear logs
    $scope.logs = [];

    ExtensionManagerService.remove(extensionId);
  }

  // Remove extension
  $scope.installExtension = function (extensionId){
    // Clear logs
    $scope.logs = [];

    ExtensionManagerService.install(extensionId);
  }

  function update(){
    console.log('update');
    $scope.extensions = ExtensionManagerService.list();
    $scope.executing = ExtensionManagerService.isExecuting();

    // Apply changes to scope if not in digest phase
    if(!$scope.$$phase)
      $scope.$apply();
  }

})


.controller('ExtensionsPanelCtrl', function ($scope, $rootScope,
  ExtensionManagerService, WindowService){

  // `extensions` holds the list of all servers
  $scope.extensions = null;

  // `executing` keeps track if there is an running process (install/uninstall
  $scope.executing = null;

  // Opens a new window for the Server
  $scope.openExtensionManager = function () {
    WindowService.open({
      id: 'ExtensionManager',
      name: `Extension Manager`,
      template: 'views/extensions.window.html',
    });
  }
  $scope.openExtensionManager()

  // Update list of servers and it's states on update
  update();
  ExtensionManagerService.subscribe($scope, 'update', update);
  ExtensionManagerService.subscribe($scope, 'executing', update);

  function update(){
    $scope.extensions = ExtensionManagerService.list();
    $scope.executing = ExtensionManagerService.isExecuting();

    // Apply changes to scope if not in digest phase
    if(!$scope.$$phase)
      $scope.$apply();
  }
})
