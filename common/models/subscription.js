const path = require('path')
var rsaPath = path.resolve(__dirname, '../../server/boot/rsa.js')
var rsa = require(rsaPath)
var RandExp = require('randexp')
var disableAllMethods = require('../helpers.js').disableAllMethods
var _ = require('lodash')


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
        case 'POST':
        case 'PATCH':
          return next()
          break
        case 'DELETE':
          if (ctx.instance.userId === userId) {
            return next()
          }
          break
      }
    }
    else {
      switch (ctx.methodString) {
        case 'subscription.create':
        case 'subscription.prototype.verify':
        case 'subscription.prototype.deleteItemById':
          return next()
          break
      }
    }

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
      return next()
    }
    var data = arguments[1]
    if (!data) {
      return next()
    }
    if (!Subscription.isAdminReq(ctx)) {
      if (data instanceof Array) {
        data.forEach(function (e) {
          e.confirmationRequest = undefined
        })
      }
      else if (data instanceof Object) {
        data.confirmationRequest = undefined
      }
    }
    return next()
  })

  function handleConfirmationRequest(ctx, data, cb) {
    if (data.state !== 'unconfirmed' || !data.confirmationRequest.sendRequest) {
      return cb(null, null)
    }
    var textBody = data.confirmationRequest.textBody && Subscription.mailMerge(data.confirmationRequest.textBody, data, ctx)
    switch (data.channel) {
      case 'sms':
        Subscription.sendSMS(data.userChannelId, textBody, cb)
        break
      default:
        var mailSubject = data.confirmationRequest.subject && Subscription.mailMerge(data.confirmationRequest.subject, data, ctx)
        var mailHtmlBody = data.confirmationRequest.htmlBody && Subscription.mailMerge(data.confirmationRequest.htmlBody, data, ctx)
        Subscription.sendEmail(data.confirmationRequest.from, data.userChannelId, mailSubject,
          textBody, mailHtmlBody, cb)
    }
  }

  function beforeUpsert(ctx, unused, next) {
    var userId = Subscription.getCurrentUser(ctx)
    var data = ctx.args.data
    if (userId) {
      data.userId = userId
    }
    else if (!Subscription.isAdminReq(ctx)) {
      // generate unsubscription code
      var anonymousUnsubscription = Subscription.app.get('anonymousUnsubscription')
      if (anonymousUnsubscription.code && anonymousUnsubscription.code.required) {
        var unsubscriptionCodeRegex = new RegExp(anonymousUnsubscription.code.regex)
        data.unsubscriptionCode = new RandExp(unsubscriptionCodeRegex).gen()
      }
    }
    if (data.confirmationRequest && data.confirmationRequest.confirmationCodeEncrypted) {
      var key = rsa.key
      var decrypted
      try {
        decrypted = key.decrypt(data.confirmationRequest.confirmationCodeEncrypted, 'utf8')
      }
      catch (ex) {
        return next(ex, null)
      }
      var decryptedData = decrypted.split(' ')
      data.userChannelId = decryptedData[0]
      data.confirmationRequest.confirmationCode = decryptedData[1]
      return next()
    }
    // use request without encrypted payload
    Subscription.app.models.Configuration.findOne({
      where: {
        name: 'subscriptionConfirmationRequest',
        serviceName: data.serviceName
      }
    }, (err, overrideConfirmationRequest) => {
      if (err) {
        return next(err)
      }
      if (!Subscription.isAdminReq(ctx) || !data.confirmationRequest) {

        try {
          data.confirmationRequest = _.merge({}, Subscription.app.get("subscriptionConfirmationRequest")[data.channel])
        }
        catch (ex) {
        }
        try {
          data.confirmationRequest = _.merge({}, data.confirmationRequest, overrideConfirmationRequest.value[data.channel])
        }
        catch (ex) {
        }
        data.confirmationRequest.confirmationCode = ''
      }
      if (data.confirmationRequest.confirmationCodeRegex) {
        var confirmationCodeRegex = new RegExp(data.confirmationRequest.confirmationCodeRegex)
        data.confirmationRequest.confirmationCode += new RandExp(confirmationCodeRegex).gen()
      }
      return next()
    })
  }

  Subscription.beforeRemote('create', function () {
    var ctx = arguments[0]
    delete ctx.args.data.state
    delete ctx.args.data.id
    beforeUpsert.apply(null, arguments)
  })
  Subscription.afterRemote('create', function (ctx, res, next) {
    if (!ctx.args.data.confirmationRequest) {
      return next()
    }
    handleConfirmationRequest(ctx, res, function (handleConfirmationRequestError, info) {
      next(handleConfirmationRequestError)
    })
  })

  Subscription.beforeRemote('prototype.patchAttributes', function () {
    var ctx = arguments[0]
    var next = arguments[arguments.length - 1]
    if (Subscription.isAdminReq(ctx)) {
      return next()
    }
    var filteredData = _.merge({}, ctx.instance)
    filteredData.userChannelId = ctx.args.data.userChannelId
    if (filteredData.userChannelId !== ctx.instance.userChannelId) {
      filteredData.state = 'unconfirmed'
    }
    ctx.args.data = filteredData
    beforeUpsert.apply(null, arguments)
  })

  Subscription.afterRemote('prototype.patchAttributes', function (ctx, instance, next) {
    if (!ctx.args.data.confirmationRequest) {
      return next()
    }
    handleConfirmationRequest(ctx, instance, function (handleConfirmationRequestError, info) {
      next(handleConfirmationRequestError)
    })
  })

  Subscription.prototype.deleteItemById = function (options, unsubscriptionCode, cb) {
    if (!Subscription.getCurrentUser(options.httpContext) && !Subscription.isAdminReq(options.httpContext) && this.unsubscriptionCode) {
      if (unsubscriptionCode != this.unsubscriptionCode) {
        var error = new Error('Forbidden')
        error.status = 403
        return cb(error)
      }
    }
    if (this.state !== 'confirmed' && !Subscription.isAdminReq(options.httpContext)) {
      var error = new Error('Forbidden')
      error.status = 403
      return cb(error)
    }
    this.state = 'deleted'
    Subscription.replaceById(this.id, this, function (err, res) {
      var anonymousUnsubscription = Subscription.app.get('anonymousUnsubscription')
      try {
        if (!err) {
          // send acknowledgement notification
          try {
            switch (res.channel) {
              case 'email':
                var msg = anonymousUnsubscription.acknowledgements.notification[res.channel]
                var subject = Subscription.mailMerge(msg.subject, res, options.httpContext)
                var textBody = Subscription.mailMerge(msg.textBody, res, options.httpContext)
                var htmlBody = Subscription.mailMerge(msg.htmlBody, res, options.httpContext)
                Subscription.sendEmail(msg.from, res.userChannelId, subject, textBody, htmlBody)
                break
            }
          }
          catch (ex) {
          }
        }
        if (anonymousUnsubscription.acknowledgements.onScreen.redirectUrl) {
          var redirectUrl = anonymousUnsubscription.acknowledgements.onScreen.redirectUrl
          if (err) {
            redirectUrl += '?err=' + encodeURIComponent(err)
          }
          return options.httpContext.res.redirect(redirectUrl)
        }
        else {
          if (err) {
            return cb(null, anonymousUnsubscription.acknowledgements.onScreen.failureMessage)
          }
          return cb(null, anonymousUnsubscription.acknowledgements.onScreen.successMessage)
        }
      }
      catch (ex) {
      }
      return cb(err, 1)
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
