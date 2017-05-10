const path = require('path')
var rsaPath = path.resolve(__dirname, '../../server/boot/rsa.js')
var rsa = require(rsaPath)
var RandExp = require('randexp')
var disableAllMethods = require('../helpers.js').disableAllMethods

module.exports = function (Subscription) {
  disableAllMethods(Subscription, ['find', 'create', 'patchAttributes', 'deleteItemById', 'verify'])

  // centralized callback for customized access control of endpoint
  Subscription.beforeRemote('**', function checkAccess() {
    // Since this callback acts on all methods, we have to support
    // different param (ctx, next) and (ctx, modelInstance, next) (for create)
    var ctx = arguments[0]
    var next = arguments[arguments.length - 1]

    var method = ctx.req.method
    var userId = Subscription.app.models.Notification.getCurrentUser(ctx)
    if (Subscription.app.models.Notification.isAdminReq(ctx)) {
      return next()
    }

    if (userId) {
      // siteminder user requestId
      // here we whitelist the available access control for siteminder user
      switch (method) {
        case 'GET':
          return next()
          break
        case 'POST':
        case 'PATCH':
          if (ctx.args.data.confirmationRequest) {
            return next()
          }
          break
        case 'DELETE':
          if (ctx.instance.userId === userId) {
            return next()
          }
          break
      }
    }

    if (ctx.methodString === 'subscription.prototype.verify') {
      return next()
    }

    // if we get here, the request is a siteminder user that does not
    // match the criteria above OR an anonymous user
    var error = new Error('Forbidden')
    error.status = 403
    return next(error)
  })

  Subscription.observe('access', function (ctx, next) {
    var u = Subscription.getCurrentUser(ctx.options.httpContext)
    if (u) {
      ctx.query.where = ctx.query.where || {}
      ctx.query.where.userId = u
      ctx.query.where.state = {neq: 'deleted'}
    }
    next()
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
    var u = Subscription.getCurrentUser(ctx)
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

  function handleConfirmationRequest(ctx, data, cb) {
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
      return cb(null, null)
    }
    var textBody = data.confirmationRequest.textBody && data.confirmationRequest.textBody.replace(/\{confirmation_code\}/i, data.confirmationRequest.confirmationCode)
    switch (data.channel) {
      case 'sms':
        Subscription.sendSMS(data.userChannelId, textBody, cb)
        break
      default:
        var mailSubject = data.confirmationRequest.subject && data.confirmationRequest.subject.replace(/\{confirmation_code\}/i, data.confirmationRequest.confirmationCode)
        var mailHtmlBody = data.confirmationRequest.htmlBody && data.confirmationRequest.htmlBody.replace(/\{confirmation_code\}/i, data.confirmationRequest.confirmationCode)
        Subscription.sendEmail(data.confirmationRequest.from, data.userChannelId, mailSubject,
          textBody, mailHtmlBody, cb)
    }
  }

  Subscription.beforeRemote('create', function (ctx, unused, next) {
    var userId = Subscription.getCurrentUser(ctx)
    if (userId) {
      ctx.args.data.userId = userId
    }
    // this can only come from admin channel
    return next()
  })

  Subscription.afterRemote('create', function (ctx, res, next) {
    if (!ctx.args.data.confirmationRequest) {
      return next()
    }
    handleConfirmationRequest(ctx, res, function (handleConfirmationRequestError, info) {
      res.save(function (saveError) {
        next(handleConfirmationRequestError || saveError)
      })
    })
  })

  Subscription.beforeRemote('prototype.patchAttributes', function () {
    var ctx = arguments[0]
    var next = arguments[arguments.length - 1]
    if (Subscription.isAdminReq(ctx)) {
      return next()
    }
    var userId = Subscription.getCurrentUser(ctx)
    var filteredData = {}
    filteredData.userChannelId = ctx.args.data.userChannelId
    filteredData.confirmationRequest = ctx.args.data.confirmationRequest
    if (filteredData.userChannelId !== ctx.instance.userChannelId) {
      filteredData.state = 'unconfirmed'
    }
    ctx.args.data = filteredData
    if (userId) {
      ctx.args.data.userId = userId
    }
    return next()
  })

  Subscription.afterRemote('prototype.patchAttributes', function (ctx, instance, next) {
    if (!ctx.args.data.confirmationRequest) {
      return next()
    }
    handleConfirmationRequest(ctx, instance, function (handleConfirmationRequestError, info) {
      instance.save(function (saveError) {
        next(handleConfirmationRequestError || saveError)
      })
    })
  })

  Subscription.prototype.deleteItemById = function () {
    var cb = arguments[arguments.length - 1]
    this.state = 'deleted'
    Subscription.replaceById(this.id, this, function (err, res) {
      cb(err, 1)
    })
  }

  Subscription.prototype.verify = function (confirmationCode, cb) {
    var error
    if (this.state !== 'unconfirmed'
      || confirmationCode !== this.confirmationRequest.confirmationCode) {
      error = new Error('Forbidden')
      error.status = 403
      return cb(error, "OK")
    }
    this.state = 'confirmed'
    Subscription.replaceById(this.id, this, function (err, res) {
      return cb(err, "OK")
    })
  }
}
