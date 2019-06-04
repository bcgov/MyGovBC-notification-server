let app
var request = require('supertest')
var parallel = require('async/parallel')
beforeAll(done => {
  require('../../server/server.js')(function(err, data) {
    app = data
    done()
  })
})

describe('GET /subscriptions', function() {
  var data
  beforeEach(function(done) {
    app.models.Subscription.create(
      {
        serviceName: 'myService',
        channel: 'email',
        userId: 'bar',
        userChannelId: 'bar@foo.com',
        state: 'confirmed',
        confirmationRequest: {
          confirmationCodeRegex: '\\d{5}',
          sendRequest: true,
          from: 'no_reply@invlid.local',
          subject: 'Subscription confirmation',
          textBody: 'enter {confirmation_code} in this email',
          confirmationCode: '37688'
        },
        unsubscriptionCode: '50032'
      },
      function(err, res) {
        expect(err).toBeNull()
        data = res
        done()
      }
    )
  })

  it('should be forbidden by anonymous user', function(done) {
    request(app)
      .get('/api/subscriptions')
      .end(function(err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })

  it("should return sm user's own subscription", function(done) {
    request(app)
      .get('/api/subscriptions')
      .set('Accept', 'application/json')
      .set('SM_USER', 'baz')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBe(0)
        done()
      })
  })

  it('should have confirmationRequest field removed for sm user requests', function(done) {
    request(app)
      .get('/api/subscriptions')
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].confirmationRequest).toBeUndefined()
        done()
      })
  })

  it('should be allowed by admin users', function(done) {
    spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function() {
      return true
    })
    request(app)
      .get('/api/subscriptions')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        expect(res.body.length).toBe(1)
        expect(res.body[0].confirmationRequest).not.toBeUndefined()
        done()
      })
  })
})

