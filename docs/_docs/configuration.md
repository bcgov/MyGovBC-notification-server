---
layout: docs
title: Configuration
permalink: /docs/configuration/
---
Most configurations are specified in file */server/config.json* conforming to Loopback [config.json docs](https://docs.strongloop.com/display/public/LB/config.json). NotifyBC added some additional configurations. If you need to change, instead of updating */server/config.json* file, create [environment-specific file](http://loopback.io/doc/en/lb2/config.json.html#environment-specific-settings) such as */server/config.local.json*.

## SMTP
By default *NotifyBC* bypasses SMTP relay and connects [directly](https://github.com/nodemailer/nodemailer#set-up-smtp) to recipients MX. You can setup SMTP relay by adding following *smtp* config object to */server/config.local.json*

```json
{
  "smtp": {
    "host": "smtp.foo.com",
    "port": 25,
    "ignoreTLS": true,
    "secure": false
  }
}
```
Check out [Nodemailer](https://github.com/nodemailer/nodemailer#set-up-smtp) for other config options that you can define in *smtp* object.

## SMS
*NotifyBC* depends on underlying SMS service providers to deliver SMS messages. The supported service providers are

 * Twilio (default)

Only one service provider can be chosen per installation. To change service provider, add following *smsServiceProvider* config object to file */server/config.local.json*

```json
{
  "smsServiceProvider": "twilio"
}
```
The rest configs are service provider specific. You should have an account with the chosen service provider before proceeding.

### Twilio
Add *sms.twilio* config object to file */server/config.local.json*

```json
{
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

## Admin IP List
By [design](../overview/#architecture), NotifyBC classifies incoming requests into admin and user types. By default, the classification is based on the presence of SiteMinder header alone. In order to support user subscription from an anonymous website, an admin ip list can be used to make the distinction. To enable, add following object to */server/config.local.json* containing a list of admin ip addresses.

```
{
  "adminIps": [
    "127.0.0.1",
    "192.168.0.2"
  ]
}
```

## SiteMinder Reverse Proxy IP List and Trusted Reverse Proxy IP List

SiteMinder, being a gateway approached SSO solution, expects the backend HTTP access point of the web sites it protests to be firewall restricted, otherwise the SiteMinder injected HTTP headers can be easily spoofed. However, the restriction cannot be easily implemented on PAAS such as OpenShift. To mitigate, two configuration objects are introduced to create an application-level firewall, both are arrays of ip addresses in the format of [dot-decimal](https://en.wikipedia.org/wiki/Dot-decimal_notation) or [CIDR](https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing#CIDR_notation) notation

  * *siteMinderReverseProxyIps* contains a list of ips or ranges of SiteMinder Web Agents. If set, then the SiteMinder HTTP headers are trusted only if the request is routed from the listed nodes.
  * *trustedReverseProxyIps* contains a list of ips or ranges of trusted reverse proxies between the SiteMinder Web Agents and *NotifyBC* application. This is usually the OpenShift router. Express.js [trust proxy](https://expressjs.com/en/guide/behind-proxies.html) is set to this config object.

To set, add following objects for example to file /server/config.local.json

```
{
  "siteMinderReverseProxyIps":[
    "130.32.12.0"
  ],
  "trustedReverseProxyIps":[
    "172.17.0.0/16"
  ]
}
```

The algorithm of the application firewall is

1. determine the real client ip address by filtering out trusted proxy ips according to [Express behind proxies](https://expressjs.com/en/guide/behind-proxies.html)
2. if the real client ip is contained in *siteMinderReverseProxyIps*, then the request is from SiteMinder, and its SiteMinder headers are trusted; otherwise, the request is considered as directly from internet, and its SiteMinder headers are ignored.

## Broadcast Notification Task Concurrency
When handling a broadcast push notification, NotifyBC sends messages concurrently to improve performance. The configuration object *broadcastNotificationTaskConcurrency* defines the concurrency level. By default it is 100. To change, add following object to */server/config.local.json* :

```
{
  "broadcastNotificationTaskConcurrency": 200
}
```

## Confirmation Code Suffix RegEx
A subscription request can be submitted from user browser as a user request. This subscription request may contain a regular expression in field *confirmationRequest.confirmationCodeRegex* to instruct NotifyBC to generate the confirmation code from the RegEx. Because a user request could be spoofed, measurement has be imposed on server side to ensure minimum randomness of the generated confirmation code.    Configuration *confirmationCodeSuffixRegex*, which by default is a RegEx to generate 5 random digits, provides the mitigation. The confirmation code is thus a concatenation of random strings generated from RegEx *confirmationRequest.confirmationCodeRegex* in request field and *confirmationCodeSuffixRegex* in config. To change *confirmationCodeSuffixRegex*, add following object to */server/config.local.json* with a value of a RegEx in escaped string format (the example yields a 6 random digits):

```
{
  "confirmationCodeSuffixRegex": "\\d{6}"
}
```


## Database
By default NotifyBC uses in-memory database backed up by file in */server/database/data.json*. To use MongoDB, which is highly recommended for production deployment, add file */server/datasources.local.json* with MongoDB connection information such as following:

 ```
 {
   "db": {
     "name": "db",
     "connector": "mongodb",
     "host": "127.0.0.1",
     "database": "notifyBC",
     "port": 27017
   }
 }
 ```

See [LoopBack MongoDB data source](https://docs.strongloop.com/display/public/LB/MongoDB+connector#MongoDBconnector-CreatingaMongoDBdatasource) for more configurable properties.

## RSA Keys
When NotifyBC starts up, it checks if two files containing a RSA key pair exists: */server/id_rsa* and *server/id_rsa.pub*. If not it will generate the files. This RSA key pair is used to exchange confidential information with third party server applications through user's browser. For an example of use case, see [Subscription API](../api-subscription/). To make it work, send the public key file *server/id_rsa.pub* to the third party and have their server app encrypt infr.

<div class="note warning">
  <h5>Expose RSA public key to only trusted party</h5>
  <p>Dispite of the adjective public, NotifyBC's public key should only be distributed to trusted third party. The trusted third party should only use the public key at server backend. Using the public key in client-side JavaScript poses a security loophole.</p>
</div>
