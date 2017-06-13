'use strict'
var request = require('supertest')
var app = require('../../server/server.js')
var parallel = require('async/parallel')
var nodeReq = require('request')

describe('GET /notifications', function () {
  var data
  beforeEach(function (done) {
    parallel([
      function (cb) {
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
        }, cb)
      },
      function (cb) {
        app.models.Notification.create({
          "channel": "inApp",
          "isBroadcast": true,
          "message": {
            "title": "test",
            "body": "this is a test"
          },
          "serviceName": "myService",
          "readBy": ["bar"],
          "state": "new"
        }, cb)
      },
      function (cb) {
        app.models.Notification.create({
          "channel": "inApp",
          "isBroadcast": true,
          "message": {
            "title": "test",
            "body": "this is a test"
          },
          "serviceName": "myService",
          "deletedBy": ["bar"],
          "state": "new"
        }, cb)
      },
      function (cb) {
        app.models.Notification.create({
          "channel": "inApp",
          "isBroadcast": true,
          "message": {
            "title": "test",
            "body": "this is a test"
          },
          "serviceName": "myService",
          "invalidBefore": "3017-05-30",
          "state": "new"
        }, cb)
      }
    ], function (err, results) {
      expect(err).toBeNull()
      data = results
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

  it('should be allowed to sm user for current, non-expired, non-deleted inApp notifications', function (done) {
    request(app).get('/api/notifications')
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBe(1)
        done()
      })
  })


})
describe('POST /notifications', function () {
  beforeEach(function (done) {
    parallel([
      function (cb) {
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
        }, cb)
      },
      function (cb) {
        app.models.Subscription.create({
          "serviceName": "myService",
          "channel": "sms",
          "userChannelId": "12345",
          "state": "confirmed",
        }, cb)
      }
    ], function (err, results) {
      expect(err).toBeNull()
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
          "textBody": "This is a broadcast test {confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}",
          "htmlBody": "This is a broadcast test {confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}"
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

        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).not.toContain('{confirmation_code}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).not.toContain('{service_name}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).not.toContain('{http_host}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).not.toContain('{rest_api_root}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).not.toContain('{subscription_id}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).not.toContain('{unsubscription_code}')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).toContain('12345')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).toContain('myService')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).toContain('http://127.0.0.1')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).toContain('/api')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).toContain('1 ')
        expect(app.models.Notification.sendEmail.calls.argsFor(0)[4]).toContain('54321')

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

  it('should send unicast email notification', function (done) {
    spyOn(app.models.Notification, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).post('/api/notifications')
      .send({
        "serviceName": "myService",
        "message": {
          "from": "no_reply@bar.com",
          "subject": "test",
          "textBody": "This is a unicast test {confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}"
        },
        "channel": "email",
        "userId": "bar",
        "userChannelId": "bar@foo.COM"
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Notification.sendEmail).toHaveBeenCalled()
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

  it('should send unicast sms notification', function (done) {
    spyOn(app.models.Notification, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).post('/api/notifications')
      .send({
        "serviceName": "myService",
        "message": {
          "textBody": "This is a unicast test {confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}"
        },
        "channel": "sms",
        "skipSubscriptionConfirmationCheck": true,
        "userChannelId": "12345"
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Notification.sendSMS).toHaveBeenCalled()
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


  it('should send broadcast sms notification', function (done) {
    spyOn(app.models.Notification, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).post('/api/notifications')
      .send({
        "serviceName": "myService",
        "message": {
          "textBody": "This is a unicast test {confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}"
        },
        "channel": "sms",
        "isBroadcast": true
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Notification.sendSMS).toHaveBeenCalled()
        app.models.Notification.find({
          where: {
            serviceName: 'myService'
          }
        }, function (err, data) {
          expect(data.length).toBe(1)
          done()
        })
      })
  })

  it('should not send future-dated notification', function (done) {
    spyOn(app.models.Notification, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).post('/api/notifications')
      .send({
        "serviceName": "myService",
        "message": {
          "from": "no_reply@bar.com",
          "subject": "test",
          "textBody": "This is a unicast test {confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}"
        },
        "channel": "email",
        "userId": "bar",
        "invalidBefore": "3017-06-01"
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Notification.sendEmail).not.toHaveBeenCalled()
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

  it('should deny skipSubscriptionConfirmationCheck unicast notification missing userChannelId', function (done) {
    spyOn(app.models.Notification, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).post('/api/notifications')
      .send({
        "serviceName": "myService",
        "message": {
          "from": "no_reply@bar.com",
          "subject": "test",
          "textBody": "This is a unicast test {confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}"
        },
        "channel": "email",
        "userId": "bar",
        "skipSubscriptionConfirmationCheck": true
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Notification.find({
          where: {
            serviceName: 'myService',
          }
        }, function (err, data) {
          expect(data.length).toBe(0)
          done()
        })
      })
  })

  it('should deny unicast notification missing both userChannelId and userId', function (done) {
    spyOn(app.models.Notification, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).post('/api/notifications')
      .send({
        "serviceName": "myService",
        "message": {
          "from": "no_reply@bar.com",
          "subject": "test",
          "textBody": "This is a unicast test {confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}"
        },
        "channel": "email"
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Notification.find({
          where: {
            serviceName: 'myService',
          }
        }, function (err, data) {
          expect(data.length).toBe(0)
          done()
        })
      })
  })

  it('should deny anonymous user', function (done) {
    request(app).post('/api/notifications')
      .send({
        "serviceName": "myService",
        "message": {
          "from": "no_reply@bar.com",
          "subject": "test",
          "textBody": "This is a broadcast test"
        },
        "channel": "email",
        "isBroadcast": true
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })
  it('should deny sm user', function (done) {
    request(app).post('/api/notifications')
      .send({
        "serviceName": "myService",
        "message": {
          "from": "no_reply@bar.com",
          "subject": "test",
          "textBody": "This is a broadcast test"
        },
        "channel": "email",
        "isBroadcast": true
      })
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })

  it('should perform async callback for broadcast push notification if asyncBroadcastPushNotification is set', function (done) {
    spyOn(app.models.Notification, 'isAdminReq').and.callFake(function () {
      return true
    })
    app.models.Notification.sendEmail = jasmine.createSpy().and.callFake(function () {
      let cb = arguments[arguments.length - 1]
      console.log('faking delayed sendEmail')
      setTimeout(function () {
        return cb(null, null)
      }, 1000)
    })
    spyOn(nodeReq, 'post')

    request(app).post('/api/notifications')
      .send({
        "serviceName": "myService",
        "message": {
          "from": "no_reply@bar.com",
          "subject": "test",
          "textBody": "This is a unicast test {confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code}"
        },
        "channel": "email",
        "isBroadcast": true,
        "asyncBroadcastPushNotification": "http://foo.com"
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Notification.find({
          where: {
            serviceName: 'myService',
          }
        }, function (err, data) {
          expect(data.length).toBe(1)
          expect(data[0].state).toBe('new')
          setTimeout(function () {
            app.models.Notification.find({
              where: {
                serviceName: 'myService',
              }
            }, function (err, data) {
              expect(data.length).toBe(1)
              expect(data[0].state).toBe('sent')
              expect(nodeReq.post).toHaveBeenCalledWith(jasmine.any(Object))
              done()
            })
          }, 3000)
        })
      })
  }, 10000)
})

describe('PATCH /notifications/{id}', function () {
  beforeEach(function (done) {
    app.models.Notification.create({
      "channel": "inApp",
      "isBroadcast": true,
      "message": {
        "title": "test",
        "body": "this is a test"
      },
      "serviceName": "myService",
      "state": "new"
    }, function (err, res) {
      expect(err).toBeNull()
      done()
    })
  })
  it('should set readBy field of broadcast inApp notifications for sm users', function (done) {
    request(app).patch('/api/notifications/1')
      .send({
        "serviceName": "myService",
        "state": "read"
      })
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Notification.findById(1, function (err, data) {
          expect(data.readBy).toContain('bar')
          expect(data.state).toBe('new')
          done()
        })
      })
  })
  it('should set state field of broadcast inApp notifications for admin users', function (done) {
    spyOn(app.models.Notification, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).patch('/api/notifications/1')
      .send({
        "state": "deleted"
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Notification.findById(1, function (err, data) {
          expect(data.state).toBe('deleted')
          done()
        })
      })
  })
  it('should deny anonymous user', function (done) {
    request(app).patch('/api/notifications/1')
      .send({
        "serviceName": "myService",
        "state": "read"
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })
})
describe('DELETE /notifications/{id}', function () {
  beforeEach(function (done) {
    app.models.Notification.create({
      "channel": "inApp",
      "isBroadcast": true,
      "message": {
        "title": "test",
        "body": "this is a test"
      },
      "serviceName": "myService",
      "state": "new"
    }, function (err, res) {
      expect(err).toBeNull()
      done()
    })
  })
  it('should set deletedBy field of broadcast inApp notifications for sm users', function (done) {
    request(app).delete('/api/notifications/1')
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Notification.findById(1, function (err, data) {
          expect(data.deletedBy).toContain('bar')
          expect(data.state).toBe('new')
          done()
        })
      })
  })
  it('should set state field of broadcast inApp notifications for admin users', function (done) {
    spyOn(app.models.Notification, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).delete('/api/notifications/1')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Notification.findById(1, function (err, data) {
          expect(data.state).toBe('deleted')
          done()
        })
      })
  })
  it('should deny anonymous user', function (done) {
    request(app).delete('/api/notifications/1')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })
})
