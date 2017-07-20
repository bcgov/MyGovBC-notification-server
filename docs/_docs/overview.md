---
layout: docs
title: Overview
permalink: /docs/overview/
---

*NotifyBC* is a general purpose API Server to manage subscription and dispatch notifications. It aims to implement some common backend processes of a notification service without imposing any constraints on the UI frontend, nor impeding other server components' functionality. This is achieved by interacting with user browser and other server components through RESTful API and other standard protocols in a loosely coupled way.

## Features
*NotifyBC* facilitates both anonymous and SiteMinder authentication-enabled secure webapps implementing notification feature. A *NotifyBC* server instance supports multiple notification services.  A service is a topic of interest that user wants to receive updates. It is used as the partition of notification messages and user subscriptions. A user may subscribe to a service in multiple push delivery channels allowed. A user may subscribe to multiple services. In-app pull notification doesn't require subscription as it's not intrusive to user.

### notification
* Support both in-app pull notifications (a.k.a. messages or alerts) and push notifications
* Support multiple push notifications delivery channels
  * email
  * sms
* Support both unicast and broadcast message types
* Support future-dated notifications
* For in-app pull notifications
  * support message states - read, deleted
  * support message expiration
  * deleted messages are not deleted immediately for auditing and recovery purposes
* Support both sync and async API call for broadcast push notifications. For async API call, an optional callback url is supported
* Broadcast push notifications can be auto-generated from RSS feeds
* Allow user to specify filter rules evaluated against broadcast push notification triggering event to improve relevancy
* Allow application developer to create custom filter functions

### subscription and un-subscription
* Verify the ownership of push notification subscription channel:
  * generates confirmation code based on a regex input
  * send confirmation request to unconfirmed subscription channel
  * verify confirmation code
* Support generating random un-subscription code and sending acknowledgement message after un-subscription for anonymous subscribers as anti-spoofing measurements

### mail merge

#### static tokens
*NotifyBC* recognizes following case-insensitive static tokens in push notification or subscription messages. They are replaced when sending the message
 
* {subscription_confirmation_url}
* {subscription_confirmation_code}
* {service_name} 
* {http_host} - http host in the form *http(s)://\<host_name\>:\<port\>*. The value is obtained from the http request that triggers the message
* {rest_api_root} - configured Loopback [Root URI of REST API](https://loopback.io/doc/en/lb3/config.json.html#top-level-properties)
* {subscription_id} 
* anonymous unsubscription related tokens
  * {unsubscription_url}
  * {unsubscription_code}
  * {unsubscription_reversion_url}

#### dynamic tokens
If a notification request contains field *data* of type *object*, *NotifyBC* also substitutes dynamic tokens, which are strings enclosed in {} but don't match static tokens above, with corresponding sub-field of *data* if available. For example, if the string *{description}* appears in email body, it is replaced with field *data.description* of the notification request if populated.

<div class="note info">
  <h5>Notification by RSS feeds relies on dynamic token</h5>
  <p>A notification created by RSS feeds relies on dynamic token to supply the context to message template. In this case the <i>data</i> field contains the RSS item.</p>
</div>

## Architecture

*NotifyBC*, designed to be a microservice, doesn't use full-blown ACL to secure API calls. Instead, it classifies incoming requests into admin and user types. Each type has two subtypes based on following criteria

* super-admin, if the source ip of the request is in the admin ip list
* admin, if the request is not super-admin but has valid access token that maps to an admin user created and logged in using the *administrator* api 
* authenticated user, if the request is neither super-admin nor admin, but authenticated by SiteMinder, i.e. the request carries SiteMinder headers and is from trusted SiteMinder proxy
* anonymous user, if the request doesn't meet any of the above criteria

The only extra privileges that a super-admin has over admin are that super-admin can perform CRUD operations on *configuration* and *administrator* entities through REST API. In the remaining docs, when no further distinction is necessary, an admin request refers to both super-admin and admin request; a user request refers to both authenticated and anonymous request.
 
An admin request carries full authorization whereas user request has limited access. For example, a user request is not allowed to

* send notification
* bypass the delivery channel confirmation process when subscribing to a service
* retrieve push notifications
* retrieve in-app notifications that is not targeted to the current user

The result of an API call to the same end point may differ depending on if the request is made by admin or user. For example, the call *GET /notifications* without a filter will return all notifications to all users for an admin request, but only non-deleted, non-expired in-app notifications targeted to the current user when the request comes from user browser.

The way *NotifyBC* interacts with other components is diagrammed below.
![architecture diagram]({{site.baseurl}}/img/architecture.png)

<div class="note warning">
  <h5>Secure RESTful API end point</h5>
  <p>When NotifyBC is used to serve SiteMinder authenticated requests, its RESTful API URL end point should be protected against direct internet access using firewall, otherwise SiteMinder headers can be easily spoofed. Firewall can be external or <a href="../configuration/#siteminder-reverse-proxy-ip-list-and-trusted-reverse-proxy-ip-list">built-in</a></p>
</div>

## Application Framework
*NotifyBC* is created on Node.js [LoopBack](https://loopback.io/). Contributors to source code of *NotifyBC* should be familiar with LoopBack. [LoopBack Docs](https://docs.strongloop.com/display/public/LB/LoopBack) serves a good complement to this documentation.

<div class="note">
  <h5>ProTips™ familiarize LoopBack</h5>
  <p>Most of NotifyBC code was writen according to LoopBack docs, especially section <a href="https://docs.strongloop.com/display/public/LB/Adding+logic+to+models">adding logic to models</a>.</p>
</div>
