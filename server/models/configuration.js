module.exports = function (Configuration) {
  Configuration.beforeRemote('**', function (ctx, unused, next) {
    if (Configuration.isAdminReq(ctx)) {
      return next()
    }
    var error = new Error('Forbidden')
    error.status = 403
    return next(error)
  })
}
