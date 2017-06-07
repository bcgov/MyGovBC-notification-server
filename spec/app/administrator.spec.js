'use strict'
var request = require('supertest')
var app = require('../../server/server.js')

describe('administrator', function () {
  it('should be allowed to create, login, get access token, and then use it to post notification', function (done) {
    spyOn(app.models.Administrator, 'isAdminReq').and.callFake(function () {
      return true
    })
    request(app).post('/api/administrators')
      .send({
        email: 'bar@foo.com',
        password: 'p'
      })
      .set('Accept', 'application/json')
      .end(function (err, res) {
        expect(res.statusCode).toBe(200)
        request(app).post('/api/administrators/login')
          .send({
            email: 'bar@foo.com',
            password: 'p'
          })
          .set('Accept', 'application/json')
          .end(function (err, res) {
            expect(res.statusCode).toBe(200)
            expect(res.body.id).not.toBeNull()
            app.models.Administrator.isAdminReq = jasmine.createSpy().and.callThrough()
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
              .set('Authorization', res.body.id)
              .end(function (err, res) {
                expect(res.statusCode).toBe(200)
                done()
              })
          })
      })
  })
})
