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

  Subscription.beforeRemote('create', function (ctx, unused, next) {
    var u = ctx.req.get('sm_user') || ctx.req.get('smgov_userdisplayname') || 'unknown'
    ctx.args.data.userId = u
    if (!ctx.args.data.confirmationRequest) {
      return next()
    }

    // if contains confirmationRequest, send it
    var nodemailer = require('nodemailer')
    var transporter = nodemailer.createTransport('direct:?name=localhost')
    if (ctx.args.data.confirmationRequest.confirmationCodeRegex) {
      var RandExp = require('randexp')
      var confirmationCodeRegex = new RegExp(ctx.args.data.confirmationRequest.confirmationCodeRegex)
      ctx.args.data.confirmationRequest.confirmationCode = new RandExp(confirmationCodeRegex).gen()
    }
    var mailSubject = ctx.args.data.confirmationRequest.subject && ctx.args.data.confirmationRequest.subject.replace(/\{confirmation_code\}/i, ctx.args.data.confirmationRequest.confirmationCode)
    var mailTextBody = ctx.args.data.confirmationRequest.textBody && ctx.args.data.confirmationRequest.textBody.replace(/\{confirmation_code\}/i, ctx.args.data.confirmationRequest.confirmationCode)
    var mailHtmlBody = ctx.args.data.confirmationRequest.htmlBody && ctx.args.data.confirmationRequest.htmlBody.replace(/\{confirmation_code\}/i, ctx.args.data.confirmationRequest.confirmationCode)
    var mailOptions = {
      from: ctx.args.data.confirmationRequest.from,
      to: ctx.args.data.channelId,
      subject: mailSubject,
      text: mailTextBody,
      html: mailHtmlBody
    }
    transporter.sendMail(mailOptions, function (error, info) {
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
      next()
    }
  )

  Subscription.prototype.deleteById = function (callback) {
    this.state = 'deleted'
    Subscription.replaceById(this.id, this, function (err, res) {
      callback(err, 1)
    })
  }
}
