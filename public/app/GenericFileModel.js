angular.module('GenericFileModel', [

])

.service('GenericFileModel', function (ipcRenderer) {
  var service = this;

  service.subscribe = function ($scope, type, callback) {
    ipcRenderer.on($scope, 'GenericFileModel:update:'+type, callback);
  }

  service.list = function (type) {
    return ipcRenderer.sendSync('GenericFileModel:list', type);
  }

  service.get = function (type, id) {
    return ipcRenderer.sendSync('GenericFileModel:get', type, id);
  }

  service.getPath = function (type, id) {
    return ipcRenderer.sendSync('GenericFileModel:getPath', type, id);
  }

  service.save = function (type, id, data) {
    return ipcRenderer.sendSync('GenericFileModel:save', type, id, data);
  }

  service.remove = function (type, id) {
    return ipcRenderer.sendSync('GenericFileModel:remove', type, id);
  }

  window.GFM = service;
})
