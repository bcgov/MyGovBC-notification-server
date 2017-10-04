let app
const parallel = require('async/parallel')
const request = require('supertest')
const SMTPConnection = require('smtp-connection')
let smtpSvrImport
let smtpSvr
let origRequest
let port
beforeAll(done => {
  require('../../server/server.js')(function(err, data) {
    app = data
    smtpSvrImport = require('../../server/smtp-server')
    smtpSvr = smtpSvrImport.server
    origRequest = smtpSvrImport.request
    port = smtpSvr.server.address().port
    done()
  })
})

describe('list-unsubscribe by email', function() {
  let connection
  beforeEach(function(done) {
    spyOn(smtpSvr, 'onRcptTo').and.callThrough()
    spyOn(smtpSvr, 'onData').and.callThrough()
    connection = new SMTPConnection({
      port: port,
      secure: true,
      tls: {
        rejectUnauthorized: false
      }
    })

    parallel(
      [
        function(cb) {
          app.models.Subscription.create(
            {
              serviceName: 'myService',
              channel: 'email',
              userChannelId: 'bar@foo.com',
              state: 'confirmed',
              unsubscriptionCode: '12345'
            },
            function(err, res) {
              cb(err, res)
            }
          )
        }
      ],
      function(err, results) {
        expect(err).toBeNull()
        done()
      }
    )
  })

  it('should accept valid email', function(done) {
    spyOn(origRequest, 'get').and.callFake(function() {
      let getReq = request(app).get(
        arguments[0].url.substring(arguments[0].url.indexOf('/api'))
      )
      for (let p in arguments[0].headers) {
        if (arguments[0].headers.hasOwnProperty(p)) {
          getReq.set(p, arguments[0].headers[p])
        }
      }
      getReq.end((err, res) => {
        expect(err).toBeNull()
        app.models.Subscription.findById(1, function(err, data) {
          expect(data.state).toBe('deleted')
          done()
        })
      })
    })
    expect(port).toBeGreaterThan(0)
    connection.connect(() => {
      connection.send(
        { from: 'bar@foo.com', to: 'un-1-12345@invalid.local' },
        'unsubscribe',
        (err, info) => {
          expect(err).toBeNull()
          expect(info.accepted.length).toBe(1)
          expect(smtpSvr.onRcptTo).toHaveBeenCalled()
          expect(smtpSvr.onData).toHaveBeenCalled()
          expect(origRequest.get).toHaveBeenCalledWith({
            url:
              'http://localhost:3000/api/subscriptions/1/unsubscribe?unsubscriptionCode=12345&userChannelId=bar%40foo.com',
            headers: {
              /*jshint camelcase: false */
              is_anonymous: true
            }
          })
        }
      )
    })
  })

  it('should reject email of invalid local-part pattern', function(done) {
    connection.connect(() => {
      connection.send(
        { from: 'bar@foo.com', to: 'undo-1-12345@invalid.local' },
        'unsubscribe',
        (err, info) => {
          expect(err.rejected.length).toBe(1)
          expect(smtpSvr.onRcptTo).toHaveBeenCalled()
          expect(smtpSvr.onData).not.toHaveBeenCalled()
          done()
        }
      )
    })
  })

  it('should reject email of invalid domain', function(done) {
    connection.connect(() => {
      connection.send(
        { from: 'bar@foo.com', to: 'un-1-12345@valid.local' },
        'unsubscribe',
        (err, info) => {
          expect(err.rejected.length).toBe(1)
          expect(smtpSvr.onRcptTo).toHaveBeenCalled()
          expect(smtpSvr.onData).not.toHaveBeenCalled()
          done()
        }
      )
    })
  })
})
