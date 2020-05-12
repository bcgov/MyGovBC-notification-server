---
layout: docs
title: Overview
permalink: /docs/overview/
---

*NotifyBC* is a general purpose API Server to manage subscriptions and dispatch notifications. It aims to implement some common backend processes of a notification service without imposing any constraints on the UI frontend, nor impeding other server components' functionality. This is achieved by interacting with user browser and other server components through RESTful API and other standard protocols in a loosely coupled way.

## Features
*NotifyBC* facilitates both anonymous and SiteMinder authentication-enabled secure webapps implementing notification feature. A *NotifyBC* server instance supports multiple notification services.  A service is a topic of interest that user wants to receive updates. It is used as the partition of notification messages and user subscriptions. A user may subscribe to a service in multiple push delivery channels allowed. A user may subscribe to multiple services. In-app pull notification doesn't require subscription as it's not intrusive to user.

### notification
* both in-app pull notifications (a.k.a. messages or alerts) and push notifications
* multiple push notifications delivery channels
  * email
  * sms
* unicast and broadcast message types
* future-dated notifications
* for in-app pull notifications
  * support read and deleted message states
  * message expiration
  * deleted messages are not deleted immediately for auditing and recovery purposes
* both sync and async API call for broadcast push notifications. For async API call, an optional callback url is supported
* broadcast push notifications can be auto-generated from RSS feeds
* allow user to specify filter rules evaluated against broadcast push notification triggering event to improve relevance
* allow application developer to create custom filter functions

### subscription and un-subscription
* verify the ownership of push notification subscription channel:
  * generates confirmation code based on a regex input
  * send confirmation request to unconfirmed subscription channel
  * verify confirmation code
* generate random un-subscription code 
* send acknowledgement message after un-subscription for anonymous subscribers
* bulk unsubscription
* [list-unsubscribe](http://www.list-unsubscribe.com/) by email
* track bounces and unsubscribe the recipient from all subscriptions when hard bounce count exceeds threshold 
* sms user can unsubscribe by replying a shortcode keyword with Swift sms provider

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
  * {unsubscription_all_url} - url to unsubscribe all services the user has subscribed on this *NotifyBC* instance
  * {unsubscription_code}
  * {unsubscription_reversion_url}
  * {unsubscription_service_names} - includes {service_name} and additional services user has unsubscribed, prefixed with conditionally pluralized word *service*. 

#### dynamic tokens
If a notification request contains field *data* of type *object*, *NotifyBC* also substitutes dynamic tokens, which are strings enclosed in {} but don't match static tokens above, with corresponding sub-field of *data* if available. For example, if the string *{description}* appears in email body, it is replaced with field *data.description* of the notification request if populated.

<div class="note info">
  <h5>Notification by RSS feeds relies on dynamic token</h5>
  <p>A notification created by RSS feeds relies on dynamic token to supply the context to message template. In this case the <i>data</i> field contains the RSS item.</p>
</div>

## Architecture

*NotifyBC*, designed to be a microservice, doesn't use full-blown ACL to secure API calls. Instead, it classifies incoming requests into admin and user types. Each type has two subtypes based on following criteria

* super-admin, if the source ip of the request is in the admin ip list and the request doesn't contain any of following case insensitive HTTP headers, with the first three being SiteMinder headers
  * sm_universalid
  * sm_user
  * smgov_userdisplayname
  * is_anonymous
* admin, if the request is not super-admin but has valid access token that maps to an admin user created and logged in using the *administrator* api, and the request doesn't contain any HTTP headers listed above
* authenticated user, if the request 
  * is neither super-admin nor admin, and
  * contains any of the 3 SiteMinder headers listed above, and
  * comes from either trusted SiteMinder proxy or admin ip list
* anonymous user, if the request doesn't meet any of the above criteria

The only extra privileges that a super-admin has over admin are that super-admin can perform CRUD operations on *configuration* and *administrator* entities through REST API. In the remaining docs, when no further distinction is necessary, an admin request refers to both super-admin and admin request; a user request refers to both authenticated and anonymous request.
 
An admin request carries full authorization whereas user request has limited access. For example, a user request is not allowed to

* send notification
* bypass the delivery channel confirmation process when subscribing to a service
* retrieve push notifications
* retrieve in-app notifications that is not targeted to the current user

The result of an API call to the same end point may differ depending on the request type. For example, the call *GET /notifications* without a filter will return all notifications to all users for an admin request, but only non-deleted, non-expired in-app notifications for authenticated user request, and forbidden for anonymous user request. Sometimes it is desirable for a request from admin ip list, which would normally be admin request, to be voluntarily downgraded to user request in order to take advantage of predefined filters such as the ones described above. This can be achieved by adding one of the HTTP headers listed above to the request. This is also why admin request is not  determined by ip or access token alone.

The way *NotifyBC* interacts with other components is diagrammed below.
![architecture diagram]({{site.baseurl}}/img/architecture.png)

## Application Framework
*NotifyBC* is created on Node.js [LoopBack](https://loopback.io/). Contributors to source code of *NotifyBC* should be familiar with LoopBack. [LoopBack Docs](https://docs.strongloop.com/display/public/LB/LoopBack) serves a good complement to this documentation.

<div class="note">
  <h5>ProTips™ familiarize LoopBack</h5>
  <p>Most of NotifyBC code was writen according to LoopBack docs, especially section <a href="https://docs.strongloop.com/display/public/LB/Adding+logic+to+models">adding logic to models</a>.</p>
</div>
