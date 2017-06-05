'use strict'
var app = require('../../server/server.js')
var cronTasks = require('../../server/cron-tasks')
var parallel = require('async/parallel')

describe('CRON purgeData', function () {
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
      },
      function (cb) {
        app.models.Notification.create({
          "channel": "inApp",
          "isBroadcast": true,
          "message": {
            "title": "test",
            "body": "this is a test"
          },
          "serviceName": "expiredService",
          "validTill": "2010-01-01",
          "state": "new"
        }, function (err, res) {
          cb(err, res)
        })
      },
      function (cb) {
        app.models.Notification.create({
          "channel": "inApp",
          "isBroadcast": true,
          "message": {
            "title": "test",
            "body": "this is a test"
          },
          "serviceName": "nonexpiredService",
          "validTill": "3010-01-01",
          "state": "new"
        }, function (err, res) {
          cb(err, res)
        })
      },
      function (cb) {
        app.models.Notification.create({
          "channel": "inApp",
          "userId": "foo",
          "message": {
            "title": "test",
            "body": "this is a test"
          },
          "serviceName": "deletedService",
          "state": "deleted"
        }, function (err, res) {
          cb(err, res)
        })
      },
      function (cb) {
        app.models.Subscription.create({
          "serviceName": "unconfirmedService",
          "channel": "email",
          "userChannelId": "bar@foo.com",
          "state": "unconfirmed",
          "confirmationRequest": {
            "confirmationCodeRegex": "\\d{5}",
            "sendRequest": true,
            "from": "no_reply@example.com",
            "subject": "Subscription confirmation",
            "textBody": "enter {confirmation_code} in email!",
            "confirmationCode": "53007"
          },
          "updated": "2010-01-01",
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
    cronTasks.purgeData(app, function (err, results) {
      expect(err).toBeNull()
      parallel([
        function (cb) {
          app.models.Notification.find({where: {serviceName: "futureService", channel: 'email'}}, function (err, data) {
            expect(data.length).toBe(1)
            cb(err, data)
          })
        },
        function (cb) {
          app.models.Notification.find({where: {serviceName: "pastService", channel: 'email'}}, function (err, data) {
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

  it('should delete all expired inApp notifications', function (done) {
    cronTasks.purgeData(app, function (err, results) {
      expect(err).toBeNull()
      parallel([
        function (cb) {
          app.models.Notification.find({
            where: {
              serviceName: "nonexpiredService",
              channel: 'inApp'
            }
          }, function (err, data) {
            expect(data.length).toBe(1)
            cb(err, data)
          })
        },
        function (cb) {
          app.models.Notification.find({
            where: {
              serviceName: "expiredService",
              channel: 'inApp'
            }
          }, function (err, data) {
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

  it('should delete all deleted inApp notifications', function (done) {
    cronTasks.purgeData(app, function (err, results) {
      expect(err).toBeNull()
      parallel([
        function (cb) {
          app.models.Notification.find({
            where: {
              serviceName: "deletedService",
              channel: 'inApp'
            }
          }, function (err, data) {
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

  xit('should delete all old non-confirmed subscriptions', function (done) {
    cronTasks.purgeData(app, function (err, results) {
      expect(err).toBeNull()
      parallel([
        function (cb) {
          app.models.Subscription.find({
            where: {
              serviceName: "unconfirmedService",
              channel: 'email'
            }
          }, function (err, data) {
            // todo: need to figure out how to disable 'before save' operation hook in common.js first
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


describe('CRON dispatchLiveNotifications', function () {
  beforeEach(function (done) {
    parallel([
      function (cb) {
        app.models.Notification.create({
          "channel": "email",
          "message": {
            "from": "admin@foo.com",
            "subject": "test",
            "textBody": "this is a test {http_host}"
          },
          "isBroadcast": true,
          "serviceName": "myService",
          "httpHost": "http://foo.com",
          "invalidBefore": "2010-01-01",
          "state": "new"
        }, function (err, res) {
          cb(err, res)
        })
      },
      function (cb) {
        app.models.Notification.create({
          "channel": "email",
          "message": {
            "from": "admin@foo.com",
            "subject": "test",
            "textBody": "this is another test {http_host}"
          },
          "serviceName": "myService",
          "httpHost": "http://foo.com",
          "userChannelId": "bar@foo.com",
          "invalidBefore": "3010-01-01",
          "state": "new"
        }, function (err, res) {
          cb(err, res)
        })
      },
      function (cb) {
        app.models.Subscription.create({
          "serviceName": "myService",
          "channel": "email",
          "userChannelId": "bar@foo.com",
          "state": "confirmed"
        }, function (err, res) {
          cb(err, res)
        })
      }
    ], function (err, results) {
      expect(err).toBeNull()
      done()
    })
  })

  it('should send all live push notifications', function (done) {
    cronTasks.dispatchLiveNotifications(app, function (err, results) {
      expect(err).toBeNull()
      expect(results.length).toBe(1)
      expect(app.models.Notification.sendEmail).toHaveBeenCalledWith('admin@foo.com', 'bar@foo.com', 'test', 'this is a test http://foo.com', undefined, jasmine.any(Function))
      expect(app.models.Notification.sendEmail).toHaveBeenCalledTimes(1)
      parallel([
        function (cb) {
          app.models.Notification.find({
            where: {
              serviceName: "myService",
              channel: 'email',
              state: 'sent'
            }
          }, function (err, data) {
            expect(data.length).toBe(1)
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
