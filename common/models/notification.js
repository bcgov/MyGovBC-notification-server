module.exports = function(Notification) {
  var isStatic = true
  Notification.disableRemoteMethod('findOne', isStatic)
  Notification.disableRemoteMethod('createChangeStream', isStatic)
  Notification.disableRemoteMethod('exists', isStatic)
  Notification.disableRemoteMethod('updateAll', isStatic)
  Notification.disableRemoteMethod('create', isStatic)
  Notification.disableRemoteMethod('count', isStatic)
};
