const app = require('../../server/server.js')
const parallel = require('async/parallel')
const smtpSvrImport = require('../../server/smtp-server')
const smtpSvr = smtpSvrImport.server
const origRequest = smtpSvrImport.request
let request = require('supertest')
const SMTPConnection = require('smtp-connection')

describe('list-unsubscribe by email', function() {
  beforeEach(function(done) {
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
    spyOn(smtpSvr, 'onRcptTo').and.callThrough()
    spyOn(smtpSvr, 'onData').and.callThrough()
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
    let port = smtpSvr.server.address().port
    expect(port).toBeGreaterThan(0)
    let connection = new SMTPConnection({
      port: port,
      tls: {
        rejectUnauthorized: false
      }
    })
    connection.connect(() => {
      connection.send(
        { from: 'bar@foo.com', to: 'un-1-12345@local.invalid' },
        'unsubscribe',
        (err, info) => {
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
})
