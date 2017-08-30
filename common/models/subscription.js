'use strict'
const path = require('path')
var rsaPath = path.resolve(__dirname, '../../server/boot/rsa.js')
var rsa = require(rsaPath)
var RandExp = require('randexp')
var disableAllMethods = require('../helpers.js').disableAllMethods
var _ = require('lodash')
var jmespath = require('jmespath')

module.exports = function(Subscription) {
  disableAllMethods(Subscription, [
    'find',
    'create',
    'patchAttributes',
    'deleteItemById',
    'verify'
  ])

  Subscription.beforeRemote('find', function() {
    var ctx = arguments[0]
    var next = arguments[arguments.length - 1]
    var userId = Subscription.getCurrentUser(ctx)
    if (userId || Subscription.isAdminReq(ctx)) {
      return next()
    }
    var error = new Error('Forbidden')
    error.status = 403
    return next(error)
  })

  Subscription.observe(
    'before save',
    function parseBroadcastPushNotificationFilter(ctx, next) {
      let data = ctx.instance || ctx.data
      if (!data) {
        return next()
      }
      let filter = data.broadcastPushNotificationFilter
      if (!filter) {
        return next()
      }
      if (typeof filter !== 'string') {
        let error = new Error('invalid broadcastPushNotificationFilter')
        error.status = 400
        return next(error)
      }
      filter = '[?' + filter + ']'
      try {
        jmespath.compile(filter)
      } catch (ex) {
        let error = new Error('invalid broadcastPushNotificationFilter')
        error.status = 400
        return next(error)
      }
      return next()
    }
  )

  Subscription.observe('access', function(ctx, next) {
    var u = Subscription.getCurrentUser(ctx.options.httpContext)
    if (u) {
      ctx.query.where = ctx.query.where || {}
      ctx.query.where.userId = u
      ctx.query.where.state = { neq: 'deleted' }
    }
    next()
  })

  /**
   * hide confirmation request field, especially confirmation code
   */
  Subscription.afterRemote('**', function() {
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
        data.forEach(function(e) {
          e.confirmationRequest = undefined
        })
      } else if (data instanceof Object) {
        data.confirmationRequest = undefined
      }
    }
    return next()
  })

  function handleConfirmationRequest(ctx, data, cb) {
    if (data.state !== 'unconfirmed' || !data.confirmationRequest.sendRequest) {
      return cb(null, null)
    }
    var textBody =
      data.confirmationRequest.textBody &&
      Subscription.mailMerge(data.confirmationRequest.textBody, data, ctx)
    switch (data.channel) {
      case 'sms':
        Subscription.sendSMS(data.userChannelId, textBody, cb)
        break
      default:
        var mailSubject =
          data.confirmationRequest.subject &&
          Subscription.mailMerge(data.confirmationRequest.subject, data, ctx)
        var mailHtmlBody =
          data.confirmationRequest.htmlBody &&
          Subscription.mailMerge(data.confirmationRequest.htmlBody, data, ctx)
        Subscription.sendEmail(
          data.confirmationRequest.from,
          data.userChannelId,
          mailSubject,
          textBody,
          mailHtmlBody,
          cb
        )
    }
  }

  function beforeUpsert(ctx, unused, next) {
    var data = ctx.args.data
    Subscription.getMergedConfig(
      'subscription',
      data.serviceName,
      (err, mergedSubscriptionConfig) => {
        if (err) {
          return next(err)
        }
        var userId = Subscription.getCurrentUser(ctx)
        if (userId) {
          data.userId = userId
        } else if (!Subscription.isAdminReq(ctx) || !data.unsubscriptionCode) {
          // generate unsubscription code
          var anonymousUnsubscription =
            mergedSubscriptionConfig.anonymousUnsubscription
          if (
            anonymousUnsubscription.code &&
            anonymousUnsubscription.code.required
          ) {
            var unsubscriptionCodeRegex = new RegExp(
              anonymousUnsubscription.code.regex
            )
            data.unsubscriptionCode = new RandExp(unsubscriptionCodeRegex).gen()
          }
        }
        if (
          data.confirmationRequest &&
          data.confirmationRequest.confirmationCodeEncrypted
        ) {
          var key = rsa.key
          var decrypted
          try {
            decrypted = key.decrypt(
              data.confirmationRequest.confirmationCodeEncrypted,
              'utf8'
            )
          } catch (ex) {
            return next(ex, null)
          }
          var decryptedData = decrypted.split(' ')
          data.userChannelId = decryptedData[0]
          data.confirmationRequest.confirmationCode = decryptedData[1]
          return next()
        }
        // use request without encrypted payload
        if (!Subscription.isAdminReq(ctx) || !data.confirmationRequest) {
          try {
            data.confirmationRequest =
              mergedSubscriptionConfig.confirmationRequest[data.channel]
          } catch (ex) {}
          data.confirmationRequest.confirmationCode = ''
        }
        if (data.confirmationRequest.confirmationCodeRegex) {
          var confirmationCodeRegex = new RegExp(
            data.confirmationRequest.confirmationCodeRegex
          )
          data.confirmationRequest.confirmationCode += new RandExp(
            confirmationCodeRegex
          ).gen()
        }
        return next()
      }
    )
  }

  Subscription.beforeRemote('create', function() {
    var ctx = arguments[0]
    if (!Subscription.isAdminReq(ctx)) {
      delete ctx.args.data.state
    }
    delete ctx.args.data.id
    beforeUpsert.apply(null, arguments)
  })
  Subscription.afterRemote('create', function(ctx, res, next) {
    if (!ctx.args.data.confirmationRequest) {
      return next()
    }
    handleConfirmationRequest(ctx, res, function(
      handleConfirmationRequestError,
      info
    ) {
      next(handleConfirmationRequestError)
    })
  })

  Subscription.beforeRemote('prototype.patchAttributes', function() {
    var ctx = arguments[0]
    var next = arguments[arguments.length - 1]
    if (Subscription.isAdminReq(ctx)) {
      return next()
    }
    var userId = Subscription.getCurrentUser(ctx)
    if (!userId) {
      var error = new Error('Forbidden')
      error.status = 403
      return next(error)
    }
    var filteredData = _.merge({}, ctx.instance)
    filteredData.userChannelId = ctx.args.data.userChannelId
    if (filteredData.userChannelId !== ctx.instance.userChannelId) {
      filteredData.state = 'unconfirmed'
    }
    ctx.args.data = filteredData
    beforeUpsert.apply(null, arguments)
  })

  Subscription.afterRemote('prototype.patchAttributes', function(
    ctx,
    instance,
    next
  ) {
    if (!ctx.args.data.confirmationRequest) {
      return next()
    }
    handleConfirmationRequest(ctx, instance, function(
      handleConfirmationRequestError,
      info
    ) {
      next(handleConfirmationRequestError)
    })
  })

  Subscription.prototype.deleteItemById = function(
    options,
    unsubscriptionCode,
    additionalServices,
    cb
  ) {
    if (!Subscription.isAdminReq(options.httpContext)) {
      var forbidden = false
      var userId = Subscription.getCurrentUser(options.httpContext)
      if (
        !userId &&
        this.unsubscriptionCode &&
        unsubscriptionCode !== this.unsubscriptionCode
      ) {
        forbidden = true
      }
      if (this.state !== 'confirmed') {
        forbidden = true
      }
      if (forbidden) {
        var error = new Error('Forbidden')
        error.status = 403
        return cb(error)
      }
    }
    let unsubscribeItems = (query, serviceNames) => {
      Subscription.updateAll(query, { state: 'deleted' }, (writeErr, res) => {
        Subscription.getMergedConfig(
          'subscription',
          this.serviceName,
          (configErr, mergedSubscriptionConfig) => {
            var err = writeErr || configErr
            var anonymousUnsubscription =
              mergedSubscriptionConfig &&
              mergedSubscriptionConfig.anonymousUnsubscription
            try {
              if (!err) {
                // send acknowledgement notification
                try {
                  switch (this.channel) {
                    case 'email':
                      var msg =
                        anonymousUnsubscription.acknowledgements.notification[
                          this.channel
                        ]
                      var subject = Subscription.mailMerge(
                        msg.subject,
                        this,
                        options.httpContext
                      )
                      var textBody = Subscription.mailMerge(
                        msg.textBody,
                        this,
                        options.httpContext
                      )
                      var htmlBody = Subscription.mailMerge(
                        msg.htmlBody,
                        this,
                        options.httpContext
                      )
                      Subscription.sendEmail(
                        msg.from,
                        this.userChannelId,
                        subject,
                        textBody,
                        htmlBody
                      )
                      break
                  }
                } catch (ex) {}
              }
              if (
                anonymousUnsubscription.acknowledgements.onScreen.redirectUrl
              ) {
                var redirectUrl =
                  anonymousUnsubscription.acknowledgements.onScreen.redirectUrl
                if (err) {
                  redirectUrl += '?err=' + encodeURIComponent(err)
                }
                return options.httpContext.res.redirect(redirectUrl)
              } else {
                options.httpContext.res.setHeader('Content-Type', 'text/plain')

                if (err) {
                  return options.httpContext.res.end(
                    anonymousUnsubscription.acknowledgements.onScreen
                      .failureMessage
                  )
                }
                return options.httpContext.res.end(
                  anonymousUnsubscription.acknowledgements.onScreen
                    .successMessage
                )
              }
            } catch (ex) {}
            return cb(err, 1)
          }
        )
      })
    }
    if (!additionalServices) {
      unsubscribeItems({ id: this.id }, [this.serviceName])
    }
  }

  Subscription.prototype.verify = function(options, confirmationCode, cb) {
    Subscription.getMergedConfig(
      'subscription',
      this.serviceName,
      (configErr, mergedSubscriptionConfig) => {
        if (configErr) {
          return cb(configErr)
        }
        function handleConfirmationAcknowledgement(err, message) {
          if (!mergedSubscriptionConfig.confirmationAcknowledgements) {
            return cb(err, message)
          }
          var redirectUrl =
            mergedSubscriptionConfig.confirmationAcknowledgements.redirectUrl
          if (redirectUrl) {
            if (err) {
              redirectUrl += '?err=' + encodeURIComponent(err.toString())
            }
            return options.httpContext.res.redirect(redirectUrl)
          } else {
            options.httpContext.res.setHeader('Content-Type', 'text/plain')
            if (err) {
              if (err.status) {
                options.httpContext.res.status(err.status)
              }
              return options.httpContext.res.end(
                mergedSubscriptionConfig.confirmationAcknowledgements
                  .failureMessage
              )
            }
            return options.httpContext.res.end(
              mergedSubscriptionConfig.confirmationAcknowledgements
                .successMessage
            )
          }
        }

        if (
          this.state !== 'unconfirmed' ||
          confirmationCode !== this.confirmationRequest.confirmationCode
        ) {
          var error = new Error('Forbidden')
          error.status = 403
          return handleConfirmationAcknowledgement(error)
        }
        this.state = 'confirmed'
        Subscription.replaceById(this.id, this, function(err, res) {
          return handleConfirmationAcknowledgement(err, 'OK')
        })
      }
    )
  }

  Subscription.prototype.unDeleteItemById = function(
    options,
    unsubscriptionCode,
    cb
  ) {
    if (!Subscription.isAdminReq(options.httpContext)) {
      if (
        this.unsubscriptionCode &&
        unsubscriptionCode !== this.unsubscriptionCode
      ) {
        let error = new Error('Forbidden')
        error.status = 403
        return cb(error)
      }
      if (
        Subscription.getCurrentUser(options.httpContext) ||
        this.state !== 'deleted'
      ) {
        let error = new Error('Forbidden')
        error.status = 403
        return cb(error)
      }
    }
    this.state = 'confirmed'
    Subscription.replaceById(this.id, this, function(writeErr, res) {
      Subscription.getMergedConfig(
        'subscription',
        res.serviceName,
        (configErr, mergedSubscriptionConfig) => {
          var err = writeErr || configErr
          var anonymousUndoUnsubscription =
            mergedSubscriptionConfig.anonymousUndoUnsubscription
          if (anonymousUndoUnsubscription.redirectUrl) {
            var redirectUrl = anonymousUndoUnsubscription.redirectUrl
            if (err) {
              redirectUrl += '?err=' + encodeURIComponent(err)
            }
            return options.httpContext.res.redirect(redirectUrl)
          } else {
            options.httpContext.res.setHeader('Content-Type', 'text/plain')
            if (err) {
              return options.httpContext.res.end(
                anonymousUndoUnsubscription.failureMessage
              )
            }
            return options.httpContext.res.end(
              anonymousUndoUnsubscription.successMessage
            )
          }
        }
      )
    })
  }
}
