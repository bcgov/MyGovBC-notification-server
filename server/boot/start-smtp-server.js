module.exports = function(app, cb) {
  const smtpSvr = app.get('smtpServer')
  if (!smtpSvr) {
    return process.nextTick(cb)
  }
  smtpSvr.listeningSmtpPort &&
    (process.env.LISTENING_SMTP_PORT = smtpSvr.listeningSmtpPort)
  smtpSvr.allowedSmtpDomains &&
    (process.env.ALLOWED_SMTP_DOMAINS = smtpSvr.allowedSmtpDomains.toString())
  smtpSvr.apiUrlPrefix && (process.env.API_URL_PREFIX = smtpSvr.apiUrlPrefix)
  smtpSvr.options &&
    (process.env.SMTP_SERVER_OPTIONS = JSON.stringify(smtpSvr.options))
  require('../smtp-server')
  return process.nextTick(cb)
}
