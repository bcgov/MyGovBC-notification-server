'use strict'
var request = require('supertest')
var app = require('../../server/server.js')

describe('GET /configuration', function() {
  beforeEach(function(done) {
    app.models.Configuration.create(
      {
        name: 'subscription',
        serviceName: 'myService',
        value: {
          confirmationRequest: {
            sms: {
              textBody: 'enter {confirmation_code}!'
            },
            email: {
              textBody: 'enter {confirmation_code} in email!'
            }
          },
          anonymousUndoUnsubscription: {
            successMessage: 'You have been re-subscribed.',
            failureMessage: 'Error happened while re-subscribing.'
          }
        }
      },
      function(err, res) {
        expect(err).toBeNull()
        done()
      }
    )
  })
  it('should be forbidden by anonymous user', function(done) {
    request(app).get('/api/configurations').end(function(err, res) {
      expect(res.statusCode).toBe(403)
      done()
    })
  })
  it('should be allowed by admin user', function(done) {
    spyOn(app.models.Configuration, 'isAdminReq').and.callFake(function() {
      return true
    })
    request(app).get('/api/configurations').end(function(err, res) {
      expect(res.statusCode).toBe(200)
      done()
    })
  })
})