describe('POST /subscriptions', function() {
  it('should allow admin users create subscriptions without sending confirmation request', function(done) {
    spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function() {
      return true
    })
    request(app)
      .post('/api/subscriptions')
      .send({
        serviceName: 'myService',
        channel: 'email',
        userChannelId: 'bar@foo.com',
        state: 'confirmed',
        confirmationRequest: {
          sendRequest: false
        }
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Subscription.sendEmail).not.toHaveBeenCalled()
        app.models.Subscription.find(
          {
            where: {
              serviceName: 'myService',
              userChannelId: 'bar@foo.com'
            }
          },
          function(err, data) {
            expect(data[0].state).toBe('confirmed')
            done()
          }
        )
      })
  })

  it('should allow admin users create subscriptions and send confirmation request with proper mail merge', function(done) {
    spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function() {
      return true
    })
    request(app)
      .post('/api/subscriptions')
      .send({
        serviceName: 'myService',
        channel: 'email',
        userChannelId: 'foo@bar.com',
        unsubscriptionCode: '54321',
        confirmationRequest: {
          from: 'a@b.com',
          subject: 'subject',
          sendRequest: true,
          textBody:
            '{subscription_confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code} {unsubscription_url} {subscription_confirmation_url} {unsubscription_reversion_url}',
          confirmationCode: '12345'
        }
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Subscription.sendEmail).toHaveBeenCalled()
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).not.toContain('{subscription_confirmation_code}')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).not.toContain('{service_name}')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).not.toContain('{http_host}')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).not.toContain('{rest_api_root}')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).not.toContain('{subscription_id}')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).not.toContain('{unsubscription_code}')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).not.toContain('{unsubscription_url}')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).not.toContain('{subscription_confirmation_url}')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).not.toContain('{unsubscription_reversion_url}')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).toContain('12345')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).toContain('myService')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).toContain('http://127.0.0.1')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).toContain('/api')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).toContain('1 ')
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).toContain('54321')
        //unsubscription_url
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).toContain('/api/subscriptions/1/unsubscribe?unsubscriptionCode=54321')
        //subscription_confirmation_url
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).toContain('/api/subscriptions/1/verify?confirmationCode=12345')
        //unsubscription_reversion_url
        expect(
          app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
        ).toContain(
          '/api/subscriptions/1/unsubscribe/undo?unsubscriptionCode=54321'
        )

        app.models.Subscription.find(
          {
            where: {
              serviceName: 'myService',
              userChannelId: 'foo@bar.com'
            }
          },
          function(err, data) {
            expect(data.length).toBe(1)
            done()
          }
        )
      })
  })

  it('should generate unsubscription code for subscriptions created by admin user', function(done) {
    spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function() {
      return true
    })
    request(app)
      .post('/api/subscriptions')
      .send({
        serviceName: 'myService',
        channel: 'sms',
        userChannelId: '12345'
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Subscription.sendSMS).toHaveBeenCalledTimes(1)
        app.models.Subscription.find(
          {
            where: {
              serviceName: 'myService',
              userChannelId: '12345'
            }
          },
          function(err, data) {
            expect(data[0].unsubscriptionCode).toMatch(/\d{5}/)
            done()
          }
        )
      })
  })

  it('should generate unsubscription code for subscriptions created by admin user with confirmationRequest field populated', function(done) {
    spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function() {
      return true
    })
    request(app)
      .post('/api/subscriptions')
      .send({
        serviceName: 'myService',
        channel: 'email',
        userChannelId: 'foo@bar.com',
        confirmationRequest: {
          from: 'foo@invalid.local',
          subject: 'subject',
          sendRequest: true,
          textBody:
            '{subscription_confirmation_code} {service_name} {http_host} {rest_api_root} {subscription_id} {unsubscription_code} {unsubscription_url} {subscription_confirmation_url} {unsubscription_reversion_url}',
          confirmationCodeRegex: '12345'
        }
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Subscription.sendEmail).toHaveBeenCalledTimes(1)
        app.models.Subscription.find(
          {
            where: {
              serviceName: 'myService',
              userChannelId: 'foo@bar.com'
            }
          },
          function(err, data) {
            expect(data[0].confirmationRequest.confirmationCode).toBe('12345')
            done()
          }
        )
      })
  })

  it('should allow non-admin user create subscriptions', function(done) {
    request(app)
      .post('/api/subscriptions')
      .send({
        serviceName: 'myService',
        channel: 'sms',
        userChannelId: '12345'
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Subscription.sendSMS).toHaveBeenCalledTimes(1)
        app.models.Subscription.find(
          {
            where: {
              serviceName: 'myService',
              userChannelId: '12345'
            }
          },
          function(err, data) {
            expect(data[0].unsubscriptionCode).toMatch(/\d{5}/)
            done()
          }
        )
      })
  })

  it('should ignore message supplied by non-admin user when creating a subscription', function(done) {
    request(app)
      .post('/api/subscriptions')
      .send({
        serviceName: 'myService',
        channel: 'email',
        userChannelId: 'nobody@local.invalid',
        confirmationRequest: {
          confirmationCodeRegex: '\\d{5}',
          sendRequest: true,
          from: 'nobody@local.invalid',
          subject: 'spoofed subject',
          textBody: 'spoofed body',
          confirmationCode: '41488'
        }
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Subscription.sendEmail).toHaveBeenCalledTimes(1)
        app.models.Subscription.find(
          {
            where: {
              serviceName: 'myService',
              userChannelId: 'nobody@local.invalid'
            }
          },
          function(err, data) {
            expect(data[0].confirmationRequest.textBody).not.toContain(
              'spoofed'
            )
            expect(
              app.models.Subscription.sendEmail.calls.argsFor(0)[0].subject
            ).not.toContain('spoofed')
            done()
          }
        )
      })
  })

  it('should reject subscriptions with invalid string broadcastPushNotificationFilter', function(done) {
    request(app)
      .post('/api/subscriptions')
      .send({
        serviceName: 'myService',
        channel: 'sms',
        userChannelId: '12345',
        broadcastPushNotificationFilter: "a === 'b'"
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(400)
        app.models.Subscription.find(
          {
            where: {
              serviceName: 'myService',
              userChannelId: '12345'
            }
          },
          function(err, data) {
            expect(data.length).toBe(0)
            done()
          }
        )
      })
  })

  it('should accept subscriptions with valid broadcastPushNotificationFilter', function(done) {
    request(app)
      .post('/api/subscriptions')
      .send({
        serviceName: 'myService',
        channel: 'sms',
        userChannelId: '12345',
        broadcastPushNotificationFilter: "a == 'b'"
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        expect(app.models.Subscription.sendSMS).toHaveBeenCalledTimes(1)
        app.models.Subscription.find(
          {
            where: {
              serviceName: 'myService',
              userChannelId: '12345'
            }
          },
          function(err, data) {
            expect(data[0].unsubscriptionCode).toMatch(/\d{5}/)
            done()
          }
        )
      })
  })

  it('should detect duplicated subscription', function(done) {
    spyOn(app.models.Subscription, 'getMergedConfig').and.callFake(function() {
      const res = {
        detectDuplicatedSubscription: true,
        duplicatedSubscriptionNotification: {
          email: {
            from: 'no_reply@invalid.local',
            subject: 'Duplicated Subscription',
            textBody:
              'A duplicated subscription was submitted and rejected. you will continue receiving notifications. If the request was not created by you, please ignore this message.'
          }
        },
        confirmationRequest: {
          email: {
            confirmationCodeRegex: '\\d{5}',
            sendRequest: true,
            from: 'no_reply@invalid.local',
            subject: 'Subscription confirmation',
            textBody: 'Enter {subscription_confirmation_code} on screen'
          }
        },
        anonymousUnsubscription: {
          code: {
            required: true,
            regex: '\\d{5}'
          }
        }
      }
      let cb = arguments[arguments.length - 1]
      if (typeof cb === 'function') {
        return process.nextTick(cb, null, res)
      } else {
        return res
      }
    })

    app.models.Subscription.create(
      {
        serviceName: 'myService',
        channel: 'email',
        userId: 'bar',
        userChannelId: 'bar@invalid.local',
        state: 'confirmed'
      },
      function(err, res) {
        expect(err).toBeNull()
        request(app)
          .post('/api/subscriptions')
          .send({
            serviceName: 'myService',
            channel: 'email',
            userChannelId: 'bar@invalid.local'
          })
          .set('Accept', 'application/json')
          .end(function(err, res) {
            expect(res.statusCode).toBe(200)
            expect(app.models.Subscription.sendEmail).toHaveBeenCalled()
            expect(
              app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
            ).toContain('A duplicated subscription')
            app.models.Subscription.find(
              {
                where: {
                  serviceName: 'myService',
                  channel: 'email',
                  state: 'unconfirmed',
                  userChannelId: 'bar@invalid.local'
                }
              },
              function(err, data) {
                expect(data.length).toBe(1)
                done()
              }
            )
          })
      }
    )
  })
})

