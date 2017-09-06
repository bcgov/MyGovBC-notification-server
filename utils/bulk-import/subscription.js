'use strict'
const request = require('request')
const csv = require('csvtojson')
const queue = require('async/queue')
const program = require('commander')
const pjson = require('../../package.json')
program
  .version(pjson.version)
  .description('bulk import subscriptions from csv file')
  .usage('[options] <csv-file-name>')
  .option(
    '-a --api-url-prefix <api-url-prefix>',
    'api url prefix. default to http://localhost:3000/api',
    'http://localhost:3000/api'
  )
  .option(
    '-c --concurrency <concurrency>',
    'post request concurrency. default to 10',
    parseInt,
    10
  )
  .parse(process.argv)
if (program.args.length !== 1) {
  console.error('invalid arguments')
  program.outputHelp()
  process.exit(1)
}

let done = false,
  successCnt = 0
let q = queue(function(task, cb) {
  let options = {
    uri: program.apiUrlPrefix + '/subscriptions',
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
}, program.concurrency)
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
  .fromFile(program.args[0])
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
