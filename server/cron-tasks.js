var parallel = require('async/parallel')
var FeedParser = require('feedparser')
var request = require('request')
var _ = require('lodash')

module.exports.request = request
module.exports.purgeData = function () {
  var app = arguments[0]
  // for automated testing
  var callback
  if (arguments.length > 1) {
    callback = arguments[arguments.length - 1]
  }
  var cronConfig = app.get('cron').purgeData || {}

  parallel(
    [
      function (cb) {
        // delete all non-inApp old notifications
        let retentionDays =
          cronConfig.pushNotificationRetentionDays ||
          cronConfig.defaultRetentionDays
        app.models.Notification.destroyAll({
            channel: {
              neq: 'inApp'
            },
            created: {
              lt: Date.now() - retentionDays * 86400000
            }
          },
          function (err, data) {
            if (!err && data && data.count > 0) {
              console.info(
                new Date().toLocaleString() +
                ': Deleted ' +
                data.count +
                ' items.'
              )
            }
            return cb(err, data)
          }
        )
      },
      function (cb) {
        // delete all expired inApp notifications
        let retentionDays =
          cronConfig.expiredInAppNotificationRetentionDays ||
          cronConfig.defaultRetentionDays
        app.models.Notification.destroyAll({
            channel: 'inApp',
            validTill: {
              lt: Date.now() - retentionDays * 86400000
            }
          },
          function (err, data) {
            if (!err && data && data.count > 0) {
              console.info(
                new Date().toLocaleString() +
                ': Deleted ' +
                data.count +
                ' items.'
              )
            }
            return cb(err, data)
          }
        )
      },
      function (cb) {
        // delete all deleted inApp notifications
        app.models.Notification.destroyAll({
            channel: 'inApp',
            state: 'deleted'
          },
          function (err, data) {
            if (!err && data && data.count > 0) {
              console.info(
                new Date().toLocaleString() +
                ': Deleted ' +
                data.count +
                ' items.'
              )
            }
            return cb(err, data)
          }
        )
      },
      function (cb) {
        // delete all old non-confirmed subscriptions
        let retentionDays =
          cronConfig.nonConfirmedSubscriptionRetentionDays ||
          cronConfig.defaultRetentionDays
        app.models.Subscription.destroyAll({
            state: {
              neq: 'confirmed'
            },
            updated: {
              lt: Date.now() - retentionDays * 86400000
            }
          },
          function (err, data) {
            if (!err && data && data.count > 0) {
              console.info(
                new Date().toLocaleString() +
                ': Deleted ' +
                data.count +
                ' items.'
              )
            }
            return cb(err, data)
          }
        )
      },
      function (cb) {
        // purge deleted bounces
        let retentionDays =
          cronConfig.deletedBounceRetentionDays ||
          cronConfig.defaultRetentionDays
        app.models.Bounce.destroyAll({
            state: 'deleted',
            updated: {
              lt: Date.now() - retentionDays * 86400000
            }
          },
          function (err, data) {
            if (!err && data && data.count > 0) {
              console.info(
                new Date().toLocaleString() +
                ': Deleted ' +
                data.count +
                ' items.'
              )
            }
            return cb(err, data)
          }
        )
      }
    ],
    function (err, results) {
      callback && callback(err, results)
    }
  )
}