describe('PATCH /subscriptions/{id}', function() {
  beforeEach(function(done) {
    app.models.Subscription.create(
      {
        serviceName: 'myService',
        channel: 'email',
        userId: 'bar',
        userChannelId: 'bar@foo.com',
        state: 'confirmed',
        confirmationRequest: {
          confirmationCodeRegex: '\\d{5}',
          sendRequest: true,
          from: 'no_reply@invlid.local',
          subject: 'Subscription confirmation',
          textBody: 'enter {confirmation_code} in this email',
          confirmationCode: '37688'
        },
        unsubscriptionCode: '50032'
      },
      function(err, res) {
        expect(err).toBeNull()
        done()
      }
    )
  })
  it('should allow sm users change their user channel id', function(done) {
    request(app)
      .patch('/api/subscriptions/1')
      .send({
        userChannelId: 'baz@foo.com'
      })
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function(err, res) {
        expect(res.body.state).toBe('unconfirmed')
        expect(res.body.userChannelId).toBe('baz@foo.com')
        done()
      })
  })
  it("should deny sm user from changing other user's subscription", function(done) {
    request(app)
      .patch('/api/subscriptions/1')
      .send({
        userChannelId: 'baz@foo.com'
      })
      .set('Accept', 'application/json')
      .set('SM_USER', 'baz')
      .end(function(err, res) {
        expect(res.statusCode).toBe(404)
        done()
      })
  })
  it("should deny anonymous user's access", function(done) {
    request(app)
      .patch('/api/subscriptions/1')
      .send({
        userChannelId: 'baz@foo.com'
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })
})

describe('GET /subscriptions/{id}/verify', function() {
  let data
  beforeEach(function(done) {
    parallel(
      [
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService',
              channel: 'email',
              userId: 'bar',
              userChannelId: 'bar@foo.com',
              state: 'unconfirmed',
              confirmationRequest: {
                confirmationCodeRegex: '\\d{5}',
                sendRequest: true,
                from: 'no_reply@invlid.local',
                subject: 'Subscription confirmation',
                textBody: 'enter {confirmation_code} in this email',
                confirmationCode: '37688'
              }
            },
            function(err, res) {
              cb(err, res)
            }
          )
        },
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'unconfirmed',
              confirmationRequest: {
                confirmationCodeRegex: '\\d{5}',
                sendRequest: true,
                from: 'no_reply@invlid.local',
                subject: 'Subscription confirmation',
                textBody: 'enter {confirmation_code} in this email',
                confirmationCode: '37689'
              },
              unsubscriptionCode: '50032'
            },
            function(err, res) {
              cb(err, res)
            }
          )
        }
      ],
      function(err, results) {
        expect(err).toBeNull()
        data = results
        done()
      }
    )
  })

  it('should verify confirmation code sent by sm user', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' + data[0].id + '/verify?confirmationCode=37688'
      )
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[0].id, function(err, res) {
          expect(res.state).toBe('confirmed')
          done()
        })
      })
  })

  it('should verify confirmation code sent by anonymous user', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' + data[1].id + '/verify?confirmationCode=37689'
      )
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[1].id, function(err, res) {
          expect(res.state).toBe('confirmed')
          done()
        })
      })
  })

  it('should deny incorrect confirmation code', function(done) {
    request(app)
      .get('/api/subscriptions/' + data[1].id + '/verify?confirmationCode=0000')
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Subscription.findById(data[1].id, function(err, res) {
          expect(res.state).toBe('unconfirmed')
          done()
        })
      })
  })
})

