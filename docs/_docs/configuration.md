---
layout: docs
title: Configuration
permalink: /docs/configuration/
---
Most configurations are specified in file */server/config.json* conforming to Loopback [config.json docs](https://docs.strongloop.com/display/public/LB/config.json). NotifyBC added some additional configurations. If you need to change, instead of updating */server/config.json* file, create [environment-specific file](https://docs.strongloop.com/display/public/LB/config.json#config.json-Environment-specificsettings) such as */server/config.local.json*.  

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
