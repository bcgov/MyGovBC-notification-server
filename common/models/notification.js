module.exports = function (Notification) {
  Notification.disableRemoteMethod('findOne', true)
  Notification.disableRemoteMethod('findById', true)
  Notification.disableRemoteMethod('createChangeStream', true)
  Notification.disableRemoteMethod('exists', true)
  Notification.disableRemoteMethod('updateAll', true)
  //Notification.disableRemoteMethod('create', true)
  Notification.disableRemoteMethod('count', true)
  Notification.disableRemoteMethod('upsert', true)
  Notification.disableRemoteMethod('deleteById', true)

  Notification.observe('access', function (ctx, next) {
    var httpCtx = require('loopback').getCurrentContext();
    ctx.query.where = ctx.query.where || {}
    if (httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname')) {
      ctx.query.where.or = []
      ctx.query.where.or.push({
        isBroadcast: true
      })
      ctx.query.where.or.push({
        channelId: httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname')
      })
    }
    next()
  })

  Notification.afterRemote('find', function (ctx, res, next) {
    if (!res) {
      return
    }
    var httpCtx = require('loopback').getCurrentContext()
    var currUser = httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname') || 'unknown'
    ctx.result = res.reduce(function (p, e, i) {
      if (e.validTill && Date.parse(e.validTill) < new Date()) {
        return p
      }
      if (e.deletedBy && e.deletedBy.indexOf(currUser) >= 0) {
        return p
      }
      if (e.isBroadcast && e.readBy && e.readBy.indexOf(currUser) >= 0) {
        e.state = 'read'
        e.readBy = null
      }
      p.push(e)
      return p
    }, [])
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

  Notification.beforeRemote('prototype.updateAttributes', function (ctx, instance, next) {
      // only allow changing state
      ctx.args.data = ctx.args.data.state ? {state: ctx.args.data.state} : null
      if (ctx.instance.isBroadcast) {
        var httpCtx = require('loopback').getCurrentContext()
        var currUser = httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname') || 'unknown'
        switch (ctx.args.data.state) {
          case 'read':
            ctx.args.data.readBy = instance.readBy || []
            if (ctx.args.data.readBy.indexOf(currUser) <= 0) {
              ctx.args.data.readBy.push(currUser)
            }
            break
          case 'deleted':
            ctx.args.data.deletedBy = instance.deletedBy || []
            if (ctx.args.data.deletedBy.indexOf(currUser) <= 0) {
              ctx.args.data.deletedBy.push(currUser)
            }
            break
        }
        delete ctx.args.data.state
      }
      next()
    }
  )

  Notification.prototype.deleteById = function (callback) {
    if (this.isBroadcast) {
      this.deletedBy = this.deletedBy || []
      var httpCtx = require('loopback').getCurrentContext()
      var currUser = httpCtx.active.http.req.get('sm_user') || httpCtx.active.http.req.get('smgov_userdisplayname') || 'unknown'
      if (this.deletedBy.indexOf(currUser) < 0) {
        this.deletedBy.push(currUser)
      }
    }
    else {
      this.state = 'deleted'
    }
    Notification.replaceById(this.id, this, function (err, res) {
      callback(err, 1)
    })
  }
}
