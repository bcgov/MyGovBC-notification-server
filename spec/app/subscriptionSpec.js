'use strict'
var request = require('supertest')
var loopback = require('loopback')
var app = require('../../server/server.js')
app.dataSources.db = loopback.createDataSource({
  connector: loopback.Memory
})

beforeEach(() => {
  app.set('adminIps', [])
})

describe('Subscription API', function () {
  it('get subscriptions by anonymous users', function (done) {
    request(app).get('/api/subscriptions')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })
})
