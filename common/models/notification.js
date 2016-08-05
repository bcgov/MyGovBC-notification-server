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
    if (httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname')) {
      ctx.query.where.or = []
      ctx.query.where.or.push({
        isBroadcast: true
      })
      ctx.query.where.or.push({
        userId: httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname')
      })
    }
    next()
  })
  Notification.afterRemote('find', function (ctx, res, next) {
    if (!res) {
      return
    }
    ctx.result = res.filter(function (e, i) {
      if (!e.validTill) return true
      if (Date.parse(e.validTill) > new Date()) return true
      return false
    })
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
