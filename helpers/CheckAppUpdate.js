const request = require('request')

/*
 * Checks for update given the url. 
 * Returns the Update object with ''
 */
module.exports = function CheckAppUpdate(url, next) {
  request({
    url: url,
    json: true,
  }, function (error, response, body) {
    if (error) {
      return next && next('Failed to check for updates')
    }

    if (response.statusCode == 200) {
      // New update available. Parse version
      body.version = body.url.match(/version\/([\d\.]*)/g)[1] || body.name
      module.exports.newUpdate = body
      return next && next(null, body)
    }

    return next && next(null, null)
  })
}

/*
 * Stores if there is an update
 */
module.exports.newUpdate = false