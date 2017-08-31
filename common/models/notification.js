'use strict'

var queue = require('async/queue')
var parallel = require('async/parallel')
var disableAllMethods = require('../helpers.js').disableAllMethods
var _ = require('lodash')
var request = require('request')
var jmespath = require('jmespath')

module.exports = function(Notification) {
  disableAllMethods(Notification, [
    'find',
    'create',
    'patchAttributes',
    'deleteItemById'
  ])

  Notification.observe('access', function(ctx, next) {
    var httpCtx = ctx.options.httpContext
    ctx.query.where = ctx.query.where || {}
    var currUser = Notification.getCurrentUser(httpCtx)
    if (currUser) {
      ctx.query.where.channel = 'inApp'
      ctx.query.where.or = []
      ctx.query.where.or.push({
        isBroadcast: true
      })
      ctx.query.where.or.push({
        userChannelId: currUser
      })
    } else if (!Notification.isAdminReq(httpCtx)) {
      var error = new Error('Forbidden')
      error.status = 403
      return next(error)
    }
    next()
  })

  Notification.afterRemote('find', function(ctx, res, next) {
    if (!res) {
      return
    }
    var currUser = Notification.getCurrentUser(ctx)
    if (currUser) {
      ctx.result = res.reduce(function(p, e, i) {
        if (e.validTill && Date.parse(e.validTill) < new Date()) {
          return p
        }
        if (e.invalidBefore && Date.parse(e.invalidBefore) > new Date()) {
          return p
        }
        if (e.deletedBy && e.deletedBy.indexOf(currUser) >= 0) {
          return p
        }
        if (e.isBroadcast && e.readBy && e.readBy.indexOf(currUser) >= 0) {
          e.state = 'read'
        }
        if (e.isBroadcast) {
          e.readBy = null
          e.deletedBy = null
        }
        p.push(e)
        return p
      }, [])
    }
    next()
  })

  Notification.preCreationValidation = function() {
    let ctx = arguments[0]
    let next = arguments[arguments.length - 1]
    let error
    if (!Notification.isAdminReq(ctx)) {
      error = new Error('Forbidden')
      error.status = 403
      return next(error)
    }

    var data = ctx.args.data
    if (
      !data.isBroadcast &&
      data.skipSubscriptionConfirmationCheck &&
      !data.userChannelId
    ) {
      error = new Error('invalid user')
      error.status = 403
      return next(error)
    }
    if (!data.httpHost && data.channel !== 'inApp') {
      if (ctx.req) {
        data.httpHost = ctx.req.protocol + '://' + ctx.req.get('host')
      }
    }
    if (
      data.channel === 'inApp' ||
      data.skipSubscriptionConfirmationCheck ||
      data.isBroadcast
    ) {
      return next()
    }
    if (!data.userChannelId && !data.userId) {
      error = new Error('invalid user')
      error.status = 403
      return next(error)
    }
    // validate userChannelId/userId of a unicast push notification against subscription data
    var whereClause = {
      serviceName: data.serviceName,
      state: 'confirmed',
      channel: data.channel
    }
    if (data.userChannelId) {
      // email address check should be case insensitive
      var escapedUserChannelId = data.userChannelId.replace(
        /[-[\]{}()*+?.,\\^$|#\s]/g,
        '\\$&'
      )
      var escapedUserChannelIdRegExp = new RegExp(escapedUserChannelId, 'i')
      whereClause.userChannelId = { regexp: escapedUserChannelIdRegExp }
    }
    if (data.userId) {
      whereClause.userId = data.userId
    }

    Notification.app.models.Subscription.findOne(
      {
        where: whereClause
      },
      function(err, subscription) {
        if (err || !subscription) {
          var error = new Error('invalid user')
          error.status = 403
          return next(error)
        } else {
          // in case request supplies userId instead of userChannelId
          data.userChannelId = subscription.userChannelId
          ctx.subscription = subscription
          return next()
        }
      }
    )
  }

  Notification.beforeRemote('create', Notification.preCreationValidation)

  Notification.dispatchNotification = function(ctx, res, next) {
    // send non-inApp notifications immediately
    switch (res.channel) {
      case 'email':
      case 'sms':
        if (res.invalidBefore && Date.parse(res.invalidBefore) > new Date()) {
          return next()
        }
        sendPushNotification(ctx, res, function(errSend) {
          if (errSend) {
            res.state = 'error'
          } else if (res.isBroadcast && res.asyncBroadcastPushNotification) {
            // async
          } else {
            res.state = 'sent'
          }
          res.save(function(errSave) {
            next(errSend || errSave)
          })
        })
        break
      default:
        next()
        break
    }
  }
  Notification.afterRemote('create', Notification.dispatchNotification)

  function beforePatchAttributes() {
    var ctx = arguments[0]
    var next = arguments[arguments.length - 1]
    if (ctx.method.name === 'deleteItemById') {
      ctx.args.data = { state: 'deleted' }
    }
    // only allow changing state for non-admin requests
    if (!Notification.isAdminReq(ctx)) {
      var currUser = Notification.getCurrentUser(ctx)
      if (!currUser) {
        var error = new Error('Forbidden')
        error.status = 403
        return next(error)
      }
      ctx.args.data = ctx.args.data.state
        ? { state: ctx.args.data.state }
        : null
      if (ctx.instance.isBroadcast) {
        switch (ctx.args.data.state) {
          case 'read':
            ctx.args.data.readBy = ctx.instance.readBy || []
            if (ctx.args.data.readBy.indexOf(currUser) < 0) {
              ctx.args.data.readBy.push(currUser)
            }
            break
          case 'deleted':
            ctx.args.data.deletedBy = ctx.instance.deletedBy || []
            if (ctx.args.data.deletedBy.indexOf(currUser) < 0) {
              ctx.args.data.deletedBy.push(currUser)
            }
            break
        }
      }
      delete ctx.args.data.state
    }
    next()
  }

  function afterPatchAttributes() {
    var ctx = arguments[0]
    var next = arguments[arguments.length - 1]
    // don't return the update
    ctx.result = {}
    next()
  }

  Notification.beforeRemote('prototype.patchAttributes', beforePatchAttributes)
  Notification.afterRemote('prototype.patchAttributes', afterPatchAttributes)
  Notification.beforeRemote('prototype.deleteItemById', beforePatchAttributes)
  Notification.afterRemote('prototype.deleteItemById', afterPatchAttributes)
  Notification.prototype.deleteItemById = function(options, callback) {
    this.patchAttributes(options.httpContext.args.data, options, callback)
  }

  function sendPushNotification(ctx, data, cb) {
    switch (data.isBroadcast) {
      case false:
        let tokenData = _.assignIn({}, ctx.subscription, { data: data.data })
        var textBody =
          data.message.textBody &&
          Notification.mailMerge(data.message.textBody, tokenData, ctx)
        switch (data.channel) {
          case 'sms':
            Notification.sendSMS(data.userChannelId, textBody, cb)
            break
          default:
            var htmlBody =
              data.message.htmlBody &&
              Notification.mailMerge(data.message.htmlBody, tokenData, ctx)
            var subject =
              data.message.subject &&
              Notification.mailMerge(data.message.subject, tokenData, ctx)
            Notification.sendEmail(
              data.message.from,
              data.userChannelId,
              subject,
              textBody,
              htmlBody,
              cb
            )
        }
        break
      case true:
        let broadcastSubscriberChunkSize = Notification.app.get('notification')
          .broadcastSubscriberChunkSize
        let broadcastSubRequestBatchSize = Notification.app.get('notification')
          .broadcastSubRequestBatchSize
        let startIdx = ctx.args.start
        let broadcastToChunkSubscribers = () => {
          Notification.app.models.Subscription.find(
            {
              where: {
                serviceName: data.serviceName,
                state: 'confirmed',
                channel: data.channel
              },
              order: 'created ASC',
              skip: startIdx,
              limit: broadcastSubscriberChunkSize
            },
            function(err, subscribers) {
              let jmespathSearchOpts = {}
              try {
                jmespathSearchOpts.functionTable = Notification.app.get(
                  'notification'
                ).broadcastCustomFilterFunctions
              } catch (ex) {}
              var tasks = subscribers.reduce(function(a, e, i) {
                if (e.broadcastPushNotificationFilter && data.data) {
                  let match
                  try {
                    match = jmespath.search(
                      [data.data],
                      '[?' + e.broadcastPushNotificationFilter + ']',
                      jmespathSearchOpts
                    )
                  } catch (ex) {}
                  if (!match || match.length === 0) {
                    return a
                  }
                }
                a.push(function(cb) {
                  var notificationMsgCB = function(err) {
                    if (err) {
                      data.errorWhenSendingToUsers =
                        data.errorWhenSendingToUsers || []
                      try {
                        data.errorWhenSendingToUsers.push(e.userChannelId)
                      } catch (ex) {}
                    }
                    cb(null, err && e.userChannelId)
                  }
                  let tokenData = _.assignIn({}, e, { data: data.data })
                  var textBody =
                    data.message.textBody &&
                    Notification.mailMerge(
                      data.message.textBody,
                      tokenData,
                      ctx
                    )
                  switch (e.channel) {
                    case 'sms':
                      Notification.sendSMS(
                        e.userChannelId,
                        textBody,
                        notificationMsgCB
                      )
                      break
                    default:
                      var subject =
                        data.message.subject &&
                        Notification.mailMerge(
                          data.message.subject,
                          tokenData,
                          ctx
                        )
                      var htmlBody =
                        data.message.htmlBody &&
                        Notification.mailMerge(
                          data.message.htmlBody,
                          tokenData,
                          ctx
                        )
                      Notification.sendEmail(
                        data.message.from,
                        e.userChannelId,
                        subject,
                        textBody,
                        htmlBody,
                        notificationMsgCB
                      )
                  }
                })
                return a
              }, [])
              parallel(tasks, function(err, res) {
                if (
                  !data.asyncBroadcastPushNotification ||
                  typeof ctx.args.start === 'number'
                ) {
                  cb(err, _.compact(res))
                } else {
                  if (err) {
                    data.state = 'error'
                  } else {
                    data.state = 'sent'
                  }
                  data.save(function(errSave) {
                    if (
                      typeof data.asyncBroadcastPushNotification === 'string'
                    ) {
                      let options = {
                        uri: data.asyncBroadcastPushNotification,
                        headers: {
                          'Content-Type': 'application/json'
                        },
                        json: data
                      }
                      request.post(options)
                    }
                  })
                }
              })
            }
          )
        }
        if (typeof startIdx !== 'number') {
          Notification.app.models.Subscription.count(
            {
              serviceName: data.serviceName,
              state: 'confirmed',
              channel: data.channel
            },
            function(err, count) {
              if (count <= broadcastSubscriberChunkSize) {
                startIdx = 0
                broadcastToChunkSubscribers()
              } else {
                // call broadcastToChunkSubscribers, coordinate output
                let chunks = Math.ceil(count / broadcastSubscriberChunkSize)
                let httpHost = Notification.app.get('internalHttpHost')
                if (!httpHost) {
                  httpHost = ctx.req.protocol + '://' + ctx.req.get('host')
                }

                let q = queue(function(task, cb) {
                  let uri =
                    httpHost +
                    Notification.app.get('restApiRoot') +
                    '/notifications/' +
                    data.id +
                    '/broadcastToChunkSubscribers?start=' +
                    task.startIdx
                  let options = {
                    json: true,
                    uri: uri
                  }
                  request.get(options, function(error, response, body) {
                    if (!error && response.statusCode === 200) {
                      return cb && cb(body)
                    }
                    Notification.app.models.Subscription.find(
                      {
                        where: {
                          serviceName: data.serviceName,
                          state: 'confirmed',
                          channel: data.channel
                        },
                        order: 'created ASC',
                        skip: startIdx,
                        limit: broadcastSubscriberChunkSize,
                        fields: { userChannelId: true }
                      },
                      function(err, subs) {
                        return cb && cb(err || subs.map(e => e.userChannelId))
                      }
                    )
                  })
                }, broadcastSubRequestBatchSize)
                q.drain = function() {
                  if (!data.asyncBroadcastPushNotification) {
                    cb()
                  } else {
                    if (data.state !== 'error') {
                      data.state = 'sent'
                    }
                    data.save(function(errSave) {
                      if (
                        typeof data.asyncBroadcastPushNotification === 'string'
                      ) {
                        let options = {
                          uri: data.asyncBroadcastPushNotification,
                          headers: {
                            'Content-Type': 'application/json'
                          },
                          json: data
                        }
                        request.post(options)
                      }
                    })
                  }
                }
                let queuedTasks = [],
                  i = 0
                while (i < chunks) {
                  queuedTasks.push({
                    startIdx: i * broadcastSubscriberChunkSize
                  })
                  i++
                }
                q.push(queuedTasks, function(errorWhenSendingToUsers) {
                  if (!errorWhenSendingToUsers) {
                    return
                  }
                  if (errorWhenSendingToUsers instanceof Array) {
                    if (errorWhenSendingToUsers.length <= 0) {
                      return
                    }
                    data.errorWhenSendingToUsers = (data.errorWhenSendingToUsers ||
                      [])
                      .concat(errorWhenSendingToUsers)
                  } else {
                    data.state = 'error'
                  }
                })
              }
            }
          )
          if (data.asyncBroadcastPushNotification) {
            cb(null)
          }
        } else {
          broadcastToChunkSubscribers()
        }
        break
    }
  }

  /**
   * dispatch broadcast notifications to a chunk of subscribers
   * @param {number} start start index
   * @param {Function(Error, array)} callback
   */

  Notification.prototype.broadcastToChunkSubscribers = function(
    options,
    start,
    callback
  ) {
    sendPushNotification(options.httpContext, this, (err, data) => {
      callback(err, data)
    })
  }
}
