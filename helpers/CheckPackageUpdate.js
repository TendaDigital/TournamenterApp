const semver = require('semver')
const request = require('request')

const NPM_BASE = 'http://registry.npmjs.org'

/*
 * Checks for update for a specific package
 * this will never send back errors. Only no-update available (null)
 */
module.exports = function CheckPackageUpdate(package, next) {
  let {name, version} = package 
  let url = `${NPM_BASE}/${name}`
  
  request({
    url,
    json: true,
  }, function (error, response, body) {
    if (error) {
      return next && next(null, null)
    }

    if (response.statusCode != 200) {
      return next && next(null, null)
    }

    // Check version
    let newVersion = body['dist-tags'].latest
    let hasUpdate = semver.gt(newVersion, version)

    // Send back data
    return next && next(null, hasUpdate ? newVersion : null)
  })
}