describe('DELETE /subscriptions/{id}', function() {
  let data
  beforeEach(function(done) {
    parallel(
      [
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService',
              channel: 'email',
              userId: 'bar',
              userChannelId: 'bar@foo.com',
              state: 'confirmed',
              confirmationRequest: {
                confirmationCodeRegex: '\\d{5}',
                sendRequest: true,
                from: 'no_reply@invlid.local',
                subject: 'Subscription confirmation',
                textBody: 'enter {confirmation_code} in this email',
                confirmationCode: '37688'
              }
            },
            function(err, res) {
              cb(err, res)
            }
          )
        },
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'confirmed',
              confirmationRequest: {
                confirmationCodeRegex: '\\d{5}',
                sendRequest: true,
                from: 'no_reply@invlid.local',
                subject: 'Subscription confirmation',
                textBody: 'enter {confirmation_code} in this email',
                confirmationCode: '37689'
              },
              unsubscriptionCode: '50032'
            },
            function(err, res) {
              cb(err, res)
            }
          )
        },
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'unconfirmed',
              confirmationRequest: {
                confirmationCodeRegex: '\\d{5}',
                sendRequest: true,
                from: 'no_reply@invlid.local',
                subject: 'Subscription confirmation',
                textBody: 'enter {confirmation_code} in this email',
                confirmationCode: '37689'
              }
            },
            function(err, res) {
              cb(err, res)
            }
          )
        },
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'redirectAck',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'confirmed',
              unsubscriptionCode: '12345'
            },
            cb
          )
        },
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'redirectAck',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'deleted',
              unsubscriptionCode: '12345'
            },
            cb
          )
        },
        function(cb) {
          app.models.Configuration.create(
            {
              name: 'subscription',
              serviceName: 'redirectAck',
              value: {
                anonymousUnsubscription: {
                  acknowledgements: {
                    onScreen: {
                      redirectUrl: 'http://nowhere'
                    }
                  }
                }
              }
            },
            cb
          )
        }
      ],
      function(err, results) {
        expect(err).toBeNull()
        data = results
        done()
      }
    )
  })

  it('should allow unsubscription by sm user', function(done) {
    request(app)
      .delete('/api/subscriptions/' + data[0].id)
      .set('Accept', 'application/json')
      .set('SM_USER', 'bar')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[0].id, function(err, res) {
          expect(res.state).toBe('deleted')
          done()
        })
      })
  })

  it('should allow unsubscription by anonymous user', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[1].id +
          '/unsubscribe?unsubscriptionCode=50032'
      )
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[1].id, function(err, res) {
          expect(res.state).toBe('deleted')
          done()
        })
      })
  })

  it('should deny unsubscription by anonymous user with incorrect unsubscriptionCode', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[1].id +
          '/unsubscribe?unsubscriptionCode=50033'
      )
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Subscription.findById(data[1].id, function(err, res) {
          expect(res.state).toBe('confirmed')
          done()
        })
      })
  })

  it('should deny unsubscription if state is not confirmed', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[2].id +
          '/unsubscribe?unsubscriptionCode=50033'
      )
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Subscription.findById(data[2].id, function(err, res) {
          expect(res.state).toBe('unconfirmed')
          done()
        })
      })
  })

  it('should deny unsubscription by another sm user', function(done) {
    request(app)
      .delete('/api/subscriptions/' + data[0].id)
      .set('Accept', 'application/json')
      .set('SM_USER', 'baz')
      .end(function(err, res) {
        expect(res.statusCode).toBe(404)
        app.models.Subscription.findById(data[0].id, function(err, res) {
          expect(res.state).toBe('confirmed')
          done()
        })
      })
  })

  it('should redirect onscreen acknowledgements', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[3].id +
          '/unsubscribe?unsubscriptionCode=12345'
      )
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(302)
        expect(res.header.location).toBe('http://nowhere')
        app.models.Subscription.findById(data[3].id, function(err, res) {
          expect(res.state).toBe('deleted')
          done()
        })
      })
  })

  it('should redirect onscreen acknowledgements with error', function(done) {
    spyOn(app.models.Subscription, 'getMergedConfig').and.callFake(
      async function() {
        return {
          anonymousUnsubscription: {
            acknowledgements: {
              onScreen: {
                redirectUrl: 'http://nowhere'
              }
            }
          }
        }
      }
    )

    request(app)
      .get(
        '/api/subscriptions/' +
          data[4].id +
          '/unsubscribe?unsubscriptionCode=12345'
      )
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(302)
        expect(res.header.location).toBe(
          'http://nowhere?err=Error%3A%20Forbidden'
        )
        done()
      })
  })

  it('should display onScreen acknowledgements failureMessage', function(done) {
    spyOn(app.models.Subscription, 'getMergedConfig').and.callFake(
      async function() {
        return {
          anonymousUnsubscription: {
            acknowledgements: {
              onScreen: {
                failureMessage: 'fail'
              }
            }
          }
        }
      }
    )

    request(app)
      .get(
        '/api/subscriptions/' +
          data[4].id +
          '/unsubscribe?unsubscriptionCode=12345'
      )
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(403)
        expect(res.text).toBe('fail')
        expect(res.type).toBe('text/plain')
        done()
      })
  })
})

