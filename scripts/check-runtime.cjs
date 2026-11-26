const fs = require('node:fs')
const path = require('node:path')

module.exports = async function checkRuntime() {
  for (const name of ['core/bin/tournamenter.js', 'core/client/out/index.html', 'obr/index.js', 'obr/public/tournamenter-obr/dist/main.js', 'npm/bin/npm-cli.js']) {
    if (!fs.existsSync(path.join(__dirname, '..', 'runtime-local', name))) {
      throw new Error('Missing ' + name + '. Build the companion projects and run npm run stage.')
    }
  }
}
