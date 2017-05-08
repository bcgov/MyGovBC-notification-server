var loopback = require('loopback')
var boot = require('loopback-boot')

var app = module.exports = loopback()

app.start = function () {
  if (process.env.NOTIFYBC_SKIP_CRON != 'true') {
    // start cron
    var cron = require('cron')
    var cronTask = require('../common/helpers').cronTask
    var cronConfig = app.get('cron') || {}
    var job = new cron.CronJob({
      cronTime: cronConfig.timeSpec || '0 0 1 * * *',
      onTick: function () {
        cronTask(app)
      },
      start: true
    })
  }

  app.set('trust proxy', app.get('trustedReverseProxyIps'))
  // start the web server
  return app.listen(function () {
    app.emit('started')
    var baseUrl = app.get('url').replace(/\/$/, '')
    console.log('Web server listening at: %s', baseUrl)
    if (app.get('loopback-component-explorer')) {
      var explorerPath = app.get('loopback-component-explorer').mountPath
      console.log('Browse your REST API at %s%s', baseUrl, explorerPath)
    }
  })
}

// Bootstrap the application, configure models, datasources and middleware.
// Sub-apps like REST API are mounted via boot scripts.
boot(app, __dirname, function (err) {
  if (err) throw err

  // start the server if `$ node server.js`
  if (require.main === module)
    app.start()
})
