---
layout: docs
title: Cron Jobs
permalink: /docs/config-cronJobs/
---

*NotifyBC* runs several cron jobs described below. These jobs are controlled by sub-properties defined in config object *cron*. To change config, create the object and properties in file */server/config.local.js*.

By default cron jobs are enabled. In a multi-node deployment, cron jobs should only run on the [master node](../config-nodeRoles/) to ensure single execution.

## Purge Data
This cron job purges old notifications, subscriptions and notification bounces. The default frequency of cron job and retention policy are defined by *cron.purgeData* config object in file */server/config.json*

```json
 {
   "cron": {
    "purgeData":{
      "timeSpec": "0 0 1 * * *",
      "pushNotificationRetentionDays" : 30,
      "expiredInAppNotificationRetentionDays" : 30,
      "nonConfirmedSubscriptionRetentionDays" : 30,
      "deletedBounceRetentionDays": 30,
      "defaultRetentionDays": 30
    }
   }
 }
```

The config items are

* <a name="timeSpec"></a>*timeSpec*: a space separated fields conformed to [unix crontab format](https://www.freebsd.org/cgi/man.cgi?crontab(5)) with an optional left-most seconds field. See [allowed ranges](https://github.com/kelektiv/node-cron#cron-ranges) of each field.
* *pushNotificationRetentionDays*: the retention days of push notifications
* *expiredInAppNotificationRetentionDays*: the retention days of expired inApp notifications
* *nonConfirmedSubscriptionRetentionDays*: the retention days of non-confirmed subscriptions, i.e. all unconfirmed and deleted subscriptions
* *deletedBounceRetentionDays*: the retention days of deleted notification bounces
* *defaultRetentionDays*: if any of the above retention day config item is omitted, default retention days is used as fall back.

To change a config item, set the config item in file */server/config.local.js*. For example, to run cron jobs at 2am daily, add following object to */server/config.local.js*

```js
module.exports = {
   "cron": {
    "purgeData":{
      "timeSpec": "0 0 2 * * *"
    }
   }
 }
```

## Dispatch Live Notifications
This cron job sends out future-dated notifications when the notification becomes current. The default config is defined by *cron.dispatchLiveNotifications* config object in file */server/config.json*

```json
 {
   "cron": {
    "dispatchLiveNotifications":{
      "timeSpec": "0 * * * * *"
    }
   }
 }
```
*timeSpec* follows [same syntax described above](#timeSpec).

## Check Rss Config Updates
This cron job monitors RSS feed notification dynamic config items. If a config item is created, updated or deleted, the cron job starts, restarts, or stops the RSS-specific cron job. The default config is defined by *cron.checkRssConfigUpdates* config object in file */server/config.json*

```json
 {
   "cron": {
    "checkRssConfigUpdates": {
      "timeSpec": "0 * * * * *"
    }
   }
 }
```
*timeSpec* follows [same syntax described above](#timeSpec). Note this *timeSpec* doesn't control the RSS poll frequency (which is defined in dynamic configs and is service specific), instead it only controls the frequency to check for dynamic config changes. 

## Delete Notification Bounces
This cron job deletes notification bounces if the latest notification is  deemed delivered successfully. The criteria of sussessful delivery are

1. No bounce received since the latest notification started dispatching, and
2. a configured timespan has lapsed since the latest notification finshed dispatching

The default config is defined by *cron.deleteBounces* config object in file */server/config.json*

```json
 {
   "cron": {
    "deleteBounces": {
      "timeSpec": "0 0 * * * *",
      "minLapsedHoursSinceLatestNotificationEnded": 1
    }
   }
 }
```
where

* *timeSpec* is the frequency of cron job, following [same syntax described above](#timeSpec)
* *minLapsedHoursSinceLatestNotificationEnded* is the timespan