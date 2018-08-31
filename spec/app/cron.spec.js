let app
var cronTasks = require('../../server/cron-tasks')
var parallel = require('async/parallel')
var path = require('path')
var fs = require('fs')
beforeAll(done => {
  require('../../server/server.js')(function (err, data) {
    app = data
    done()
  })
})

describe('CRON purgeData', function () {
  beforeEach(function (done) {
    spyOn(app.models.Subscription, 'updateTimestamp').and.callFake(function (ctx, next) {
      return next()
    })
    parallel(
      [
        function (cb) {
          app.models.Notification.create({
              channel: 'email',
              isBroadcast: true,
              message: {
                title: 'test',
                body: 'this is a test'
              },
              serviceName: 'pastService',
              created: '2010-01-01',
              state: 'sent'
            },
            function (err, res) {
              cb(err, res)
            }
          )
        },
        function (cb) {
          app.models.Notification.create({
              channel: 'email',
              isBroadcast: true,
              message: {
                title: 'test',
                body: 'this is a test'
              },
              serviceName: 'futureService',
              created: '2020-01-01',
              state: 'sent'
            },
            function (err, res) {
              cb(err, res)
            }
          )
        },
        function (cb) {
          app.models.Notification.create({
              channel: 'inApp',
              isBroadcast: true,
              message: {
                title: 'test',
                body: 'this is a test'
              },
              serviceName: 'expiredService',
              validTill: '2010-01-01',
              state: 'new'
            },
            function (err, res) {
              cb(err, res)
            }
          )
        },
        function (cb) {
          app.models.Notification.create({
              channel: 'inApp',
              isBroadcast: true,
              message: {
                title: 'test',
                body: 'this is a test'
              },
              serviceName: 'nonexpiredService',
              validTill: '3010-01-01',
              state: 'new'
            },
            function (err, res) {
              cb(err, res)
            }
          )
        },
        function (cb) {
          app.models.Notification.create({
              channel: 'inApp',
              userId: 'foo',
              message: {
                title: 'test',
                body: 'this is a test'
              },
              serviceName: 'deletedService',
              state: 'deleted'
            },
            function (err, res) {
              cb(err, res)
            }
          )
        },
        function (cb) {
          app.models.Subscription.create({
              serviceName: 'unconfirmedService',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'unconfirmed',
              confirmationRequest: {
                confirmationCodeRegex: '\\d{5}',
                sendRequest: true,
                from: 'no_reply@invlid.local',
                subject: 'Subscription confirmation',
                textBody: 'enter {confirmation_code} in email!',
                confirmationCode: '53007'
              },
              updated: '2010-01-01'
            },
            function (err, res) {
              cb(err, res)
            }
          )
        }
      ],
      function (err, results) {
        expect(err).toBeNull()
        done()
      }
    )
  })

  it('should deleted old non-inApp notifications', function (done) {
    cronTasks.purgeData(app, function (err, results) {
      expect(err).toBeNull()
      parallel(
        [
          function (cb) {
            app.models.Notification.find({
                where: {
                  serviceName: 'futureService',
                  channel: 'email'
                }
              },
              function (err, data) {
                expect(data.length).toBe(1)
                cb(err, data)
              }
            )
          },
          function (cb) {
            app.models.Notification.find({
                where: {
                  serviceName: 'pastService',
                  channel: 'email'
                }
              },
              function (err, data) {
                expect(data.length).toBe(0)
                cb(err, data)
              }
            )
          }
        ],
        function (err, results) {
          expect(err).toBeNull()
          done()
        }
      )
    })
  })

  it('should delete all expired inApp notifications', function (done) {
    cronTasks.purgeData(app, function (err, results) {
      expect(err).toBeNull()
      parallel(
        [
          function (cb) {
            app.models.Notification.find({
                where: {
                  serviceName: 'nonexpiredService',
                  channel: 'inApp'
                }
              },
              function (err, data) {
                expect(data.length).toBe(1)
                cb(err, data)
              }
            )
          },
          function (cb) {
            app.models.Notification.find({
                where: {
                  serviceName: 'expiredService',
                  channel: 'inApp'
                }
              },
              function (err, data) {
                expect(data.length).toBe(0)
                cb(err, data)
              }
            )
          }
        ],
        function (err, results) {
          expect(err).toBeNull()
          done()
        }
      )
    })
  })

  it('should delete all deleted inApp notifications', function (done) {
    cronTasks.purgeData(app, function (err, results) {
      expect(err).toBeNull()
      parallel(
        [
          function (cb) {
            app.models.Notification.find({
                where: {
                  serviceName: 'deletedService',
                  channel: 'inApp'
                }
              },
              function (err, data) {
                expect(data.length).toBe(0)
                cb(err, data)
              }
            )
          }
        ],
        function (err, results) {
          expect(err).toBeNull()
          done()
        }
      )
    })
  })

  it('should delete all old non-confirmed subscriptions', function (done) {
    cronTasks.purgeData(app, function (err, results) {
      expect(err).toBeNull()
      parallel(
        [
          function (cb) {
            app.models.Subscription.find({
                where: {
                  serviceName: 'unconfirmedService',
                  channel: 'email'
                }
              },
              function (err, data) {
                expect(data.length).toBe(0)
                cb(err, data)
              }
            )
          }
        ],
        function (err, results) {
          expect(err).toBeNull()
          done()
        }
      )
    })
  })
})

