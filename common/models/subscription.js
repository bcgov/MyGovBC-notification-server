module.exports = function(Subscription) {
  Subscription.disableRemoteMethod('findOne', true)
  Subscription.disableRemoteMethod('findById', true)
  Subscription.disableRemoteMethod('createChangeStream', true)
  Subscription.disableRemoteMethod('exists', true)
  Subscription.disableRemoteMethod('updateAll', true)
  Subscription.disableRemoteMethod('count', true)
  Subscription.disableRemoteMethod('upsert', true)
  Subscription.disableRemoteMethod('deleteById', true)
};
