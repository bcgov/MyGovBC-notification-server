'use strict'
var parallel = require('async/parallel')
module.exports.purgeData = function () {
  var app = arguments[0]
  var callback
  if (arguments.length > 1) {
    callback = arguments[arguments.length - 1]
  }
  var cronConfig = app.get('cron').purgeData || {}
  var retentionDays

  parallel([
    function (cb) {
      // delete all non-inApp old notifications
      retentionDays = cronConfig.pushNotificationRetentionDays || cronConfig.defaultRetentionDays
      app.models.Notification.destroyAll({
        channel: {neq: 'inApp'},
        created: {lt: Date.now() - retentionDays * 86400000}
      }, function (err, data) {
        if (!err && data && data.count > 0) {
          console.log(new Date().toLocaleString() + ': Deleted ' + data.count + ' items.')
        }
        return cb(err, data)
      })
    },
    function (cb) {
      // delete all expired inApp notifications
      retentionDays = cronConfig.expiredInAppNotificationRetentionDays || cronConfig.defaultRetentionDays
      app.models.Notification.destroyAll({
        channel: 'inApp',
        validTill: {lt: Date.now() - retentionDays * 86400000}
      }, function (err, data) {
        if (!err && data && data.count > 0) {
          console.log(new Date().toLocaleString() + ': Deleted ' + data.count + ' items.')
        }
        return cb(err, data)
      })
    },
    function (cb) {
      // delete all deleted inApp notifications
      app.models.Notification.destroyAll({
        channel: 'inApp',
        state: 'deleted'
      }, function (err, data) {
        if (!err && data && data.count > 0) {
          console.log(new Date().toLocaleString() + ': Deleted ' + data.count + ' items.')
        }
        return cb(err, data)
      })
    },
    function (cb) {
      // delete all old non-confirmed subscriptions
      retentionDays = cronConfig.nonConfirmedSubscriptionRetentionDays || cronConfig.defaultRetentionDays
      app.models.Subscription.destroyAll({
        state: {neq: 'confirmed'},
        updated: {lt: Date.now() - retentionDays * 86400000}
      }, function (err, data) {
        if (!err && data && data.count > 0) {
          console.log(new Date().toLocaleString() + ': Deleted ' + data.count + ' items.')
        }
        return cb(err, data)
      })
    }
  ], function (err, results) {
    callback && callback(err, results)
  })
}
module.exports.dispatchLiveNotifications = function () {
  var app = arguments[0]
  var callback
  if (arguments.length > 1) {
    callback = arguments[arguments.length - 1]
  }
  app.models.Notification.find({
    where: {
      state: 'new',
      channel: {neq: 'inApp'},
      invalidBefore: {lt: Date.now()}
    }
  }, function (err, livePushNotifications) {
    if (err) {
      return callback && callback(err, livePushNotifications)
    }
    let notificationTasks = livePushNotifications.map(function (livePushNotification) {
      return function (cb) {
        livePushNotification.state = 'sending'
        livePushNotification.save(function (errSave) {
          if (errSave) {
            return cb(errSave)
          }
          let ctx = {}
          ctx.args = {}
          ctx.args.data = livePushNotification
          app.models.Notification.preCreationValidation(ctx, function (errPreCreationValidation) {
            if (errPreCreationValidation) {
              return cb(errPreCreationValidation)
            }
            app.models.Notification.dispatchNotification(ctx, livePushNotification, function (errDispatchNotification) {
              return cb(errDispatchNotification)
            })
          })
        })
      }
    })
    parallel(notificationTasks, function (err, results) {
      return callback && callback(err, results)
    })
  })
}

var lastConfigCheck = new Date(0)
var rssTasks = {}
module.exports.checkRssConfigUpdates = function () {
  var app = arguments[0]
  var CronJob = require('cron').CronJob
  app.models.Configuration.find({
      where: {
        name: 'notification',
        "value.rss": {neq: null}
      }
    }, function (err, data) {
      lastConfigCheck = Date.now()
      /*jshint loopfunc: true */
      for (var key in rssTasks) {
        if (!rssTasks.hasOwnProperty(key)) {
          continue
        }
        if (!data.find(function (e) {
            // todo: make sure works for in-memory db
            return e.id.toString() === key
          })) {
          rssTasks[key].stop()
          delete rssTasks[key]
        }
      }
      data.forEach(function (e) {
        if (!rssTasks[e.id]) {
          rssTasks[e.id] = new CronJob({
            cronTime: e.value.rss.timeSpec,
            onTick: function () {
              // todo: parse rss and send notification
            },
            start: true
          })
        }
      })
    }
  )
}
