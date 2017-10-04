let app
module.exports = function(cb) {
  if (app) {
    return process.nextTick(() => {
      cb(null, app)
    })
  }
  var loopback = require('loopback')
  var boot = require('loopback-boot')

  app = loopback()
  app.use(loopback.token())

  app.start = function() {
    if (process.env.NOTIFYBC_NODE_ROLE !== 'slave') {
      var CronJob = require('cron').CronJob
      var cronTasks = require('./cron-tasks')
      var cronConfig = app.get('cron') || {}
      // start purgeData cron
      var cronConfigPurgeData = cronConfig.purgeData || {}
      new CronJob({
        cronTime: cronConfigPurgeData.timeSpec,
        onTick: function() {
          cronTasks.purgeData(app)
        },
        start: true
      })
      // start dispatchLiveNotifications cron
      var cronConfigDispatchLiveNotifications =
        cronConfig.dispatchLiveNotifications || {}
      new CronJob({
        cronTime: cronConfigDispatchLiveNotifications.timeSpec,
        onTick: function() {
          cronTasks.dispatchLiveNotifications(app)
        },
        start: true
      })
      // start checkRssConfigUpdates cron
      var cronConfigCheckRssConfigUpdates =
        cronConfig.checkRssConfigUpdates || {}
      new CronJob({
        cronTime: cronConfigCheckRssConfigUpdates.timeSpec,
        onTick: function() {
          cronTasks.checkRssConfigUpdates(app)
        },
        start: true
      })
    }

    app.set('trust proxy', app.get('trustedReverseProxyIps'))
    // start the web server
    return app.listen(function() {
      // without following line, node.js closes socket after 2min
      this.setTimeout(0)
      app.emit('started')
      var baseUrl = app.get('url').replace(/\/$/, '')
      console.log('Web server listening at: %s', baseUrl)
      if (app.get('loopback-component-explorer')) {
        var explorerPath = app.get('loopback-component-explorer').mountPath
        console.log('Browse your REST API at %s%s', baseUrl, explorerPath)
      }
      cb && cb(null, app)
    })
  }

  // Bootstrap the application, configure models, datasources and middleware.
  // Sub-apps like REST API are mounted via boot scripts.
  boot(app, __dirname, function(err) {
    if (err && cb) {
      return cb(err)
    }
    if (err) throw err

    // start the server if `$ node server.js`
    if (require.main === module) {
      return app.start()
    }
    cb && cb(null, app)
  })
}
if (require.main === module) {
  module.exports()
}
