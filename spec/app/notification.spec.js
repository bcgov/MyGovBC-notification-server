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
