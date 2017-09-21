const SMTPServer = require('smtp-server').SMTPServer
const validEmailRegEx = /un-(.+?)-(.*)@(.+)/
const request = require('request')
const getOpt = require('node-getopt')
  .create([
    [
      'a',
      'api-url-prefix=<string>',
      'NotifyBC api url prefix; default to http://localhost:3000/api'
    ],
    [
      'd',
      'allowed-domains=<string>+',
      'allowed email domains; if missing all are allowed; repeat the option to create multiple entries.'
    ],
    ['h', 'help', 'display this help']
  ])
  .bindHelp(
    'Usage: node ' + process.argv[1] + ' [Options]\n[Options]:\n[[OPTIONS]]'
  )
const args = getOpt.parseSystem()
const urlPrefix = args.options['api-url-prefix'] || 'http://localhost:3000/api'
const allowedDomains =
  args.options['allowed-domains'] &&
  args.options['allowed-domains'].map(e => e.toLowerCase())
const server = new SMTPServer({
  //  logger: true,
  authOptional: true,
  onRcptTo(address, session, callback) {
    try {
      let match = address.address.match(validEmailRegEx)
      if (match) {
        let domain = match[3]
        if (
          !allowedDomains ||
          allowedDomains.indexOf(domain.toLowerCase()) >= 0
        )
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
        request.get({
          url:
            urlPrefix +
            '/subscriptions/' +
            id +
            '/unsubscribe?unsubscriptionCode=' +
            encodeURIComponent(unsubscriptionCode) +
            '&userChannelId=' +
            encodeURIComponent(session.envelope.mailFrom.address),
          headers: {
            is_anonymous: true
          }
        })
      })
      callback(null)
    })
  }
})
server.listen(25, function() {
  console.info(`server started with:\napi-url-prefix=${urlPrefix}`)
  allowedDomains && console.info(`allowed-domains=${allowedDomains}`)
})
