module.exports = function (Notification) {
  Notification.disableRemoteMethod('findOne', true)
  Notification.disableRemoteMethod('findById', true)
  Notification.disableRemoteMethod('createChangeStream', true)
  Notification.disableRemoteMethod('exists', true)
  Notification.disableRemoteMethod('updateAll', true)
  //Notification.disableRemoteMethod('create', true)
  Notification.disableRemoteMethod('count', true)
  Notification.disableRemoteMethod('upsert', true)
  Notification.disableRemoteMethod('deleteById', true)

  Notification.observe('access', function (ctx, next) {
    var httpCtx = require('loopback').getCurrentContext().active.http
    ctx.query.where = ctx.query.where || {}
    var currUser = getCurrentUser(httpCtx)
    if (currUser) {
      ctx.query.where.or = []
      ctx.query.where.or.push({
        isBroadcast: true
      })
      ctx.query.where.or.push({
        userChannelId: currUser
      })
    }
    else if (!isAdminReq(httpCtx)) {
      var error = new Error('Unauthorized')
      error.status = 401
      return next(error)
    }
    next()
  })

  Notification.afterRemote('find', function (ctx, res, next) {
    if (!res) {
      return
    }
    var currUser = getCurrentUser(ctx)
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
          e.readBy = null
        }
        p.push(e)
        return p
      }, [])
    }
    next()
  })

  Notification.beforeRemote('create', function (ctx, unused, next) {
    if (!isAdminReq(ctx)) {
      var error = new Error('Unauthorized')
      error.status = 401
      return next(error)
    }
    next()
  })

  Notification.afterRemote('create', function (ctx, res, next) {
    // send non-inApp notifications immediately
    switch (res.channel) {
      case 'email':
        sendEmailNotification(res, function (errSend) {
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
      if (!isAdminReq(ctx)) {
        ctx.args.data = ctx.args.data.state ? {state: ctx.args.data.state} : null
      }
      if (ctx.instance.isBroadcast) {
        var httpCtx = require('loopback').getCurrentContext().active.http
        var currUser = getCurrentUser(httpCtx) || 'unknown'
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

  Notification.prototype.deleteById = function (callback) {
    if (this.isBroadcast) {
      this.deletedBy = this.deletedBy || []
      var httpCtx = require('loopback').getCurrentContext().active.http
      var currUser = getCurrentUser(httpCtx) || 'unknown'
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

  function sendEmailNotification(data, cb) {
    switch (data.isBroadcast) {
      case false:
        Notification.sendEmail(data.message.from || 'unknown@unknown.com'
          , data.userChannelId, data.message.subject
          , data.message.textBody, data.message.htmlBody, cb)
        break
      case true:
        // todo: handle broadcast email
        break
    }
  }

  function getCurrentUser(httpCtx) {
    return httpCtx.req.get('sm_user') || httpCtx.req.get('smgov_userdisplayname')
  }

  function isAdminReq(httpCtx) {
    var currUser = getCurrentUser(httpCtx)
    return currUser ? false : true
  }
}
