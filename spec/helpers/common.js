'use strict'
var app = require('../../server/server.js')
beforeAll(() => {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000
  app.set('adminIps', [])
})

beforeEach(function (done) {
  function failSendEmail() {
    let cb = arguments[arguments.length - 1]
    console.log('faking sendEmail')
    return cb(null, null)
  }

  function failSendSMS() {
    let cb = arguments[arguments.length - 1]
    console.log('faking sendSMS')
    return cb(null, null)
  }

  spyOn(app.models.Subscription, 'sendEmail').and.callFake(failSendEmail)
  spyOn(app.models.Subscription, 'sendSMS').and.callFake(failSendSMS)
  spyOn(app.models.Notification, 'sendEmail').and.callFake(failSendEmail)
  spyOn(app.models.Notification, 'sendSMS').and.callFake(failSendSMS)
  app.dataSources.db.automigrate(function (err) {
    expect(err).toBeUndefined()
    done()
  })
})
