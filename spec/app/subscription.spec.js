'use strict'
var request = require('supertest')
var app = require('../../server/server.js')

describe('API', function () {
  beforeAll(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000
    app.set('adminIps', [])
  })

  beforeEach(function (done) {
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
      spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function () {
        return true
      })
      request(app).get('/api/subscriptions')
        .end(function (err, res) {
          expect(res.statusCode).toBe(200)
          done()
        })
    })
  })


  describe('POST /subscriptions', function () {
    it('should allow admin users create subscriptions without sending confirmation request', function (done) {
      spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function () {
        return true
      })
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
      spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function () {
        return true
      })
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

  describe('PATCH /subscriptions/{id}', function () {
    it('should allow sm users change their user channel id', function (done) {
      app.models.Subscription.create({
        "serviceName": "education",
        "channel": "email",
        "userId": "bar",
        "userChannelId": "bar@foo.com",
        "state": "confirmed",
        "confirmationRequest": {
          "confirmationCodeRegex": "\\d{5}",
          "sendRequest": true,
          "from": "no_reply@example.com",
          "subject": "Subscription confirmation",
          "textBody": "enter {confirmation_code} in this email",
          "confirmationCode": "37688"
        },
        "unsubscriptionCode": "50032"
      }, function (err, data) {
        expect(err).toBeNull()
        request(app).patch('/api/subscriptions/1')
          .send({
            "userChannelId": "baz@foo.com",
          })
          .set('Accept', 'application/json')
          .set('SM_USER', 'bar')
          .end(function (err, res) {
            expect(res.body.state).toBe('unconfirmed')
            expect(res.body.userChannelId).toBe('baz@foo.com')
            done()
          })
      })
    })
  })
})