describe('CRON dispatchLiveNotifications', function () {
  beforeEach(function (done) {
    parallel(
      [
        function (cb) {
          app.models.Notification.create({
              channel: 'email',
              message: {
                from: 'admin@foo.com',
                subject: 'test',
                textBody: 'this is a test {http_host}'
              },
              isBroadcast: true,
              serviceName: 'myService',
              httpHost: 'http://foo.com',
              asyncBroadcastPushNotification: false,
              invalidBefore: '2010-01-01',
              state: 'new'
            },
            function (err, res) {
              cb(err, res)
            }
          )
        },
        function (cb) {
          app.models.Notification.create({
              channel: 'email',
              message: {
                from: 'admin@foo.com',
                subject: 'test',
                textBody: 'this is another test {http_host}'
              },
              serviceName: 'myService',
              httpHost: 'http://foo.com',
              userChannelId: 'bar@foo.com',
              invalidBefore: '3010-01-01',
              state: 'new'
            },
            function (err, res) {
              cb(err, res)
            }
          )
        },
        function (cb) {
          app.models.Subscription.create({
              serviceName: 'myService',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'confirmed',
              unsubscriptionCode: '12345'
            },
            function (err, res) {
              cb(err, res)
            }
          )
        }
      ],
      function (err, results) {
        expect(err).toBeNull()
        done()
      }
    )
  })

  it('should send all live push notifications', function (done) {
    cronTasks.dispatchLiveNotifications(app, function (err, results) {
      expect(err).toBeNull()
      expect(results.length).toBe(1)
      expect(app.models.Notification.sendEmail).toHaveBeenCalledWith(jasmine.objectContaining({
          from: 'admin@foo.com',
          to: 'bar@foo.com',
          subject: 'test',
          text: 'this is a test http://foo.com',
          html: undefined,
          list: {
            id: 'http://foo.com/myService',
            unsubscribe: [
              [
                'un-1-12345@invalid.local',
                'http://foo.com/api/subscriptions/1/unsubscribe?unsubscriptionCode=12345'
              ]
            ]
          }
        }),
        jasmine.any(Function)
      )
      expect(app.models.Notification.sendEmail).toHaveBeenCalledTimes(1)
      parallel(
        [
          function (cb) {
            app.models.Notification.find({
                where: {
                  serviceName: 'myService',
                  channel: 'email',
                  state: 'sent'
                }
              },
              function (err, data) {
                expect(data.length).toBe(1)
                cb(err, data)
              }
            )
          }
        ],
        function (err, results) {
          expect(err).toBeNull()
          done()
        }
      )
    })
  })
})

