const fs = require('fs')
const path = require('path')
var NodeRSA = require('node-rsa')

module.exports = function (app, cb) {
  /*
   * The `app` object provides access to a variety of LoopBack resources such as
   * models (e.g. `app.models.YourModelName`) or data sources (e.g.
   * `app.datasources.YourDataSource`). See
   * http://docs.strongloop.com/display/public/LB/Working+with+LoopBack+objects
   * for more info.
   */

  // todo: update docs about how to get public rsa key
  app.models.Configuration.find({where: {name: 'rsa'}}, (err, data) => {
    var key = new NodeRSA()
    if (!err && data.length > 0) {
      key.importKey(data[0].value.private, 'private')
      key.importKey(data[0].value.public, 'public')
      module.exports.key = key
      return cb()
    }
    key.generateKeyPair()
    module.exports.key = key
    app.models.Configuration.create({
      name: 'rsa',
      value: {
        private: key.exportKey('private'),
        public: key.exportKey('public')
      }
    }, function (err, data) {
      cb()
    })
  })
}
