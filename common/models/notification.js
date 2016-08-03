module.exports = function (Notification) {
  var isStatic = true
  Notification.disableRemoteMethod('findOne', isStatic)
  Notification.disableRemoteMethod('createChangeStream', isStatic)
  Notification.disableRemoteMethod('exists', isStatic)
  Notification.disableRemoteMethod('updateAll', isStatic)
  //Notification.disableRemoteMethod('create', isStatic)
  Notification.disableRemoteMethod('count', isStatic)
  Notification.disableRemoteMethod('upsert', isStatic)
  Notification.observe('access', function (ctx, next) {
    var httpCtx = require('loopback').getCurrentContext();
    ctx.query.where = ctx.query.where || {}
    ctx.query.where.userId = httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname') || 'unknown'
    next()
  })
  Notification.beforeRemote('create', function (ctx, unused, next) {
    if (ctx.req.get('sm_user') || ctx.req.get('smgov_userdisplayname')) {
      var error = new Error('Unauthorized')
      error.status = 401
      return next(error)
    }
    next()
  })
};
