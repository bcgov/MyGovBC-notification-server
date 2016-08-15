module.exports = function (Subscription) {
  Subscription.disableRemoteMethod('findOne', true)
  Subscription.disableRemoteMethod('findById', true)
  Subscription.disableRemoteMethod('createChangeStream', true)
  Subscription.disableRemoteMethod('exists', true)
  Subscription.disableRemoteMethod('updateAll', true)
  Subscription.disableRemoteMethod('count', true)
  Subscription.disableRemoteMethod('upsert', true)

  Subscription.observe('access', function (ctx, next) {
    var httpCtx = require('loopback').getCurrentContext()
    var u = httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname')
    if (u) {
      ctx.query.where = ctx.query.where || {}
      ctx.query.where.channelId = u
    }
    next()
  })

  Subscription.beforeRemote('create', function (ctx, unused, next) {
    var u = ctx.req.get('sm_user') || ctx.req.get('smgov_userdisplayname') || 'unknown'
    ctx.args.data.userId = u
    next()
  })

  Subscription.beforeRemote('deleteById', function (ctx, unused, next) {
    var u = ctx.req.get('sm_user') || ctx.req.get('smgov_userdisplayname') || 'unknown'
    Subscription.findById(ctx.args.id, null, null, function (err, data) {
      if (data.userId === u) {
        return next()
      }
      var error = new Error('Unauthorized')
      error.status = 401
      next(error)
    })
  })

}
