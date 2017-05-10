---
layout: docs
title: Configuration
permalink: /docs/configuration/
---
There are two types of configurations - static and dynamic. Static configurations are defined in files or environment variables, requiring restarting app server to take effect; whereas dynamic configurations are defined in databases and updates take effect immediately. Most static configurations are specified in file */server/config.json* conforming to Loopback [config.json docs](https://docs.strongloop.com/display/public/LB/config.json). NotifyBC added some additional configurations. If you need to change, instead of updating */server/config.json* file, create [environment-specific file](http://loopback.io/doc/en/lb2/config.json.html#environment-specific-settings) such as */server/config.local.json*.

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
  * *trustedReverseProxyIps* contains a list of ips or ranges of trusted reverse proxies between the SiteMinder Web Agents and *NotifyBC* application. When runing on OpenShift, this is usually the OpenShift router. Express.js [trust proxy](https://expressjs.com/en/guide/behind-proxies.html) is set to this config object.

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

The rule to determine if the incoming request is authenticated by SiteMinder is

1. obtain the real client ip address by filtering out trusted proxy ips according to [Express behind proxies](https://expressjs.com/en/guide/behind-proxies.html)
2. if the real client ip is contained in *siteMinderReverseProxyIps*, then the request is from SiteMinder, and its SiteMinder headers are trusted; otherwise, the request is considered as directly from internet, and its SiteMinder headers are ignored.

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

## Subscription Confirmation Request Template
To prevent *NotifyBC* from being used as spam engine, when a subscription request is sent by user (i.e. non-admin), the content of confirmation request message sent back to user cannot be specified in the subscription request. *NotifyBC* provides two places to define the subscription confirmation request template

* to apply to a specific service, define the template in database by calling REST api from an admin ip
```sh
~ $ curl -X POST --header 'Content-Type: application/json' \
--header 'Accept: application/json' -d '{ \ 
   "name": "subscriptionConfirmationRequest", \ 
   "serivceName": "myService", \ 
   "value": { \ 
     "sms": { \ 
       "confirmationCodeRegex": "\\d{5}", \ 
       "sendRequest": true, \ 
       "textBody": "Enter {confirmation_code} on screen" \ 
     }, \ 
     "email": { \ 
       "confirmationCodeRegex": "\\d{5}", \ 
       "sendRequest": true, \ 
       "from": "no_reply@example.com", \ 
       "subject": "Subscription confirmation", \ 
       "textBody": "Enter {confirmation_code} on screen", \ 
       "htmlBody": "Enter {confirmation_code} on screen" \ 
     } \ 
    } \ 
 }' 'http://localhost:3000/ext/api/configurations'
```
* to apply to all services as fall back, define the template in file */server/config.local.json*
  ```json
    "subscriptionConfirmationRequest": {
      "sms": {
        "confirmationCodeRegex": "\\d{5}",
        "sendRequest": true,
        "textBody": "Enter {confirmation_code} on screen"
      },
      "email": {
        "confirmationCodeRegex": "\\d{5}",
        "sendRequest": true,
        "from": "no_reply@example.com",
        "subject": "Subscription confirmation",
        "textBody": "Enter {confirmation_code} on screen",
        "htmlBody": "Enter {confirmation_code} on screen"
      }
    }
  ```

  This template is merged with service-specific template if defined. 

## Broadcast Notification Task Concurrency
When handling a broadcast push notification, NotifyBC sends messages concurrently to improve performance. The configuration object *broadcastNotificationTaskConcurrency* defines the concurrency level. By default it is 100. To change, add following object to */server/config.local.json* :

```
{
  "broadcastNotificationTaskConcurrency": 200
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

## Cron Job
*NotifyBC* runs a cron job to purge old notifications and subscriptions. You can change the frequency of cron job and retention policy by adding following *cron* config object to */server/config.local.json*

```
 {
   "cron": {
    "timeSpec": "0 0 1 * * *",
    "pushNotificationRetentionDays" : 30,
    "expiredInAppNotificationRetentionDays" : 30,
    "unconfirmedSubscriptionRetentionDays" : 30,
    "defaultRetentionDays": 30
   }
 }
 ```

The values shown above are default ones if the corresponding config item is omitted. The config items are

* timeSpec: a space separated fields conformed to [unix crontab format](https://www.freebsd.org/cgi/man.cgi?crontab(5)) with an optional left-most seconds field. See [allowed ranges](https://github.com/kelektiv/node-cron#cron-ranges) of each field
* pushNotificationRetentionDays: the retention days of push notifications
* expiredInAppNotificationRetentionDays: the retention days of expired inApp notifications
* unconfirmedSubscriptionRetentionDays: the retention days of unconfirmed subscriptions 
* defaultRetentionDays: if any of the above retention day config item is omitted, default retention days is used as fall back.

By default cron job is enabled. In a multi-node deployment, cron job should only run on one node. This can be achieved by setting environment variable *NOTIFYBC_SKIP_CRON* on all other nodes to *true*.