describe('CRON checkRssConfigUpdates', function () {
  beforeEach(function (done) {
    spyOn(cronTasks, 'request').and.callFake(function () {
      var output = fs.createReadStream(__dirname + path.sep + 'rss.xml')
      setTimeout(function () {
        output.emit('response', {
          statusCode: 200
        })
      }, 0)
      return output
    })
    spyOn(cronTasks.request, 'post')
    parallel(
      [
        function (cb) {
          app.models.Configuration.create({
              name: 'notification',
              serviceName: 'myService',
              value: {
                rss: {
                  url: 'http://myService/rss',
                  timeSpec: '0 0 1 0 0',
                  outdatedItemRetentionGenerations: 1,
                  includeUpdatedItems: false,
                  fieldsToCheckForUpdate: ['title']
                },
                messageTemplates: {
                  email: {
                    from: 'no_reply@invlid.local',
                    subject: '{title}',
                    textBody: '{description}',
                    htmlBody: '{description}'
                  }
                },
                httpHost: 'http://foo'
              }
            },
            function (err, res) {
              cb(err, res)
            }
          )
        },
        function (cb) {
          app.models.Subscription.create({
              serviceName: 'myService',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'confirmed',
              unsubscriptionCode: '12345'
            },
            function (err, res) {
              cb(err, res)
            }
          )
        }
      ],
      function (err, results) {
        expect(err).toBeNull()
        done()
      }
    )
  })

  it('should create rss task and post notifications at initial run', function (
    done
  ) {
    cronTasks.checkRssConfigUpdates(app, function (err, rssTasks) {
      expect(err).toBeNull()
      expect(rssTasks['1']).not.toBeNull()
      expect(cronTasks.request.post).toHaveBeenCalledTimes(1)
      let joc = jasmine.objectContaining
      expect(cronTasks.request.post).toHaveBeenCalledWith(
        joc({
          json: joc({
            httpHost: 'http://foo'
          })
        })
      )
      app.models.Rss.find((err, results) => {
        expect(results[0].items[0].author).toBe('foo')
        done()
      })
    })
  })

  it('should avoid sending notification for unchanged items', function (done) {
    app.models.Rss.create({
        serviceName: 'myService',
        items: [{
            title: 'Item 2',
            description: 'lorem ipsum',
            summary: 'lorem ipsum',
            pubDate: '1970-01-01T00:00:00.000Z',
            link: 'http://myservice/2',
            guid: '2',
            author: 'foo',
            _notifyBCLastPoll: '1970-01-01T00:00:00.000Z'
          },
          {
            title: 'Item 1',
            description: 'lorem ipsum',
            summary: 'lorem ipsum',
            pubDate: '1970-01-01T00:00:00.000Z',
            link: 'http://myservice/1',
            guid: '1',
            author: 'foo',
            _notifyBCLastPoll: '1970-01-01T00:00:00.000Z'
          }
        ],
        lastPoll: '1970-01-01T00:00:00.000Z'
      },
      function (err, res) {
        cronTasks.checkRssConfigUpdates(app, function (err, rssTasks) {
          expect(cronTasks.request.post).not.toHaveBeenCalled()
          app.models.Rss.find((err, results) => {
            expect(results[0].items[0].author).toBe('foo')
            done()
          })
        })
      }
    )
  })

  it('should send notification for updated item', function (done) {
    parallel(
      [
        function (cb) {
          app.models.Configuration.findById(1, function (err, res) {
            let newVal = res.value
            newVal.rss.includeUpdatedItems = true
            newVal.rss.outdatedItemRetentionGenerations = 100
            res.updateAttribute('value', newVal, cb)
          })
        },
        function (cb) {
          app.models.Rss.create({
              serviceName: 'myService',
              items: [{
                title: 'Item',
                description: 'lorem ipsum',
                pubDate: '1970-01-01T00:00:00.000Z',
                link: 'http://myservice/1',
                guid: '1',
                author: 'foo',
                _notifyBCLastPoll: '1970-01-01T00:00:00.000Z'
              }],
              lastPoll: '1970-01-01T00:00:00.000Z'
            },
            cb
          )
        }
      ],
      function (err, results) {
        cronTasks.checkRssConfigUpdates(app, function (err, rssTasks) {
          expect(cronTasks.request.post).toHaveBeenCalledTimes(1)
          done()
        })
      }
    )
  })

  it('should handle error', function (done) {
    cronTasks.request = jasmine.createSpy().and.callFake(function () {
      var output = fs.createReadStream(__dirname + path.sep + 'rss.xml')
      setTimeout(function () {
        output.emit('response', {
          statusCode: 300
        })
      }, 0)
      return output
    })

    cronTasks.checkRssConfigUpdates(app, function (err, rssTasks) {
      expect(err).not.toBeNull()
      expect(rssTasks['1']).not.toBeNull()
      done()
    })
  })
})

describe('CRON deleteBounces', function () {
  it('should delete bounce records in which no messages since latestNotificationStarted', async function (done) {
    await app.models.Bounce.create({
      "channel": "email",
      "userChannelId": "foo@invalid.local",
      "count": 6,
      "state": "active",
      "latestNotificationStarted": "2018-09-30T17:27:44.501Z",
      "latestNotificationEnded": "2018-07-30T17:27:45.261Z",
      "bounceMessages": [{
        "date": "2018-08-30T17:27:45.784Z",
        "message": "blah"
      }]
    })
    cronTasks.deleteBounces(app, async function (err, results) {
      expect(err).toBeNull()
      let item = await app.models.Bounce.findById(1)
      expect(item.state).toBe('deleted')
      done()
    })
  })
  it('should not delete bounce records in which there are messages since latestNotificationStarted', async function (done) {
    await app.models.Bounce.create({
      "channel": "email",
      "userChannelId": "foo@invalid.local",
      "count": 6,
      "state": "active",
      "latestNotificationStarted": "2018-07-30T17:27:44.501Z",
      "latestNotificationEnded": "2018-07-30T17:27:45.261Z",
      "bounceMessages": [{
        "date": "2018-08-30T17:27:45.784Z",
        "message": "blah"
      }]
    })
    cronTasks.deleteBounces(app, async function (err, results) {
      expect(err).toBeNull()
      let item = await app.models.Bounce.findById(1)
      expect(item.state).toBe('active')
      done()
    })
  })
})