module.exports.dispatchLiveNotifications = function () {
  var app = arguments[0]
  // for automated testing
  var callback
  if (arguments.length > 1) {
    callback = arguments[arguments.length - 1]
  }
  app.models.Notification.find({
      where: {
        state: 'new',
        channel: {
          neq: 'inApp'
        },
        invalidBefore: {
          lt: Date.now()
        }
      }
    },
    function (err, livePushNotifications) {
      if (
        err ||
        (livePushNotifications && livePushNotifications.length === 0)
      ) {
        return callback && callback(err, livePushNotifications)
      }
      let notificationTasks = livePushNotifications.map(function (
        livePushNotification
      ) {
        return function (cb) {
          livePushNotification.state = 'sending'
          if (
            livePushNotification.asyncBroadcastPushNotification === undefined
          ) {
            livePushNotification.asyncBroadcastPushNotification = true
          }
          livePushNotification.save(function (errSave) {
            if (errSave) {
              return cb(null, errSave)
            }
            let ctx = {}
            ctx.args = {}
            ctx.args.data = livePushNotification
            app.models.Notification.preCreationValidation(ctx, function (
              errPreCreationValidation
            ) {
              if (errPreCreationValidation) {
                return cb(errPreCreationValidation)
              }
              app.models.Notification.dispatchNotification(
                ctx,
                livePushNotification,
                function (errDispatchNotification) {
                  return cb(null, errDispatchNotification)
                }
              )
            })
          })
        }
      })
      parallel(notificationTasks, function (err, results) {
        return callback && callback(err, results)
      })
    }
  )
}

