var path = require('path');

module.exports = {
  name: 'Tournamenter Manager',
  icon: path.join(__dirname, '../../', 'midia/Tournamenter_appicon.png'),
  settings_file: path.join(electron.app.getPath('userData'), '.settings.json'),
  fileModelsDir: 'FileModels',
};
