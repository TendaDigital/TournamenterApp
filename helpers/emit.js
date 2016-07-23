//
// Emits an event to electron ipc
//
module.exports = function emit(channel, ...payload){
  // Emits the event to the target main window
  var _window = app.controllers.MainWindow.getWindow();
  _window && _window.webContents.send(channel, ...payload);
}
