angular.module('Notify', [
  'ngMaterial'
])

// Manage windows
.service('NotifyService', function ($rootScope, $mdToast) {
  var service = this;

  service.notify = function notify(title, message, actionOrDelay){
    var toast = $mdToast.simple()
      .textContent(message)
      .position('top right');

    // Check if action is a string
    if(_.isString(actionOrDelay)){
      toast.action(actionOrDelay)
        .highlightAction(true)
        .highlightClass('md-accent')
        .hideDelay(0);
    }else{
      toast.hideDelay(parseInt(actionOrDelay * 1) || 3000);
    }

    $mdToast.show(toast);
  }
})

.run(function (NotifyService, ipcRenderer){
  ipcRenderer.on(null, 'notify', (evt, title, message, actionOrDelay) => {
    NotifyService.notify(title, message, actionOrDelay);
  })
})
