var disableAllMethods = require('../../common/helpers.js').disableAllMethods
module.exports = function (Configuration) {
  disableAllMethods(Configuration, ['find', 'create', 'patchAttributes', 'deleteById'])
  Configuration.beforeRemote('**', function (ctx, unused, next) {
    if (Configuration.isAdminReq(ctx, true)) {
      return next()
    }
    var error = new Error('Forbidden')
    error.status = 403
    return next(error)
  })
}
