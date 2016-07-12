angular.module('Panel', [

])

// Manage windows
.service('PanelService', function ($rootScope) {
  var service = this;
  service.panels = [];

  // Subscribe for changes
  service.subscribe = function (scope, callback){
    if(!scope || !callback)
      return console.error('Cannot subscribe with invalid scope and callback!');

    var handler = $rootScope.$on('PanelService:update', callback);
    scope.$on('$destroy', handler);
  }

  // Adds a window to the window list
  service.open = function (menu){
    if(!menu)
      return;

    // Defaults to closed
    menu.open = menu.open || false;

    // Check if window is already included
    if(service.panels.indexOf(menu) >= 0)
      return;

    // Append window
    service.panels.push(menu);

    $rootScope.$emit('PanelService:update');
  }

  // Close a window
  service.close = function (win){
    // Check if window exists
    var idx = service.panels.indexOf(menu)
    if(idx < 0)
      return;

    // Remove element from the list
    service.panels.splice(idx, 1);

    $rootScope.$emit('PanelService:update');
  }
})

.controller('PanelCtrl', function ($scope, PanelService) {

  console.log('PanelCtrl');

  $scope.panels = null;

  PanelService.subscribe($scope, updatePanels)

  updatePanels();

  function updatePanels(){
    $scope.panels = PanelService.panels;
  }
})
