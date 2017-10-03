const app = require('../../server/server.js')
const parallel = require('async/parallel')
const smtpSvrImport = require('../../server/smtp-server')
const smtpSvr = smtpSvrImport.server
const request = smtpSvrImport.request
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
    spyOn(request, 'get').and.callFake(function() {
      return
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
          expect(request.get).toHaveBeenCalledWith({
            url:
              'http://localhost:3000/api/subscriptions/1/unsubscribe?unsubscriptionCode=12345&userChannelId=bar%40foo.com',
            headers: {
              /*jshint camelcase: false */
              is_anonymous: true
            }
          })
          done()
        }
      )
    })
  })
})
