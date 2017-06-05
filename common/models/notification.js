'use strict'

var parallelLimit = require('async/parallelLimit')
var disableAllMethods = require('../helpers.js').disableAllMethods
var _ = require('lodash')

module.exports = function (Notification) {
  disableAllMethods(Notification, ['find', 'create', 'patchAttributes', 'deleteItemById'])

  Notification.observe('access', function (ctx, next) {
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
    }
    else if (!Notification.isAdminReq(httpCtx)) {
      var error = new Error('Forbidden')
      error.status = 403
      return next(error)
    }
    next()
  })

  Notification.afterRemote('find', function (ctx, res, next) {
    if (!res) {
      return
    }
    var currUser = Notification.getCurrentUser(ctx)
    if (currUser) {
      ctx.result = res.reduce(function (p, e, i) {
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

  Notification.preCreationValidation = function () {
    let ctx = arguments[0]
    let next = arguments[arguments.length - 1]
    let error
    if (!Notification.isAdminReq(ctx)) {
      error = new Error('Forbidden')
      error.status = 403
      return next(error)
    }

    var data = ctx.args.data
    if (!data.isBroadcast && data.skipSubscriptionConfirmationCheck && !data.userChannelId) {
      error = new Error('invalid user')
      error.status = 403
      return next(error)
    }
    if (!data.httpHost && data.channel !== 'inApp') {
      if (data.invalidBefore && Date.parse(data.invalidBefore) > new Date()) {
        if (ctx.req) {
          data.httpHost = ctx.req.protocol + '://' + ctx.req.get('host')
        }
      }
    }
    if (data.channel === 'inApp' || data.skipSubscriptionConfirmationCheck || data.isBroadcast) {
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
      channel: data.channel,
    }
    if (data.userChannelId) {
      // email address check should be case insensitive
      var escapedUserChannelId = data.userChannelId.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
      var escapedUserChannelIdRegExp = new RegExp(escapedUserChannelId, "i")
      whereClause.userChannelId = {regexp: escapedUserChannelIdRegExp}
    }
    if (data.userId) {
      whereClause.userId = data.userId
    }

    Notification.app.models.Subscription.findOne({
      where: whereClause
    }, function (err, subscription) {
      if (err || !subscription) {
        var error = new Error('invalid user')
        error.status = 403
        return next(error)
      }
      else {
        // in case request supplies userId instead of userChannelId
        data.userChannelId = subscription.userChannelId
        ctx.subscription = subscription
        return next()
      }
    })
  }

  Notification.beforeRemote('create', Notification.preCreationValidation)

  Notification.dispatchNotification = function (ctx, res, next) {
    // send non-inApp notifications immediately
    switch (res.channel) {
      case 'email':
      case 'sms':
        if (res.invalidBefore && Date.parse(res.invalidBefore) > new Date()) {
          return next()
        }
        sendPushNotification(ctx, res, function (errSend) {
          if (errSend) {
            res.state = 'error'
          }
          else {
            res.state = 'sent'
          }
          res.save(function (errSave) {
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
      ctx.args.data = {state: 'deleted'}
    }
    // only allow changing state for non-admin requests
    if (!Notification.isAdminReq(ctx)) {
      var currUser = Notification.getCurrentUser(ctx)
      if (!currUser) {
        var error = new Error('Forbidden')
        error.status = 403
        return next(error)
      }
      ctx.args.data = ctx.args.data.state ? {state: ctx.args.data.state} : null
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
  Notification.prototype.deleteItemById = function (options, callback) {
    this.patchAttributes(options.httpContext.args.data, options, callback)
  }

  function sendPushNotification(ctx, data, cb) {
    switch (data.isBroadcast) {
      case false:
        var textBody = data.message.textBody && Notification.mailMerge(data.message.textBody, ctx.subscription, ctx)
        switch (data.channel) {
          case 'sms':
            Notification.sendSMS(data.userChannelId,
              textBody, cb)
            break
          default:
            var htmlBody = data.message.htmlBody && Notification.mailMerge(data.message.htmlBody, ctx.subscription, ctx)
            var subject = data.message.subject && Notification.mailMerge(data.message.subject, ctx.subscription, ctx)
            Notification.sendEmail(data.message.from,
              data.userChannelId, subject,
              textBody, htmlBody, cb)
        }
        break
      case true:
        Notification.app.models.Subscription.find({
          where: {
            serviceName: data.serviceName,
            state: 'confirmed',
            channel: data.channel
          }
        }, function (err, subscribers) {
          var tasks = subscribers.map(function (e, i) {
            return function (cb) {
              var notificationMsgCB = function (err) {
                if (err) {
                  data.errorWhenSendingToUsers = data.errorWhenSendingToUsers || []
                  try {
                    data.errorWhenSendingToUsers.push(e.userChannelId)
                  }
                  catch (ex) {
                  }
                }
                cb(null)
              }
              var textBody = data.message.textBody && Notification.mailMerge(data.message.textBody, e, ctx)
              switch (e.channel) {
                case 'sms':
                  Notification.sendSMS(e.userChannelId,
                    textBody, notificationMsgCB)
                  break
                default:
                  var subject = data.message.subject && Notification.mailMerge(data.message.subject, e, ctx)
                  var htmlBody = data.message.htmlBody && Notification.mailMerge(data.message.htmlBody, e, ctx)
                  Notification.sendEmail(data.message.from,
                    e.userChannelId, subject,
                    textBody, htmlBody, notificationMsgCB)
              }
            }
          })
          parallelLimit(tasks, (Notification.app.get('notification') && Notification.app.get('notification').broadcastTaskConcurrency) || 100, function (err, res) {
            cb(err)
          })
        })
        break
    }
  }
}
