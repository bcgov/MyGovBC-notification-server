let request = require('request')
var parallelLimit = require('async/parallelLimit')
let getOpt = require('node-getopt')
  .create([
    [
      'a',
      'api-url-prefix=<string>',
      'api url prefix. default to http://localhost:3000/api'
    ],
    ['c', 'channel=<string>', 'channel. default to email'],
    ['s', 'service-name=<string>', 'service name. default to load'],
    [
      'n',
      'number-of-subscribers=<int>',
      'number of subscribers. positive integer. default to 1000'
    ],
    [
      'f',
      'broadcast-push-notification-filter=<string>',
      "broadcast push notification filter. default to \"contains_ci(title,'vancouver') || contains_ci(title,'victoria')\""
    ],
    ['h', 'help', 'display this help']
  ])
  .bindHelp(
    'Usage: node ' +
      process.argv[1] +
      ' [Options] <userChannleId> \n[Options]:\n[[OPTIONS]]'
  )
let args = getOpt.parseSystem()
if (args.argv.length !== 1) {
  console.error('invalid arguments')
  getOpt.showHelp()
  process.exit(1)
}
let tasks = []
let i = 0
const apiUrlPrefix =
  args.options['api-url-prefix'] || 'http://localhost:3000/api'
const serviceName = args.options['service-name'] || 'load'
const numberOfSubscribers = parseInt(args.options['number-of-subscribers']) || 1000
const channel = args.options['channel'] || 'email'
const broadcastPushNotificationFilter =
  args.options['broadcast-push-notification-filter'] ||
  "contains_ci(title,'vancouver') || contains_ci(title,'victoria')"
const userChannelId = args.argv[0]
/*jshint loopfunc:true */
while (i < numberOfSubscribers) {
  let index = i
  tasks.push(function(cb) {
    let options = {
      uri: apiUrlPrefix + '/subscriptions',
      headers: {
        'Content-Type': 'application/json'
      },
      json: {
        serviceName: serviceName,
        channel: channel,
        state: 'confirmed',
        index: index,
        confirmationRequest: {
          sendRequest: false
        },
        userChannelId: userChannelId,
        broadcastPushNotificationFilter: broadcastPushNotificationFilter
      }
    }
    request.post(options, (err, data) => {
      if (!err && data.statusCode !== 200) {
        err = data.statusCode
      }
      try {
        if (err) {
          console.error(err)
        } else {
          console.log(data.body.index)
        }
      } catch (ex) {}
      cb()
    })
  })
  i++
}

parallelLimit(tasks, 100, function(error, data) {
  if (error) {
    console.log(error)
  } else if (data) {
    console.log('total count ' + data.length)
    process.exit(0)
  }
})
