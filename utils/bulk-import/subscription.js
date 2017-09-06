'use strict'
const request = require('request')
const csv = require('csvtojson')
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
    let options = {
      uri: (process.argv[3] || 'http://localhost:3000/api') + '/subscriptions',
      headers: {
        'Content-Type': 'application/json'
      },
      json: jsonObj
    }
    request.post(options, (err, data) => {
      if (!err && data.statusCode !== 200) {
        err = data.statusCode
      }
      if (err) {
        console.error('error for row #' + rowIdx + ': ' + err)
      }
    })
  })
  .on('done', error => {
    console.log('end')
  })
