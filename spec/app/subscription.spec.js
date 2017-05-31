'use strict'
var request = require('supertest')
var app = require('../../server/server.js')
var parallel = require('async/parallel')


describe('GET /subscriptions', function () {
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
  it('should allow non-admin user create subscriptions', function (done) {
    request(app).post('/api/subscriptions')
      .send({
        "serviceName": "myService",
        "channel": "sms",
        "userChannelId": "12345",
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Subscription.sendSMS).toHaveBeenCalledTimes(1)
        app.models.Subscription.find({
          where: {
            serviceName: 'myService',
            "userChannelId": "12345"
          }
        }, function (err, data) {
          expect(data[0].unsubscriptionCode).toMatch(/\d{5}/)
          done()
        })
      })
  })
})

describe('PATCH /subscriptions/{id}', function () {
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
        "confirmationCode": "37688"
      },
      "unsubscriptionCode": "50032"
    }, function (err, res) {
      expect(err).toBeNull()
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

describe('GET /subscriptions/{id}/verify', function () {
  let data
  beforeEach(function (done) {
    parallel([
      function (cb) {
        app.models.Subscription.create({
          "serviceName": "myService",
          "channel": "email",
          "userId": "bar",
          "userChannelId": "bar@foo.com",
          "state": "unconfirmed",
          "confirmationRequest": {
            "confirmationCodeRegex": "\\d{5}",
            "sendRequest": true,
            "from": "no_reply@example.com",
            "subject": "Subscription confirmation",
            "textBody": "enter {confirmation_code} in this email",
            "confirmationCode": "37688"
          }
        }, function (err, res) {
          cb(err, res)
        })
      },
      function (cb) {
        app.models.Subscription.create({
          "serviceName": "myService",
          "channel": "email",
          "userChannelId": "bar@foo.com",
          "state": "unconfirmed",
          "confirmationRequest": {
            "confirmationCodeRegex": "\\d{5}",
            "sendRequest": true,
            "from": "no_reply@example.com",
            "subject": "Subscription confirmation",
            "textBody": "enter {confirmation_code} in this email",
            "confirmationCode": "37689"
          },
          "unsubscriptionCode": "50032"
        }, function (err, res) {
          cb(err, res)
        })
      }
    ], function (err, results) {
      expect(err).toBeNull()
      data = results
      done()
    })
  })

  it('should verify confirmation code sent by sm user', function (done) {
    request(app).get('/api/subscriptions/' + data[0].id + '/verify?confirmationCode=37688')
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[0].id, function (err, res) {
          expect(res.state).toBe('confirmed')
          done()
        })
      })
  })

  it('should verify confirmation code sent by anonymous user', function (done) {
    request(app).get('/api/subscriptions/' + data[1].id + '/verify?confirmationCode=37689')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[1].id, function (err, res) {
          expect(res.state).toBe('confirmed')
          done()
        })
      })
  })

  it('should deny incorrect confirmation code', function (done) {
    request(app).get('/api/subscriptions/' + data[1].id + '/verify?confirmationCode=0000')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Subscription.findById(data[1].id, function (err, res) {
          expect(res.state).toBe('unconfirmed')
          done()
        })
      })
  })

})

