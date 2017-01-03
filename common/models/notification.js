var parallelLimit = require('async/parallelLimit')
var LoopBackContext = require('loopback-context')
var disableAllMethods = require('../helpers.js').disableAllMethods
var _ = require('lodash')
var ipRangeCheck = require("ip-range-check")

module.exports = function (Notification) {
  disableAllMethods(Notification, ['find', 'create', 'updateAttributes', 'deleteItemById'])

  Notification.observe('access', function (ctx, next) {
    var httpCtx = LoopBackContext.getCurrentContext().get('http')
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

  Notification.beforeRemote('create', function (ctx, unused, next) {
    if (!Notification.isAdminReq(ctx)) {
      var error = new Error('Forbidden')
      error.status = 403
      return next(error)
    }

    var data = ctx.args.data
    if (data.channel === 'inApp' || data.skipSubscriptionConfirmationCheck || !data.userChannelId) {
      return next()
    }
    // validate userChannelId of a unicast push notification against subscription data
    Notification.app.models.Subscription.find({
      where: {
        serviceName: data.serviceName,
        state: 'confirmed',
        channel: data.channel,
        // todo: email address check should be case insensitive
        userChannelId: data.userChannelId
      }
    }, function (err, subscribers) {
      if (err || subscribers.length === 0) {
        var error = new Error('invalid userChannelId')
        error.status = 403
        return next(error)
      }
      else {
        return next()
      }
    })
  })

  Notification.afterRemote('create', function (ctx, res, next) {
    // send non-inApp notifications immediately
    switch (res.channel) {
      case 'email':
      case 'sms':
        sendPushNotification(res, function (errSend) {
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
  })
  Notification.beforeRemote('prototype.updateAttributes', function (ctx, instance, next) {
      // only allow changing state for non-admin requests
      if (!Notification.isAdminReq(ctx)) {
        ctx.args.data = ctx.args.data.state ? {state: ctx.args.data.state} : null
      }
      if (ctx.instance.isBroadcast) {
        var httpCtx = LoopBackContext.getCurrentContext().get('http')
        var currUser = Notification.getCurrentUser(httpCtx) || 'unknown'
        switch (ctx.args.data.state) {
          case 'read':
            ctx.args.data.readBy = instance.readBy || []
            if (ctx.args.data.readBy.indexOf(currUser) <= 0) {
              ctx.args.data.readBy.push(currUser)
            }
            break
          case 'deleted':
            ctx.args.data.deletedBy = instance.deletedBy || []
            if (ctx.args.data.deletedBy.indexOf(currUser) <= 0) {
              ctx.args.data.deletedBy.push(currUser)
            }
            break
        }
        delete ctx.args.data.state
      }
      next()
    }
  )
  Notification.afterRemote('prototype.updateAttributes', function (ctx, output, next) {
    // don't return the update
    ctx.result = {}
    next()
  })

  Notification.prototype.deleteItemById = function (callback) {
    if (this.isBroadcast) {
      this.deletedBy = this.deletedBy || []
      var httpCtx = LoopBackContext.getCurrentContext().get('http')
      var currUser = Notification.getCurrentUser(httpCtx) || 'unknown'
      if (this.deletedBy.indexOf(currUser) < 0) {
        this.deletedBy.push(currUser)
      }
    }
    else {
      this.state = 'deleted'
    }
    Notification.replaceById(this.id, this, function (err, res) {
      callback(err, 1)
    })
  }

  Notification.sendEmail = function (from, to, subject, textBody, htmlBody, cb) {
    var nodemailer = require('nodemailer')
    var transporter = nodemailer.createTransport(Notification.app.get('smtp'))
    var mailOptions = {
      from: from,
      to: to,
      subject: subject,
      text: textBody,
      html: htmlBody
    }
    transporter.sendMail(mailOptions, cb)
  }

  Notification.sendSMS = function (to, textBody, cb) {
    var smsServiceProvider = Notification.app.get('smsServiceProvider')
    switch (smsServiceProvider) {
      default:
        // Twilio Credentials
        var smsConfig = Notification.app.get('sms')[smsServiceProvider]
        var accountSid = smsConfig.accountSid
        var authToken = smsConfig.authToken

        //require the Twilio module and create a REST client
        var client = require('twilio')(accountSid, authToken)

        client.messages.create({
          to: to,
          from: smsConfig.fromNumber,
          body: textBody,
        }, function (err, message) {
          cb(err, message)
        })
    }
  }

  function sendPushNotification(data, cb) {
    switch (data.isBroadcast) {
      case false:
        switch (data.channel) {
          case 'sms':
            Notification.sendSMS(data.userChannelId,
              data.message.textBody, cb)
            break
          default:
            Notification.sendEmail(data.message.from || 'unknown@unknown.com',
              data.userChannelId, data.message.subject,
              data.message.textBody, data.message.htmlBody, cb)
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
              switch (e.channel) {
                case 'sms':
                  Notification.sendSMS(e.userChannelId,
                    data.message.textBody, notificationMsgCB)
                  break
                default:
                  Notification.sendEmail(data.message.from || 'unknown@unknown.com',
                    e.userChannelId, data.message.subject,
                    data.message.textBody, data.message.htmlBody, notificationMsgCB)
              }
            }
          })
          parallelLimit(tasks, Notification.app.get('broadcastNotificationTaskConcurrency') || 100, function (err, res) {
            cb(err)
          })
        })
        break
    }
  }

  Notification.getCurrentUser = function (httpCtx) {
    var currUser = httpCtx && (httpCtx.req.get('sm_user') || httpCtx.req.get('smgov_userdisplayname'))
    var siteMinderReverseProxyIps = Notification.app.get('siteMinderReverseProxyIps')
    if (!siteMinderReverseProxyIps || siteMinderReverseProxyIps.length <= 0) {
      return currUser
    }
    // rely on express 'trust proxy' settings to obtain real ip
    var realIp = httpCtx.req.ip
    var isFromSM = siteMinderReverseProxyIps.some(function (e) {
      return ipRangeCheck(realIp, e)
    })
    return isFromSM ? currUser : null
  }

  Notification.isAdminReq = function (httpCtx) {
    var currUser = Notification.getCurrentUser(httpCtx)
    if (currUser) return false
    var adminIps = Notification.app.get('adminIps')
    if (adminIps) {
      return adminIps.some(function (e, i) {
        return ipRangeCheck(httpCtx.req.ip, e)
      })
    }
    return false
  }
}