describe('GET /subscriptions/{id}/unsubscribe', function() {
  let data
  beforeEach(function(done) {
    parallel(
      [
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService1',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'confirmed',
              unsubscriptionCode: '12345'
            },
            cb
          )
        },
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService2',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'confirmed',
              unsubscriptionCode: '54321'
            },
            cb
          )
        },
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService3',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'confirmed',
              unsubscriptionCode: '11111'
            },
            cb
          )
        }
      ],
      function(err, results) {
        expect(err).toBeNull()
        data = results
        done()
      }
    )
  })

  it('should allow bulk unsubscribing all services', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[0].id +
          '/unsubscribe?unsubscriptionCode=12345&additionalServices=_all'
      )
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.find(
          {
            where: {
              state: 'deleted'
            }
          },
          function(err, res) {
            expect(res.length).toBe(3)
            expect(
              app.models.Subscription.sendEmail.calls.argsFor(0)[0].text
            ).toContain('services myService1, myService2 and myService3')
            done()
          }
        )
      })
  })

  it('should allow bulk unsubscribing selcted additional service', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[0].id +
          '/unsubscribe?unsubscriptionCode=12345&additionalServices=myService3'
      )
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.find(
          {
            where: {
              state: 'deleted'
            }
          },
          function(err, res) {
            expect(res.length).toBe(2)
            done()
          }
        )
      })
  })

  it('should allow bulk unsubscribing selcted additional service as an array', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[0].id +
          '/unsubscribe?unsubscriptionCode=12345&additionalServices=["myService3"]'
      )
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.find(
          {
            where: {
              state: 'deleted'
            }
          },
          function(err, res) {
            expect(res.length).toBe(2)
            done()
          }
        )
      })
  })
})