describe('DELETE /subscriptions/{id}', function () {
  let data
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
            "confirmationCode": "37688"
          }
        }, function (err, res) {
          cb(err, res)
        })
      },
      function (cb) {
        app.models.Subscription.create({
          "serviceName": "myService",
          "channel": "email",
          "userChannelId": "bar@foo.com",
          "state": "confirmed",
          "confirmationRequest": {
            "confirmationCodeRegex": "\\d{5}",
            "sendRequest": true,
            "from": "no_reply@example.com",
            "subject": "Subscription confirmation",
            "textBody": "enter {confirmation_code} in this email",
            "confirmationCode": "37689"
          },
          "unsubscriptionCode": "50032"
        }, function (err, res) {
          cb(err, res)
        })
      },
      function (cb) {
        app.models.Subscription.create({
          "serviceName": "myService",
          "channel": "email",
          "userChannelId": "bar@foo.com",
          "state": "unconfirmed",
          "confirmationRequest": {
            "confirmationCodeRegex": "\\d{5}",
            "sendRequest": true,
            "from": "no_reply@example.com",
            "subject": "Subscription confirmation",
            "textBody": "enter {confirmation_code} in this email",
            "confirmationCode": "37689"
          }
        }, function (err, res) {
          cb(err, res)
        })
      }
    ], function (err, results) {
      expect(err).toBeNull()
      data = results
      done()
    })
  })

  it('should allow unsubscription by sm user', function (done) {
    request(app).delete('/api/subscriptions/' + data[0].id)
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[0].id, function (err, res) {
          expect(res.state).toBe('deleted')
          done()
        })
      })
  })

  it('should allow unsubscription by anonymous user', function (done) {
    request(app).get('/api/subscriptions/' + data[1].id + '/unsubscribe?unsubscriptionCode=50032')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[1].id, function (err, res) {
          expect(res.state).toBe('deleted')
          done()
        })
      })
  })

  it('should deny unsubscription by anonymous user with incorrect unsubscriptionCode', function (done) {
    request(app).get('/api/subscriptions/' + data[1].id + '/unsubscribe?unsubscriptionCode=50033')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Subscription.findById(data[1].id, function (err, res) {
          expect(res.state).toBe('confirmed')
          done()
        })
      })
  })

  it('should deny unsubscription if state is not confirmed', function (done) {
    request(app).get('/api/subscriptions/' + data[2].id + '/unsubscribe?unsubscriptionCode=50033')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Subscription.findById(data[2].id, function (err, res) {
          expect(res.state).toBe('unconfirmed')
          done()
        })
      })
  })

  it('should deny unsubscription by another sm user', function (done) {
    request(app).delete('/api/subscriptions/' + data[0].id)
      .set('Accept', 'application/json')
      .set('SM_USER', 'baz')
      .end(function (err, res) {
        expect(res.statusCode).toBe(404)
        app.models.Subscription.findById(data[0].id, function (err, res) {
          expect(res.state).toBe('confirmed')
          done()
        })
      })
  })
})

describe('GET /subscriptions/{id}/unsubscribe/undo', function () {
  let data
  beforeEach(function (done) {
    parallel([
      function (cb) {
        app.models.Subscription.create({
          "serviceName": "myService",
          "channel": "email",
          "userChannelId": "bar@foo.com",
          "state": "deleted",
          "confirmationRequest": {
            "confirmationCodeRegex": "\\d{5}",
            "sendRequest": true,
            "from": "no_reply@example.com",
            "subject": "Subscription confirmation",
            "textBody": "enter {confirmation_code} in this email",
            "confirmationCode": "37689"
          },
          "unsubscriptionCode": "50032"
        }, function (err, res) {
          cb(err, res)
        })
      },
      function (cb) {
        app.models.Subscription.create({
          "serviceName": "myService",
          "channel": "email",
          "userChannelId": "bar@foo.com",
          "state": "unconfirmed",
          "confirmationRequest": {
            "confirmationCodeRegex": "\\d{5}",
            "sendRequest": true,
            "from": "no_reply@example.com",
            "subject": "Subscription confirmation",
            "textBody": "enter {confirmation_code} in this email",
            "confirmationCode": "37689"
          },
          "unsubscriptionCode": "50032"
        }, function (err, res) {
          cb(err, res)
        })
      }
    ], function (err, results) {
      expect(err).toBeNull()
      data = results
      done()
    })
  })

  it('should allow undelete subscription by anonymous user', function (done) {
    request(app).get('/api/subscriptions/' + data[0].id + '/unsubscribe/undo?unsubscriptionCode=50032')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[0].id, function (err, res) {
          expect(res.state).toBe('confirmed')
          done()
        })
      })
  })

  it('should forbid undelete subscription by anonymous user with incorrect unsubscriptionCode', function (done) {
    request(app).get('/api/subscriptions/' + data[0].id + '/unsubscribe/undo?unsubscriptionCode=50033')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Subscription.findById(data[0].id, function (err, res) {
          expect(res.state).toBe('deleted')
          done()
        })
      })
  })

  it('should forbid undelete subscription where state is not deleted', function (done) {
    request(app).get('/api/subscriptions/' + data[1].id + '/unsubscribe/undo?unsubscriptionCode=50032')
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Subscription.findById(data[1].id, function (err, res) {
          expect(res.state).toBe('unconfirmed')
          done()
        })
      })
  })

  it('should redirect response if set so', function (done) {
    app.models.Configuration.create({
      "name": "subscription",
      "serviceName": "myService",
      "value": {
        "anonymousUndoUnsubscription": {
          "redirectUrl": "http://nowhere"
        }
      }
    }, function (err, res) {
      request(app).get('/api/subscriptions/' + data[0].id + '/unsubscribe/undo?unsubscriptionCode=50032')
        .end(function (err, res) {
          expect(res.statusCode).toBe(302)
          expect(res.headers.location).toBe('http://nowhere')
          app.models.Subscription.findById(data[0].id, function (err, res) {
            expect(res.state).toBe('confirmed')
            done()
          })
        })

    })
  })
})
