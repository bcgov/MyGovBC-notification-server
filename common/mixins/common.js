module.exports = function (Model, options) {
  'use strict'
  var ipRangeCheck = require("ip-range-check")
  Model.createOptionsFromRemotingContext = function (ctx) {
    var base = this.base.createOptionsFromRemotingContext(ctx)
    base.httpContext = ctx
    return base
  }

  Model.isAdminReq = function (httpCtx) {
    // internal requests
    if (!httpCtx) return true

    var adminIps = Model.app.get('adminIps')
    if (adminIps) {
      return adminIps.some(function (e, i) {
        return ipRangeCheck(httpCtx.req.ip, e)
      })
    }
    return false
  }

  Model.getCurrentUser = function (httpCtx) {
    // internal requests
    if (!httpCtx) return null

    var currUser = httpCtx.req.get('sm_user') || httpCtx.req.get('smgov_userdisplayname')
    var siteMinderReverseProxyIps = Model.app.get('siteMinderReverseProxyIps')
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

  Model.sendSMS = function (to, textBody, cb) {
    var smsServiceProvider = Model.app.get('smsServiceProvider')
    switch (smsServiceProvider) {
      default:
        // Twilio Credentials
        var smsConfig = Model.app.get('sms')[smsServiceProvider]
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

  Model.sendEmail = function (from, to, subject, textBody, htmlBody, cb) {
    var nodemailer = require('nodemailer')
    var transporter = nodemailer.createTransport(Model.app.get('smtp'))
    var mailOptions = {
      from: from,
      to: to,
      subject: subject,
      text: textBody,
      html: htmlBody
    }
    transporter.sendMail(mailOptions, cb)
  }

  Model.mailMerge = function (srcTxt, data, httpCtx) {
    var output = srcTxt
    try {
      output = output.replace(/\{confirmation_code\}/ig, data.confirmationRequest.confirmationCode)
      output = output.replace(/\{serviceName\}/ig, data.serviceName)
      output = output.replace(/\{HTTP_HOST\}/ig, httpCtx.req.protocol + '://' + httpCtx.req.get('host'))
      output = output.replace(/\{restApiRoot\}/ig, Model.app.get('restApiRoot'))
      output = output.replace(/\{subscriptionId\}/ig, data.id)
      output = output.replace(/\{unsubscriptionCode\}/ig, data.unsubscriptionCode)
    }
    catch (ex) {
    }
    return output
  }

  Model.observe('before save', function updateTimestamp(ctx, next) {
    try {
      if (ctx.instance) {
        ctx.instance.updated = new Date()
      } else if (ctx.data) {
        ctx.data.updated = new Date()
      }
    }
    catch (ex) {
    }
    next()
  })
}
