'use strict'
var parallel = require('async/parallel')
module.exports.purgeData = function () {
  var app = arguments[0]
  var callback
  if (arguments.length > 1) {
    callback = arguments[arguments.length - 1]
  }
  var cronConfig = app.get('cron') || {}
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
module.exports.publishGoLives = function () {
  var app = arguments[0]
  var callback = arguments[arguments.length - 1]
  if (typeof callback !== 'function') {
    callback = null
  }
  parallel([function (cb) {
    app.models.Notification.find({state: 'new'}, function (err, data) {
      cb(err, data)
    })
  }
  ], function (err, results) {
    callback && callback(err, results)
  })
}
