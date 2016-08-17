module.exports = function (Subscription) {
  Subscription.disableRemoteMethod('findOne', true)
  Subscription.disableRemoteMethod('findById', true)
  Subscription.disableRemoteMethod('createChangeStream', true)
  Subscription.disableRemoteMethod('exists', true)
  Subscription.disableRemoteMethod('updateAll', true)
  Subscription.disableRemoteMethod('count', true)
  Subscription.disableRemoteMethod('upsert', true)
  Subscription.disableRemoteMethod('deleteById', true)

  Subscription.observe('access', function (ctx, next) {
    var httpCtx = require('loopback').getCurrentContext()
    var u = httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname')
    if (u) {
      ctx.query.where = ctx.query.where || {}
      ctx.query.where.userId = u
      ctx.query.where.state = {neq: 'deleted'}
    }
    next()
  })

  function sendConfirmationRequest(data, cb) {
    // if contains confirmationRequest, send it
    var nodemailer = require('nodemailer')
    var transporter = nodemailer.createTransport('direct:?name=localhost')
    if (data.confirmationRequest.confirmationCodeRegex) {
      var RandExp = require('randexp')
      var confirmationCodeRegex = new RegExp(data.confirmationRequest.confirmationCodeRegex)
      data.confirmationRequest.confirmationCode = new RandExp(confirmationCodeRegex).gen()
    }
    var mailSubject = data.confirmationRequest.subject && data.confirmationRequest.subject.replace(/\{confirmation_code\}/i, data.confirmationRequest.confirmationCode)
    var mailTextBody = data.confirmationRequest.textBody && data.confirmationRequest.textBody.replace(/\{confirmation_code\}/i, data.confirmationRequest.confirmationCode)
    var mailHtmlBody = data.confirmationRequest.htmlBody && data.confirmationRequest.htmlBody.replace(/\{confirmation_code\}/i, data.confirmationRequest.confirmationCode)
    var mailOptions = {
      from: data.confirmationRequest.from,
      to: data.channelId,
      subject: mailSubject,
      text: mailTextBody,
      html: mailHtmlBody
    }
    transporter.sendMail(mailOptions, cb)
  }

  Subscription.beforeRemote('create', function (ctx, unused, next) {
    var u = ctx.req.get('sm_user') || ctx.req.get('smgov_userdisplayname') || 'unknown'
    ctx.args.data.userId = u
    if (!ctx.args.data.confirmationRequest) {
      return next()
    }
    sendConfirmationRequest(ctx.args.data, function (error, info) {
      if (error) {
        console.log(error)
      }
      else {
        console.log('Message sent: ' + info.response)
      }
      next()
    })
  })

  Subscription.beforeRemote('deleteById', function (ctx, unused, next) {
    var u = ctx.req.get('sm_user') || ctx.req.get('smgov_userdisplayname') || 'unknown'
    Subscription.findById(ctx.args.id, null, null, function (err, data) {
      if (data.userId === u) {
        return next()
      }
      var error = new Error('Unauthorized')
      error.status = 401
      next(error)
    })
  })

  Subscription.beforeRemote('prototype.updateAttributes', function (ctx, instance, next) {
      var httpCtx = require('loopback').getCurrentContext()
      var currUser = httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname')
      if (currUser) {
        ctx.args.data.userId = currUser
      }
      if (!ctx.args.data.confirmationRequest) {
        return next()
      }
      sendConfirmationRequest(ctx.args.data, function (error, info) {
        if (error) {
          console.log(error)
        }
        else {
          console.log('Message sent: ' + info.response)
        }
        next()
      })
    }
  )

  Subscription.prototype.deleteById = function (callback) {
    this.state = 'deleted'
    Subscription.replaceById(this.id, this, function (err, res) {
      callback(err, 1)
    })
  }

  Subscription.prototype.verify = function (confirmationCode, callback) {
    var error
    if (confirmationCode !== this.confirmationRequest.confirmationCode) {
      error = new Error('Unauthorized')
      error.status = 401
      return callback(error, "OK")
    }
    else {
      this.state = 'confirmed'
      Subscription.replaceById(this.id, this, function (err, res) {
        return callback(err, "OK")
      })
    }
  }
}
