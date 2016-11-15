const path = require('path')
var rsaPath = path.resolve(__dirname, '../../server/boot/rsa.js')
var rsa = require(rsaPath)
var RandExp = require('randexp')
var LoopBackContext = require('loopback-context')
var disableAllMethods = require('../helpers.js').disableAllMethods

module.exports = function (Subscription) {
  disableAllMethods(Subscription, ['find', 'create', 'updateAttributes', 'deleteItemById', 'verify'])
  Subscription.observe('access', function (ctx, next) {
    var httpCtx = LoopBackContext.getCurrentContext().get('http')
    var u = Subscription.app.models.Notification.getCurrentUser(httpCtx)
    if (u) {
      ctx.query.where = ctx.query.where || {}
      ctx.query.where.userId = u
      ctx.query.where.state = {neq: 'deleted'}
    }
    next()
  })

  Subscription.beforeRemote('find', function () {
    var ctx = arguments[0]
    var next = arguments[arguments.length - 1]
    if (Subscription.app.models.Notification.isAdminReq(ctx)) {
      return next()
    }
    var u = Subscription.app.models.Notification.getCurrentUser(ctx)
    if (u) {
      return next()
    }
    // anonymous user requests are not allowed to read subscriptions
    var error = new Error('Forbidden')
    error.status = 403
    return next(error)
  })

  /**
   * hide confirmation request field, especially confirmation code
   */
  Subscription.afterRemote('**', function () {
    var ctx = arguments[0]
    var next = arguments[arguments.length - 1]
    if (arguments.length <= 2) {
      next()
    }
    var data = arguments[1]
    if (!data) {
      next()
    }
    var u = Subscription.app.models.Notification.getCurrentUser(ctx)
    if (u) {
      if (data instanceof Array) {
        data.forEach(function (e) {
          e.confirmationRequest = undefined
        })
      }
      else {
        data.confirmationRequest = undefined
      }
    }
    next()
  })

  function handleConfirmationRequest(data, cb) {
    if (data.confirmationRequest.confirmationCodeEncrypted) {
      var key = rsa.key
      var decrypted
      try {
        decrypted = key.decrypt(data.confirmationRequest.confirmationCodeEncrypted, 'utf8')
      }
      catch (ex) {
        return cb(ex, null)
      }
      var decryptedData = decrypted.split(' ')
      data.userChannelId = decryptedData[0]
      data.confirmationRequest.confirmationCode = decryptedData[1]
    }
    else {
      data.confirmationRequest.confirmationCode = ''
      if (data.confirmationRequest.confirmationCodeRegex) {
        var confirmationCodeRegex = new RegExp(data.confirmationRequest.confirmationCodeRegex)
        data.confirmationRequest.confirmationCode += new RandExp(confirmationCodeRegex).gen()
      }
      var confirmationCodeSuffixRegexStr = Subscription.app.get('confirmationCodeSuffixRegex')
      if (confirmationCodeSuffixRegexStr) {
        var confirmationCodeSuffixRegex = new RegExp(confirmationCodeSuffixRegexStr)
        data.confirmationRequest.confirmationCode += new RandExp(confirmationCodeSuffixRegex).gen()
      }
    }
    if (!data.confirmationRequest.sendRequest) {
      cb(null, null)
    }
    var mailSubject = data.confirmationRequest.subject && data.confirmationRequest.subject.replace(/\{confirmation_code\}/i, data.confirmationRequest.confirmationCode)
    var mailTextBody = data.confirmationRequest.textBody && data.confirmationRequest.textBody.replace(/\{confirmation_code\}/i, data.confirmationRequest.confirmationCode)
    var mailHtmlBody = data.confirmationRequest.htmlBody && data.confirmationRequest.htmlBody.replace(/\{confirmation_code\}/i, data.confirmationRequest.confirmationCode)
    Subscription.app.models.Notification.sendEmail(data.confirmationRequest.from, data.userChannelId, mailSubject,
      mailTextBody, mailHtmlBody, cb)
  }

  Subscription.beforeRemote('create', function (ctx, unused, next) {
    var u = Subscription.app.models.Notification.getCurrentUser(ctx)
    if (u) {
      ctx.args.data.userId = u
      if (!ctx.args.data.confirmationRequest) {
        // online channel must have confirmationRequest
        var error = new Error('Forbidden')
        error.status = 403
        return next(error)
      }
    }
    // this can only come from admin channel
    return next()
  })

  Subscription.afterRemote('create', function (ctx, res, next) {
    if (!ctx.args.data.confirmationRequest) {
      return next()
    }
    handleConfirmationRequest(res, function (handleConfirmationRequestError, info) {
      res.save(function (saveError) {
        next(handleConfirmationRequestError || saveError)
      })
    })
  })


  Subscription.beforeRemote('deleteItemById', function (ctx, unused, next) {
    var u = Subscription.app.models.Notification.getCurrentUser(ctx) || 'unknown'
    Subscription.findById(ctx.args.id, null, null, function (err, data) {
      if (data.userId === u) {
        return next()
      }
      var error = new Error('Forbidden')
      error.status = 403
      next(error)
    })
  })

  Subscription.beforeRemote('prototype.updateAttributes', function (ctx, instance, next) {
      var currUser = Subscription.app.models.Notification.getCurrentUser(ctx)
      if (currUser) {
        ctx.args.data.userId = currUser
        if (!ctx.args.data.confirmationRequest) {
          // online channel must have confirmationRequest
          var error = new Error('Forbidden')
          error.status = 403
          return next(error)
        }
        ctx.args.data.state = 'unconfirmed'
      }
      // this can only come from admin channel
      return next()
    }
  )
  Subscription.afterRemote('prototype.updateAttributes', function (ctx, instance, next) {
    if (!ctx.args.data.confirmationRequest) {
      return next()
    }
    handleConfirmationRequest(instance, function (handleConfirmationRequestError, info) {
      instance.save(function (saveError) {
        next(handleConfirmationRequestError || saveError)
      })
    })
  })

  Subscription.prototype.deleteItemById = function (callback) {
    this.state = 'deleted'
    Subscription.replaceById(this.id, this, function (err, res) {
      callback(err, 1)
    })
  }

  Subscription.prototype.verify = function (confirmationCode, callback) {
    var error
    if (confirmationCode !== this.confirmationRequest.confirmationCode) {
      error = new Error('Forbidden')
      error.status = 403
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
