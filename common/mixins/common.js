module.exports = function (Model, options) {
  'use strict'
  var ipRangeCheck = require("ip-range-check")
  var _ = require("lodash")
  Model.createOptionsFromRemotingContext = function (ctx) {
    var base = this.base.createOptionsFromRemotingContext(ctx)
    base.httpContext = ctx
    return base
  }

  Model.isAdminReq = function (httpCtx, ignoreAccessToken) {
    // internal requests
    if (!httpCtx || !httpCtx.req) {
      return true
    }
    if(!ignoreAccessToken){
      let token = httpCtx.args.options && httpCtx.args.options.accessToken
      if (token && token.userId) {
        return true
      }
    }

    var adminIps = Model.app.get('adminIps') || Model.app.get('defaultAdminIps')
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
    }
    catch (ex) {
    }
    try {
      output = output.replace(/\{service_name\}/ig, data.serviceName)
    }
    catch (ex) {
    }
    try {
      output = output.replace(/\{http_host\}/ig, httpCtx.args && httpCtx.args.data && httpCtx.args.data.httpHost ? httpCtx.args.data.httpHost : httpCtx.req.protocol + '://' + httpCtx.req.get('host'))
    }
    catch (ex) {
    }
    try {
      output = output.replace(/\{rest_api_root\}/ig, Model.app.get('restApiRoot'))
    }
    catch (ex) {
    }
    try {
      output = output.replace(/\{subscription_id\}/ig, data.id)
    }
    catch (ex) {
    }
    try {
      output = output.replace(/\{unsubscription_code\}/ig, data.unsubscriptionCode)
    }
    catch (ex) {
    }

    // for backward compatibilities
    try {
      output = output.replace(/\{serviceName\}/ig, data.serviceName)
    }
    catch (ex) {
    }
    try {
      output = output.replace(/\{restApiRoot\}/ig, Model.app.get('restApiRoot'))
    }
    catch (ex) {
    }
    try {
      output = output.replace(/\{subscriptionId\}/ig, data.id)
    }
    catch (ex) {
    }
    try {
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

  Model.getMergedConfig = function (configName, serviceName, next) {
    Model.app.models.Configuration.findOne({
      where: {
        name: configName,
        serviceName: serviceName
      }
    }, (err, data) => {
      var res
      if (err) {
        return next(err, null)
      }
      try {
        res = _.merge({}, Model.app.get(configName))
      }
      catch (ex) {
      }
      try {
        res = _.merge({}, res, data.value)
      }
      catch (ex) {
      }
      return next(null, res)
    })
  }
}
