angular.module('Window', [

])

// Manage Menu bar (Specific for each window)
.service('MenuService', function ($rootScope) {
  var service = this;
  service.menuTemplate = null;

  // Subscribe for changes
  service.subscribe = function (scope, callback){
    if(!scope || !callback)
      return console.error('Cannot subscribe with invalid scope and callback!');

    var handler = $rootScope.$on('MenuService:update', callback);
    scope.$on('$destroy', handler);
  }

  service.setMenuTemplate = function (menuTemplate){
    service.menuTemplate = menuTemplate;
    $rootScope.$emit('MenuService:update');
  }
})


// Controller for menu bar
.controller('MenuCtrl', function ($rootScope) {

  // Broadcast the action clicked
  this.action = function (action, data) {
    $rootScope.$broadcast(action, data);
  }

})

// Manage windows
.service('WindowService', function ($rootScope) {
  var service = this;

  service.windows = [];
  service.selectedWindow = -1;

  // Generate Windows Id for a window
  service._windowId = function _windowId(win){
    return win.id + ':' + (win.userData || {}).id;
  }
  // Get list of window ids (join both window ID and userData id)
  service._windowIds = function _windowIds(){
    return _.map(service.windows, service._windowId);
  }

  // Subscribe for changes
  service.subscribe = function (scope, callback){
    if(!scope || !callback)
      return console.error('Cannot subscribe with invalid scope and callback!');

    var handler = $rootScope.$on('WindowService:update', callback);
    scope.$on('$destroy', handler);
  }

  // Adds a window to the window list
  service.open = function (win){
    if(!win)
      return;

    // Set defaults on userData
    win.userData = win.userData || {};

    // Check if window is already included, and open that window
    var idx = service._windowIds().indexOf(service._windowId(win));
    if(idx >= 0){
      service.selectedWindow = idx;
      $rootScope.$emit('WindowService:update');
      return;
    }

    // Append window
    service.windows.push(win);
    service.selectedWindow = service.windows.length - 1;

    $rootScope.$emit('WindowService:update');
  }

  // Close a window
  service.close = function (win){
    // Check if window exists
    var idx = service._windowIds().indexOf(service._windowId(win))
    if(idx < 0)
      return;

    // Remove element from the list
    service.windows.splice(idx, 1);

    // Change selected window if it's the last one
    var toGo = Math.min(service.selectedWindow, service.windows.length - 1);
    service.selectedWindow = toGo;

    $rootScope.$emit('WindowService:update');
  }

})

.controller('WindowCtrl', function ($scope, $rootScope, WindowService, MenuService) {

  // console.log('WindowCtrl');

  $scope.win = null;
  $scope.windows = null;
  $scope.selectedWindow = 0;
  $scope._windowId = WindowService._windowId;

  updateWindows();
  WindowService.subscribe($scope, updateWindows)

  $scope.open = WindowService.open;

  function updateWindows(){
    $scope.windows = WindowService.windows;
    $scope.selectedWindow = WindowService.selectedWindow;
    // $scope.win = $scope.windows[$scope.selectedWindow];
  }
})
