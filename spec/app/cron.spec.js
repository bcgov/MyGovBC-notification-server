'use strict'
var app = require('../../server/server.js')
var cronTask = require('../../common/helpers').cronTask
var parallel = require('async/parallel')

describe('CRON', function () {
  beforeEach(function (done) {
    parallel([
      function (cb) {
        app.models.Notification.create({
          "channel": "email",
          "isBroadcast": true,
          "message": {
            "title": "test",
            "body": "this is a test"
          },
          "serviceName": "pastService",
          "created": "2010-01-01",
          "state": "sent"
        }, function (err, res) {
          cb(err, res)
        })
      },
      function (cb) {
        app.models.Notification.create({
          "channel": "email",
          "isBroadcast": true,
          "message": {
            "title": "test",
            "body": "this is a test"
          },
          "serviceName": "futureService",
          "created": "2020-01-01",
          "state": "sent"
        }, function (err, res) {
          cb(err, res)
        })
      }
    ], function (err, results) {
      expect(err).toBeNull()
      done()
    })
  })

  it('should deleted old non-inApp notifications', function (done) {
    cronTask(app, function (err, results) {
      expect(err).toBeNull()
      parallel([
        function (cb) {
          app.models.Notification.find({where: {serviceName: "futureService"}}, function (err, data) {
            expect(data.length).toBe(1)
            cb(err, data)
          })
        },
        function (cb) {
          app.models.Notification.find({where: {serviceName: "pastService"}}, function (err, data) {
            expect(data.length).toBe(0)
            cb(err, data)
          })
        }
      ], function (err, results) {
        expect(err).toBeNull()
        done()
      })
    })
  })
})
