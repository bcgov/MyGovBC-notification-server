module.exports.disableAllMethods = function (model, methodsToExpose) {
  if (model && model.sharedClass) {
    methodsToExpose = methodsToExpose || []

    var modelName = model.sharedClass.name
    var methods = model.sharedClass.methods()
    var relationMethods = []
    var hiddenMethods = []

    try {
      Object.keys(model.definition.settings.relations).forEach(function (relation) {
        relationMethods.push({name: '__findById__' + relation, isStatic: false})
        relationMethods.push({name: '__destroyById__' + relation, isStatic: false})
        relationMethods.push({name: '__updateById__' + relation, isStatic: false})
        relationMethods.push({name: '__exists__' + relation, isStatic: false})
        relationMethods.push({name: '__link__' + relation, isStatic: false})
        relationMethods.push({name: '__get__' + relation, isStatic: false})
        relationMethods.push({name: '__create__' + relation, isStatic: false})
        relationMethods.push({name: '__update__' + relation, isStatic: false})
        relationMethods.push({name: '__destroy__' + relation, isStatic: false})
        relationMethods.push({name: '__unlink__' + relation, isStatic: false})
        relationMethods.push({name: '__count__' + relation, isStatic: false})
        relationMethods.push({name: '__delete__' + relation, isStatic: false})
      })
    } catch (err) {
    }

    methods.concat(relationMethods).forEach(function (method) {
      var methodName = method.name
      if (methodsToExpose.indexOf(methodName) < 0) {
        hiddenMethods.push(methodName)
        model.disableRemoteMethodByName(methodName)
      }
    })
    if (hiddenMethods.length > 0) {
      console.info('Remote mehtods hidden for', modelName, ':', hiddenMethods.join(', '))
    }
  }
}

module.exports.cronTask = function () {
  var app = arguments[0]
  var callback = arguments[arguments.length - 1]
  if (typeof callback !== 'function') {
    callback = null
  }
  var cronConfig = app.get('cron') || {}
  var retentionDays
  var parallel = require('async/parallel')

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