describe('GET /subscriptions/{id}/unsubscribe/undo', function() {
  let data
  beforeEach(function(done) {
    parallel(
      [
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'deleted',
              unsubscriptionCode: '50032'
            },
            cb
          )
        },
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'unconfirmed',
              confirmationRequest: {
                confirmationCodeRegex: '\\d{5}',
                sendRequest: true,
                from: 'no_reply@invlid.local',
                subject: 'Subscription confirmation',
                textBody: 'enter {confirmation_code} in this email',
                confirmationCode: '37689'
              },
              unsubscriptionCode: '50032'
            },
            function(err, res) {
              cb(err, res)
            }
          )
        },
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService2',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'deleted',
              unsubscriptionCode: '12345',
              unsubscribedAdditionalServices: {
                names: ['myService'],
                ids: [1]
              }
            },
            cb
          )
        }
      ],
      function(err, results) {
        expect(err).toBeNull()
        data = results
        done()
      }
    )
  })

  it('should allow undelete subscription by anonymous user', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[0].id +
          '/unsubscribe/undo?unsubscriptionCode=50032'
      )
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[0].id, function(err, res) {
          expect(res.state).toBe('confirmed')
          done()
        })
      })
  })

  it('should forbid undelete subscription by anonymous user with incorrect unsubscriptionCode', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[0].id +
          '/unsubscribe/undo?unsubscriptionCode=50033'
      )
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Subscription.findById(data[0].id, function(err, res) {
          expect(res.state).toBe('deleted')
          done()
        })
      })
  })

  it('should forbid undelete subscription where state is not deleted', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[1].id +
          '/unsubscribe/undo?unsubscriptionCode=50032'
      )
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(403)
        app.models.Subscription.findById(data[1].id, function(err, res) {
          expect(res.state).toBe('unconfirmed')
          done()
        })
      })
  })

  it('should redirect response if set so', function(done) {
    app.models.Configuration.create(
      {
        name: 'subscription',
        serviceName: 'myService',
        value: {
          anonymousUndoUnsubscription: {
            redirectUrl: 'http://nowhere'
          }
        }
      },
      function(err, res) {
        request(app)
          .get(
            '/api/subscriptions/' +
              data[0].id +
              '/unsubscribe/undo?unsubscriptionCode=50032'
          )
          .end(function(err, res) {
            expect(res.statusCode).toBe(302)
            expect(res.headers.location).toBe('http://nowhere')
            app.models.Subscription.findById(data[0].id, function(err, res) {
              expect(res.state).toBe('confirmed')
              done()
            })
          })
      }
    )
  })

  it('should allow bulk undo unsubscriptions by anonymous user', function(done) {
    request(app)
      .get(
        '/api/subscriptions/' +
          data[2].id +
          '/unsubscribe/undo?unsubscriptionCode=12345'
      )
      .end(function(err, res) {
        expect(res.statusCode).toBe(200)
        app.models.Subscription.findById(data[0].id, function(err, res) {
          expect(res.state).toBe('confirmed')
          app.models.Subscription.findById(data[2].id, function(err, res) {
            expect(res.unsubscribedAdditionalServices).toBeUndefined()
            done()
          })
        })
      })
  })
})

