---
layout: docs
title: SMS
permalink: /docs/config-sms/
---

*NotifyBC* depends on underlying SMS service providers to deliver SMS messages. The supported service providers are

 * Twilio (default)

Only one service provider can be chosen per installation. To change service provider, add following *smsServiceProvider* config object to file */server/config.local.js*

```js
module.exports = {
  "smsServiceProvider": "twilio"
}
```
The rest configs are service provider specific. You should have an account with the chosen service provider before proceeding.

## Twilio
Add *sms.twilio* config object to file */server/config.local.js*

```js
module.exports = {
  "sms": {
    "twilio": {
      "accountSid": "<AccountSid>",
      "authToken": "<AuthToken>",
      "fromNumber": "<FromNumber>"
    }
  }
}
```
Obtain *\<AccountSid\>*, *\<AuthToken\>* and *\<FromNumber\>* from your Twilio account.

