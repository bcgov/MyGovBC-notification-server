const SMTPServer = require('smtp-server').SMTPServer
const validEmailRegEx = /un-(.+?)-(.*)@/
const request = require('request')
const server = new SMTPServer({
  //  logger: true,
  authOptional: true,
  onRcptTo(address, session, callback) {
    try {
      if (address.address.match(validEmailRegEx)) {
        return callback()
      }
    } catch (ex) {}
    return callback(new Error('invalid recipient'))
  },
  onData(stream, session, callback) {
    stream.on('data', chunk => {})
    stream.on('end', () => {
      session.envelope.rcptTo.forEach(e => {
        let match = e.address.match(validEmailRegEx)
        let id = match[1]
        let unsubscriptionCode = match[2]
        request.get(
          'http://localhost:3000/api/subscriptions/' +
            id +
            '/unsubscribe?unsubscriptionCode=' +
            encodeURIComponent(unsubscriptionCode) +
            '&userChannelId=' +
            encodeURIComponent(session.envelope.mailFrom.address)
        )
      })
      callback(null)
    })
  }
})
server.listen(25, function() {
  console.info('server started')
})