var lastConfigCheck = 0
var rssTasks = {}
module.exports.checkRssConfigUpdates = function () {
  var app = arguments[0]
  // for automated testing
  var callback
  if (arguments.length > 1) {
    callback = arguments[arguments.length - 1]
  }
  var CronJob = require('cron').CronJob
  app.models.Configuration.find({
      where: {
        name: 'notification',
        'value.rss': {
          neq: null
        }
      }
    },
    function (err, rssNtfctnConfigItems) {
      /*jshint loopfunc: true */
      for (var key in rssTasks) {
        if (!rssTasks.hasOwnProperty(key)) {
          continue
        }

        let rssNtfctnConfigItem = rssNtfctnConfigItems.find(function (e) {
          return e.id.toString() === key
        })

        if (!rssNtfctnConfigItem ||
          rssNtfctnConfigItem.updated.getTime() > lastConfigCheck
        ) {
          rssTasks[key].stop()
          delete rssTasks[key]
        }
      }
      rssNtfctnConfigItems.forEach(function (rssNtfctnConfigItem) {
        if (!rssTasks[rssNtfctnConfigItem.id]) {
          rssTasks[rssNtfctnConfigItem.id] = new CronJob({
            cronTime: rssNtfctnConfigItem.value.rss.timeSpec,
            onTick: function () {
              app.models.Rss.findOrCreate({
                  where: {
                    serviceName: rssNtfctnConfigItem.serviceName
                  }
                }, {
                  serviceName: rssNtfctnConfigItem.serviceName,
                  items: []
                },
                function (err, lastSavedRssData) {
                  var lastSavedRssItems = []
                  try {
                    lastSavedRssItems = lastSavedRssData.items
                  } catch (ex) {}
                  var req = module.exports.request(
                    rssNtfctnConfigItem.value.rss.url
                  )
                  var feedparser = new FeedParser({
                    addmeta: false
                  })

                  req.on('error', function (error) {
                    if (callback) {
                      callback.called = true
                      return callback(error, rssTasks)
                    }
                  })

                  req.on('response', function (res) {
                    var stream = this // `this` is `req`, which is a stream

                    if (res.statusCode !== 200) {
                      this.emit('error', new Error('Bad status code'))
                    } else {
                      stream.pipe(feedparser)
                    }
                  })

                  feedparser.on('error', function (error) {
                    // always handle errors
                    console.info(error)
                  })

                  var items = []
                  let ts = new Date()
                  feedparser.on('readable', function () {
                    // This is where the action is!
                    var stream = this // `this` is `feedparser`, which is a stream
                    var meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
                    var item
                    while ((item = stream.read())) {
                      item._notifyBCLastPoll = ts
                      items.push(item)
                    }
                  })
                  feedparser.on('end', function () {
                    let itemKeyField =
                      rssNtfctnConfigItem.value.rss.itemKeyField || 'guid'
                    let fieldsToCheckForUpdate = rssNtfctnConfigItem.value.rss
                      .fieldsToCheckForUpdate || ['pubDate']
                    var newOrUpdatedItems = _.differenceWith(
                      items,
                      lastSavedRssItems,
                      function (arrVal, othVal) {
                        if (arrVal[itemKeyField] !== othVal[itemKeyField]) {
                          return false
                        }
                        if (!rssNtfctnConfigItem.value.rss.includeUpdatedItems) {
                          return arrVal[itemKeyField] === othVal[itemKeyField]
                        }
                        return !fieldsToCheckForUpdate.some(compareField => {
                          return (
                            arrVal[compareField] &&
                            othVal[compareField] &&
                            arrVal[compareField].toString() !==
                            othVal[compareField].toString()
                          )
                        })
                      }
                    )
                    let outdatedItemRetentionGenerations =
                      rssNtfctnConfigItem.value.rss
                      .outdatedItemRetentionGenerations || 1
                    let lastPollInterval = ts.getTime()
                    try {
                      lastPollInterval =
                        ts.getTime() - lastSavedRssData.lastPoll.getTime()
                    } catch (ex) {}
                    var retainedOutdatedItems = _.differenceWith(
                      lastSavedRssItems,
                      items,
                      function (arrVal, othVal) {
                        try {
                          let age =
                            ts.getTime() - arrVal._notifyBCLastPoll.getTime()
                          if (
                            Math.round(age / lastPollInterval) >=
                            outdatedItemRetentionGenerations
                          ) {
                            return true
                          }
                        } catch (ex) {}
                        return arrVal[itemKeyField] === othVal[itemKeyField]
                      }
                    )
                    // notify new or updated items
                    newOrUpdatedItems.forEach(function (newOrUpdatedItem) {
                      for (var channel in rssNtfctnConfigItem.value
                          .messageTemplates) {
                        if (!rssNtfctnConfigItem.value.messageTemplates.hasOwnProperty(
                            channel
                          )) {
                          continue
                        }
                        let notificationObject = {
                          serviceName: rssNtfctnConfigItem.serviceName,
                          channel: channel,
                          isBroadcast: true,
                          message: rssNtfctnConfigItem.value.messageTemplates[channel],
                          data: newOrUpdatedItem,
                          httpHost: rssNtfctnConfigItem.value.httpHost
                        }
                        let httpHost =
                          app.get('internalHttpHost') ||
                          rssNtfctnConfigItem.value.httpHost
                        let options = {
                          uri: httpHost +
                            app.get('restApiRoot') +
                            '/notifications',
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          json: notificationObject
                        }
                        module.exports.request.post(options)
                      }
                    })
                    lastSavedRssData.items = items.concat(retainedOutdatedItems)
                    lastSavedRssData.lastPoll = ts
                    lastSavedRssData.save(() => {
                      // for testing, call back on the first and supposedly sole rssNtfctnConfigItem
                      if (callback && !callback.called) {
                        callback.called = true
                        return callback(null, rssTasks)
                      }
                    })
                  })
                }
              )
            },
            start: true,
            runOnInit: !!callback
          })
        }
      })
      lastConfigCheck = Date.now()
    }
  )
}

module.exports.deleteBounces = function () {
  let app = arguments[0]
  // for automated testing
  let callback
  if (arguments.length > 1) {
    callback = arguments[arguments.length - 1]
  }
  app.models.Bounce.find({
    where: {
      state: 'active',
      latestNotificationEnded: {
        lt: Date.now() -
          app.get('cron')
          .deleteBounces.minLapsedHoursSinceLatestNotificationEnded * 3600000
      },
      latestNotificationStarted: {
        neq: null
      },
      bounceMessages: {
        neq: null
      },
    }
  }, (err, activeBounces) => {
    if (err && callback) {
      return callback(err)
    }
    let deleteTasks = []
    if (activeBounces instanceof Array) {
      deleteTasks = activeBounces.map(activeBounce => {
        return cb => {
          let latestBounceMessageDate = activeBounce.bounceMessages[0].date
          if (latestBounceMessageDate > activeBounce.latestNotificationStarted) {
            return cb()
          }
          activeBounce.state = 'deleted'
          activeBounce.save().then(res => cb(), cb)
        }
      })
    }
    parallel(deleteTasks, (err, results) => {
      callback && callback(err)
    })
  })
}
