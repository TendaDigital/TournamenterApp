'use strict';

angular.module('Common', [

])

.service('Dialogs', function ($mdDialog){
  var service = this;

  this.alert = function(text, textOk, callback) {
    $mdDialog.show(
      $mdDialog.alert()
        .clickOutsideToClose(true)
        .title('Atenção')
        .textContent(text)
        .ariaLabel('Alert Dialog')
        .ok(textOk)
        .targetEvent(callback)
    );
  };

  this.confirm = function(text, textOk, textCancel, callback) {
    var confirm = $mdDialog.confirm()
      .title('Confirmação')
      .textContent(text)
      .ariaLabel('Confirm Dialog')
      .ok(textOk)
      .cancel(textCancel)
      .targetEvent(callback)
    $mdDialog.show(confirm).then(function() {
      callback && callback(true);
    }, function() {
      callback && callback(false);
    });
  };

  service.prompt = function(text, placeholder, textDefault, callback) {
    var confirm = $mdDialog.prompt()
      .title('Pergunta...')
      .textContent(text)
      .ariaLabel('Prompt Dialog')
      .placeholder(textDefault)
      // .initialValue(placeholder)
      .ok('OK')
      .cancel('Cancelar')
      .targetEvent(callback)
    $mdDialog.show(confirm).then(function(result) {
      callback && callback(result);
    }, function() {
      callback && callback(null);
    });
  };
})

.factory('THREELoader', function (){
  return new Loader();
})

.service('DragNDrop', function (){
  var service = this;

  // Call this method to register drag'n drop
  // within the element.
  //
  // onStateChange will be called with a boolean flag indicating
  // if drop is being made.
  //
  // onDrop will be called once a file has been dropped
  service.onDrop = function (handler, onDrop, onStateChange) {
    if(!handler)
      return console.error('Invalid element to register DragnDrop', handler);

    onStateChange = onStateChange || null;

    // Throttle onStateChange to avoid too many events
    onStateChange = _.throttle(onStateChange, 200, {}, true, false);

    handler.ondragover = function () {
      // Notify drop state
      onStateChange && onStateChange(true);

      return true;
    }

    handler.ondragenter = handler.ondragover = function (e) {
      // Notify drop state
      onStateChange && onStateChange(true);

      e.preventDefault();
    }

    handler.ondragleave = handler.ondragend = function () {
      // Notify drop state
      onStateChange && onStateChange(false);

      return false;
    };

    handler.ondrop = function (e) {
      console.log('dropped');

      // Notify drop state
      onStateChange && onStateChange(false);

      // Callback method
      onDrop && onDrop(e.dataTransfer);

      // Prevent default action
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';

      return false;
    };
  }
})
