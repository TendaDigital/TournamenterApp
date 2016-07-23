const readline = require('readline');

module.exports = function bindProcessLogsToIPC(proc, namespace, regexs = {}){
  const emit = app.helpers.emit;

  // Push log messages to electron's IPC
  readline.createInterface({
    input: proc.stdout, terminal: false
  }).on('line', function(line) {
    emit(`${namespace}:log`, 'debug', line);
  });

  // Push log messages to electron's IPC
  readline.createInterface({
    input: proc.stderr, terminal: false
  }).on('line', function(line) {
    if(!regexs.error || (regexs.error && regexs.error.test(line)))
      return emit(`${namespace}:log`, 'error', line);

    // Emits a warning
    emit(`${namespace}:log`, 'warn', line);

  });

}
