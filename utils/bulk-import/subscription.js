'use strict'
const request = require('request')
const csv = require('csvtojson')
const queue = require('async/queue')
let done = false,
  successCnt = 0
let q = queue(function(task, cb) {
  let options = {
    uri: (process.argv[3] || 'http://localhost:3000/api') + '/subscriptions',
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
}, process.argv[4] || 10)
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
  .fromFile(process.argv[2])
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
