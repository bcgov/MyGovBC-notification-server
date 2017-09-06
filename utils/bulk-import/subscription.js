'use strict'
const request = require('request')
const csv = require('csvtojson')
const queue = require('async/queue')
let getOpt = require('node-getopt')
  .create([
    [
      'a',
      'api-url-prefix=<string>',
      'api url prefix. default to http://localhost:3000/api'
    ],
    [
      'c',
      'concurrency=<int>',
      'post request concurrency. positive integer. default to 10'
    ],
    ['h', 'help', 'display this help']
  ])
  .bindHelp(
    'Usage: node ' +
      process.argv[1] +
      ' [Options] <csv-file-path>\n[Options]:\n[[OPTIONS]]'
  )
let args = getOpt.parseSystem()
if (args.argv.length !== 1) {
  console.error('invalid arguments')
  getOpt.showHelp()
  process.exit(1)
}
if (
  args.options.concurrency &&
  (isNaN(parseInt(args.options.concurrency)) ||
    parseInt(args.options.concurrency) <= 0)
) {
  console.error('invalid option concurrency')
  getOpt.showHelp()
  process.exit(1)
}

let done = false,
  successCnt = 0
let q = queue(function(task, cb) {
  let options = {
    uri:
      (args.options['api-url-prefix'] || 'http://localhost:3000/api') +
      '/subscriptions',
    headers: {
      'Content-Type': 'application/json'
    },
    json: task.jsonObj
  }
  request.post(options, (err, data) => {
    if (!err && data.statusCode !== 200) {
      err = data.statusCode
    }
    if (err) {
      console.error('error for row #' + task.rowIdx + ': ' + err)
    } else {
      successCnt++
    }
    cb(err)
  })
}, parseInt(args.options.concurrency) || 10)
q.drain = function() {
  if (done) {
    console.log('success row count = ' + successCnt)
    process.exit(0)
  }
}

csv({
  colParser: {
    'confirmationRequest.sendRequest': (item, head, resultRow, row, colIdx) => {
      try {
        return item.toLowerCase() === 'true'
      } catch (ex) {
        return item
      }
    }
  }
})
  .fromFile(args.argv[0])
  .on('json', (jsonObj, rowIdx) => {
    q.push({
      jsonObj: jsonObj,
      rowIdx: rowIdx
    })
  })
  .on('done', error => {
    error && console.error(error)
    done = true
  })