describe('PUT /subscriptions/{id}', function() {
  beforeEach(function(done) {
    app.models.Subscription.create(
      {
        serviceName: 'myService',
        channel: 'email',
        userId: 'bar',
        userChannelId: 'bar@invalid.local',
        state: 'confirmed',
        confirmationRequest: {
          confirmationCodeRegex: '\\d{5}',
          sendRequest: true,
          from: 'no_reply@invlid.local',
          subject: 'Subscription confirmation',
          textBody: 'enter {confirmation_code} in this email',
          confirmationCode: '37688'
        },
        unsubscriptionCode: '50032'
      },
      function(err, res) {
        expect(err).toBeNull()
        done()
      }
    )
  })
  it('should allow admin user replace subscription', function(done) {
    spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function() {
      return true
    })
    request(app)
      .put('/api/subscriptions/1')
      .send({
        serviceName: 'myService',
        channel: 'email',
        userId: 'bar',
        userChannelId: 'bar@invalid.local',
        state: 'deleted',
        unsubscriptionCode: '50033'
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.body.state).toBe('deleted')
        expect(res.body.confirmationRequest).toBeUndefined()
        done()
      })
  })
  it('should deny anonymous user replace subscription', function(done) {
    request(app)
      .put('/api/subscriptions/1')
      .send({
        serviceName: 'myService',
        channel: 'email',
        userId: 'bar',
        userChannelId: 'bar@invalid.local',
        state: 'deleted',
        unsubscriptionCode: '50032'
      })
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })
})

describe('GET /subscriptions/services', function() {
  beforeEach(function(done) {
    app.models.Subscription.create(
      {
        serviceName: 'myService',
        channel: 'email',
        userId: 'bar',
        userChannelId: 'bar@invalid.local',
        state: 'confirmed',
        confirmationRequest: {
          confirmationCodeRegex: '\\d{5}',
          sendRequest: true,
          from: 'no_reply@invlid.local',
          subject: 'Subscription confirmation',
          textBody: 'enter {confirmation_code} in this email',
          confirmationCode: '37688'
        },
        unsubscriptionCode: '50032'
      },
      function(err, res) {
        expect(err).toBeNull()
        done()
      }
    )
  })
  it(`should allow admin user's access`, function(done) {
    spyOn(app.models.Subscription, 'isAdminReq').and.callFake(function() {
      return true
    })
    request(app)
      .get('/api/subscriptions/services')
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.body instanceof Array).toBe(true)
        expect(res.body.length).toBe(1)
        done()
      })
  })
  it("should deny anonymous user's access", function(done) {
    request(app)
      .get('/api/subscriptions/services')
      .set('Accept', 'application/json')
      .end(function(err, res) {
        expect(res.statusCode).toBe(403)
        done()
      })
  })
})
