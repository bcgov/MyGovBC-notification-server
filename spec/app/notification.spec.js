'use strict'
var request = require('supertest')
var app = require('../../server/server.js')

describe('GET /notifications', function () {
  var data
  beforeEach(function (done) {
    app.models.Notification.create({
      "channel": "inApp",
      "isBroadcast": true,
      "message": {
        "title": "test",
        "body": "this is a test"
      },
      "serviceName": "myService",
      "validTill": "2000-01-01",
      "state": "new"
    }, function (err, res) {
      expect(err).toBeNull()
      data = res
      done()
    })
  })

  it('should be forbidden by anonymous user', function (done) {
    request(app).get('/api/notifications')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })

  it('should be allowed to sm user for non-expired inApp notifications', function (done) {
    request(app).get('/api/notifications')
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBe(0)
        done()
      })
  })


})
describe('POST /notifications', function () {
  var data
  beforeEach(function (done) {
    app.models.Subscription.create({
      "serviceName": "myService",
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
        "confirmationCode": "12345"
      },
      "unsubscriptionCode": "54321"
    }, function (err, res) {
      expect(err).toBeNull()
      data = res
      done()
    })
  })

  it('should send broadcast email notifications with proper mail merge', function (done) {
    spyOn(app.models.Notification, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).post('/api/notifications')
      .send({
        "serviceName": "myService",
        "message": {
          "from": "no_reply@bar.com",
          "subject": "test",
          "textBody": "This is a broadcast test {confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}"
        },
        "channel": "email",
        "isBroadcast": true
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Notification.sendEmail).toHaveBeenCalled()
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).not.toContain('{confirmation_code}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).not.toContain('{service_name}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).not.toContain('{http_host}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).not.toContain('{rest_api_root}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).not.toContain('{subscription_id}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).not.toContain('{unsubscription_code}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).toContain('12345')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).toContain('myService')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).toContain('http://127.0.0.1')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).toContain('/api')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).toContain('1 ')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[3]).toContain('54321')

        app.models.Notification.find({
          where: {
            serviceName: 'myService',
          }
        }, function (err, data) {
          expect(data.length).toBe(1)
          done()
        })
      })
  })
})
