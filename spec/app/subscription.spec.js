'use strict'
var request = require('supertest')
var app = require('../../server/server.js')

beforeAll(() => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000
})

beforeEach(() => {
  app.set('adminIps', [])
  spyOn(app.models.Subscription, 'sendEmail').and.callFake(() => {
    let cb = arguments[arguments.length - 1]
    console.log('faking sendEmail')
    cb()
  })
  spyOn(app.models.Subscription, 'sendSMS').and.callFake(() => {
    let cb = arguments[arguments.length - 1]
    console.log('faking sendSMS')
    cb()
  })
})

describe('GET /subscriptions', function () {
  it('should forbid anonymous users get subscriptions', function (done) {
    request(app).get('/api/subscriptions')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })

  it('should allow admin users get subscriptions', function (done) {
    app.set('adminIps', ['127.0.0.1'])
    request(app).get('/api/subscriptions')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        done()
      })
  })
})


describe('POST /subscriptions', function () {
  it('should allow admin users create subscriptions without sending confirmation request', function (done) {
    app.set('adminIps', ['127.0.0.1'])
    request(app).post('/api/subscriptions')
      .send({
        "serviceName": "foo",
        "channel": "email",
        "userChannelId": "foo@bar.com",
        "confirmationRequest": {
          "sendRequest": false
        }
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        done()
      })
  })

  it('should allow admin users create subscriptions and send confirmation request', function (done) {
    app.set('adminIps', ['127.0.0.1'])
    request(app).post('/api/subscriptions')
      .send({
        "serviceName": "foo",
        "channel": "email",
        "userChannelId": "foo@bar.com"
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(app.models.Subscription.sendEmail).toHaveBeenCalled()
        done()
      })
  })
})
