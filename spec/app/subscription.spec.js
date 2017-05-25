'use strict'
var request = require('supertest')
var app = require('../../server/server.js')

beforeAll(() => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000
})

beforeEach(function (done) {
  app.set('adminIps', [])
  spyOn(app.models.Subscription, 'sendEmail').and.callFake(function () {
    let cb = arguments[arguments.length - 1]
    console.log('faking sendEmail')
    return cb(null, null)
  })
  spyOn(app.models.Subscription, 'sendSMS').and.callFake(function () {
    let cb = arguments[arguments.length - 1]
    console.log('faking sendSMS')
    return cb(null, null)
  })
  app.dataSources.db.automigrate(function (err) {
    expect(err).toBeUndefined()
    done()
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
        expect(res.statusCode).toBe(200)
        expect(app.models.Subscription.sendEmail).toHaveBeenCalled()
        app.models.Subscription.find({
          where: {
            serviceName: 'foo',
            "userChannelId": "foo@bar.com"
          }
        }, function (err, data) {
          expect(data.length).toBe(1)
          done()
        })
      })
  })
})
