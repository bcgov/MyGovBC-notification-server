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

  // todo: save rsa keys in db in order to share among multiple app servers
  var privateKeyFilePath = path.resolve(__dirname, '../id_rsa')
  var publicKeyFilePath = path.resolve(__dirname, '../id_rsa.pub')
  fs.readFile(privateKeyFilePath, 'utf8', (err, data) => {
    var key = new NodeRSA()
    if (!err) {
      key.importKey(data, 'private')
      module.exports.key = key
      return cb()
    }
    key.generateKeyPair()
    module.exports.key = key
    var privateKey = key.exportKey('private')
    var publicKey = key.exportKey('public')
    fs.writeFile(privateKeyFilePath, privateKey, (err) => {
      if (err) throw err
      fs.writeFile(publicKeyFilePath, publicKey, (err) => {
        if (err) throw err
        cb()
      })
    })
  })
}
