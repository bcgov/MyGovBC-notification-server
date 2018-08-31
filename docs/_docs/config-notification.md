---
layout: docs
title: Notification
permalink: /docs/config-notification/
---

Configs in this section customize the handling of notification request or generating notifications from RSS feeds.  They are all sub-properties of config object *notification*. Service-agnostic  configs are static and service-dependent configs are dynamic. 

## RSS Feeds
*NotifyBC* can generate broadcast push notifications automatically by polling RSS feeds periodically and detect changes by comparing with an internally maintained history list. The polling frequency, RSS url, RSS item change detection criteria, and message template can be defined in dynamic configs.  

<div class="note warning">
  <h5>Only first page is retrived for paginated RSS feeds</h5>
  <p>If a RSS feed is paginated, <i>NotifyBC</i> only retrives the first page rather than auto-fetch subsequent pages. Hence paginated RSS feeds should be sorted descendingly by last modified timestamp. Refresh interval should be adjusted small enough such that all new or updated items are contained in first page.</p>
</div>


For example, to notify subscribers of *myService* on updates to feed *http://my-serivce/rss*, create following config item using [POST configuration API](../api-config/#create-a-configuration)

```json
{
  "name": "notification",
  "serviceName": "myService",
  "value": {
    "rss": {
      "url": "http://my-serivce/rss",
      "timeSpec": "* * * * *",
      "itemKeyField": "guid",
      "outdatedItemRetentionGenerations": 1,
      "includeUpdatedItems": true,
      "fieldsToCheckForUpdate": [
        "title",
        "pubDate",
        "description"
      ]
    },
    "httpHost": "http://localhost:3000",
    "messageTemplates": {
      "email": {
        "from": "no_reply@invlid.local",
        "subject": "{title}",
        "textBody": "{description}",
        "htmlBody": "{description}"
      }
    }
  }
}
```
The config items in the *value* field are

* rss
  * url: RSS url
  * <a name="timeSpec"></a>timeSpec: RSS poll frequency, a space separated fields conformed to [unix crontab format](https://www.freebsd.org/cgi/man.cgi?crontab(5)) with an optional left-most seconds field. See [allowed ranges](https://github.com/kelektiv/node-cron#cron-ranges) of each field
  * itemKeyField: rss item's unique key field to identify new items. By default *guid*
  * outdatedItemRetentionGenerations: number of last consecutive polls from which results an item has to be absent before the item can be removed from the history list. This config is designed to prevent multiple notifications triggered by the same item because RSS poll returns inconsistent results, usually due to a combination of pagination and lack of sorting. By default 1, meaning the history list only keeps the last poll result
  * includeUpdatedItems: whether to notify also updated items or just new items. By default *false*  
  * fieldsToCheckForUpdate: list of fields to check for updates if *includeUpdatedItems* is *true*. By default *["pubDate"]*
* httpHost: the http protocol, host and port used by [mail merge](../overview/#mail-merge). If missing, the value is auto-populated based on the REST request that creates this config item.
* messageTemplates: channel-specific message template supporting dynamic token as shown. Message template fields is same as those in [notification api](../api-notification/#field-message)

## Broadcast Push Notification Task Concurrency
When a broadcast push notification request is received, *NotifyBC* divides subscribers into chunks and generates a HTTP sub-request for each chunk.  The sub-requests are submitted in batches back to ( preferably load-balanced) server cluster to achieve horizontal scaling. Sub-requests in a batch are submitted concurrently. Batches are processed serially, i.e. a batch is held until previous batch is completed. The chunk and batch size is determined by config *broadcastSubscriberChunkSize* and *broadcastSubRequestBatchSize* respectively with default value defined in */server/config.json*

```json
{
  "notification": {
    "broadcastSubscriberChunkSize": 1000,
    "broadcastSubRequestBatchSize": 10
  }
}
```

To customize, create the config with updated value in file */server/config.local.js*.

When handling a sub-request, *NotifyBC* dispatches notifications to all subscribers in the chunk concurrently. 

If total number of subscribers is less than *broadcastSubscriberChunkSize*, then no sub-requests are spawned. Instead, the main request dispatches all notifications. 

## Broadcast Push Notification Custom Filter Functions
<div class="note info">
  <h5>Advanced Topic</h5>
  <p>
  Defining custom function requires knowledge of JavaScript and understanding how external libraries are added and referenced in NodeJS. Setting a development environment to test the custom function is also recommended.
  </p>
</div>

To support rule-based notification event filtering, *NotifyBC* uses a [modified version](https://github.com/f-w/jmespath.js) of [jmespath](http://jmespath.org/) to implement json query. The modified version allows defining custom functions that can be used in  [broadcastPushNotificationFilter](../api-subscription#broadcastPushNotificationFilter) field of subscription API. The functions must be implemented using JavaScript in config *notification.broadcastCustomFilterFunctions*. For example, the case-insensitive string matching function *contains_ci* shown in the example of that field can be created in file */server/config.local.js*

```js
var _ = require('lodash')
module.exports = {
  notification: {
    broadcastCustomFilterFunctions: {
      contains_ci: {
        _func: function(resolvedArgs) {
          if (!resolvedArgs[0] || !resolvedArgs[1]) {
            return false
          }
          return (
            _.toLower(resolvedArgs[0]).indexOf(_.toLower(resolvedArgs[1])) >= 0
          )
        },
        _signature: [
          {
            types: [2]
          },
          {
            types: [2]
          }
        ]
      }
    }
  }
}
```
Consult jmespath.js source code on the [functionTable syntax](https://github.com/f-w/jmespath.js/blob/master/jmespath.js#L1127) and [type constants](https://github.com/f-w/jmespath.js/blob/master/jmespath.js#L132) used by above code. Note the function can use any external libraries (*[lodash](https://lodash.com/)* in this case) referenced in [package.json](https://github.com/bcgov/MyGovBC-notification-server/blob/master/package.json). 

<div class="note">
  <h5>ProTips™ reference additional libraries modules</h5>
  <p>You can add npm modules to package.json but the file maybe overwritten when upgrading <i>NotifyBC</i>. To avoid, add by running command <i><a href="https://docs.npmjs.com/cli/install">npm install &lt;your_package&gt;</a></i> during build.</p>
</div>

