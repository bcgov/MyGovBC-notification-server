var loopback = require('loopback')
var boot = require('loopback-boot')

var app = module.exports = loopback()

app.start = function () {
  if (process.env.NOTIFYBC_NODE_ROLE !== 'slave') {
    var CronJob = require('cron').CronJob
    // start purgeData cron
    var cronTasks = require('./cron-tasks')
    var cronConfig = app.get('cron') || {}
    var cronConfigPurgeData = cronConfig.purgeData || {}
    var cronConfigDispatchLiveNotifications = cronConfig.dispatchLiveNotifications || {}
    new CronJob({
      cronTime: cronConfigPurgeData.timeSpec,
      onTick: function () {
        cronTasks.purgeData(app)
      },
      start: true
    })
    new CronJob({
      cronTime: cronConfigDispatchLiveNotifications.timeSpec,
      onTick: function () {
        cronTasks.dispatchLiveNotifications(app)
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
