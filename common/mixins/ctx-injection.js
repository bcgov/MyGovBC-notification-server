module.exports = function (Model, options) {
  'use strict'
  Model.createOptionsFromRemotingContext  = function (ctx) {
    var base = this.base.createOptionsFromRemotingContext(ctx)
    base.httpContext = ctx
    return base
  }
}
