---
layout: docs
title: SMS
permalink: /docs/config-sms/
---

_NotifyBC_ depends on underlying SMS service providers to deliver SMS messages. The supported service providers are

- [Twilio](https://twilio.com/) (default)
- [Swift](https://www.swiftsmsgateway.com)

Only one service provider can be chosen per installation. To change service provider, add following _smsServiceProvider_ config object to file _/server/config.local.js_

```js
module.exports = {
  ...
  smsServiceProvider: 'swift'
}
```

The rest configs are service provider specific. You should have an account with the chosen service provider before proceeding.

## Twilio

Add _sms.twilio_ config object to file _/server/config.local.js_

```js
module.exports = {
  sms: {
    twilio: {
      accountSid: '<AccountSid>',
      authToken: '<AuthToken>',
      fromNumber: '<FromNumber>',
    },
  },
}
```

Obtain _\<AccountSid\>_, _\<AuthToken\>_ and _\<FromNumber\>_ from your Twilio account.

## Swift

Add _sms.swift_ config object to file _/server/config.local.js_

```js
module.exports = {
  sms: {
    swift: {
      accountKey: '<accountKey>',
    },
  },
}
```

Obtain _\<accountKey\>_ from your Swift account.

### Unsubscription by replying a keyword

With Swift short code, sms user can unsubscribe by replying to a sms message with a keyword. The keyword must be pre-registered with Swift.

To enable this feature, 

1. Generate a random string, hereafter referred to as *\<randomly-genereated-string\>*
2. Add it to _sms.swift.notifyBCSwiftKey_ in file _/server/config.local.js_

   ```js
    module.exports = {
      sms: {
        swift: {
          ...
          notifyBCSwiftKey: '<randomly-genereated-string>',
        },
      },
    }
   ```
3. Go to Swift web admin console, click *Number Management* tab
4. Click *Launch* button next to *Manage Short Code Keywords* 
5. Click *Features* button next to the registered keyword(s). A keyword may have multiple entries. In such case do this for each entry.
6. Click *Redirect To Webpage* tab in the popup window
7. Enter following information in the tab
   * set *URL* to *\<NotifyBCHttpHost\>/api/subscriptions/swift*, where *\<NotifyBCHttpHost\>* is NotifyBC HTTP host name and should be the same as [HTTP Host](../config-httpHost/) config
   * set *Method* to *POST*
   * set *Custom Parameter 1 Name* to *notifyBCSwiftKey*
   * set *Custom Parameter 1 Value* to *\<randomly-genereated-string\>*
8. Click *Save Changes* button and then *Done*