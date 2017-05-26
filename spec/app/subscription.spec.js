'use strict'
var request = require('supertest')
var app = require('../../server/server.js')


describe('GET /subscriptions', function () {
  var data
  beforeEach(function (done) {
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
    }, function (err, res) {
      expect(err).toBeNull()
      data = res
      done()
    })
  })

  it('should be forbidden by anonymous user', function (done) {
    request(app).get('/api/subscriptions')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })

  it('should return sm user\'s own subscript', function (done) {
    request(app).get('/api/subscriptions')
      .set('Accept', 'application/json')
      .set('SM_USER', 'baz')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBe(0)
        done()
      })
  })

  it('should have confirmationRequest field removed for sm user requests', function (done) {
    request(app).get('/api/subscriptions')
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].confirmationRequest).toBeUndefined()
        done()
      })
  })


  it('should be allowed by admin users', function (done) {
    spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).get('/api/subscriptions')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].confirmationRequest).not.toBeUndefined()
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

  it('should allow admin users create subscriptions and send confirmation request with proper mail merge', function (done) {
    spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).post('/api/subscriptions')
      .send({
        "serviceName": "myService",
        "channel": "email",
        "userChannelId": "foo@bar.com",
        "unsubscriptionCode": "54321",
        "confirmationRequest": {
          "from": "a@b.com",
          "subject": "subject",
          "sendRequest": true,
          "textBody": "{confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}",
          "confirmationCode": "12345"
        }
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Subscription.sendEmail).toHaveBeenCalled()
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).not.toContain('{confirmation_code}')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).not.toContain('{service_name}')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).not.toContain('{http_host}')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).not.toContain('{rest_api_root}')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).not.toContain('{subscription_id}')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).not.toContain('{unsubscription_code}')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).toContain('12345')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).toContain('myService')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).toContain('http://127.0.0.1')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).toContain('/api')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).toContain('1 ')
        expect(app.models.Subscription.sendEmail.calls.argsFor(0)[3]).toContain('54321')
        app.models.Subscription.find({
          where: {
            serviceName: 'myService',
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
  var data
  beforeEach(function (done) {
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
    }, function (err, res) {
      expect(err).toBeNull()
      data = res
      done()
    })
  })
  it('should allow sm users change their user channel id', function (done) {
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
  it('should deny sm user from changing other user\'s subscription', function (done) {
    request(app).patch('/api/subscriptions/1')
      .send({
        "userChannelId": "baz@foo.com",
      })
      .set('Accept', 'application/json')
      .set('SM_USER', 'baz')
      .end(function (err, res) {
        expect(res.statusCode).toBe(404)
        done()
      })
  })
  it('should deny anonymous user\'s access', function (done) {
    request(app).patch('/api/subscriptions/1')
      .send({
        "userChannelId": "baz@foo.com",
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })
})
