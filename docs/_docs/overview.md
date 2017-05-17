---
layout: docs
title: Overview
permalink: /docs/overview/
---

NotifyBC is a general purpose notification subscription API Server supporting multi-channel delivery. It aims to implement some common backend processes of a notification service without imposing any constraints on the UI frontend, nor impeding other server components' functionality. This is achieved by interacting with user browser and other server components through RESTful API and other standard protocols in a loosely coupled way.

NotifyBC is designed initially for MyGovBC but can be used independently.

## Features
NotifyBC facilitates both anonymous and SiteMinder authentication-enabled secure webapps implementing notification feature. A NotifyBC server instance supports multiple notification services.  A service is a topic of interest that user wants to receive updates. It is used as the partition of notification messages and user subscriptions. A user may subscribe to a service in multiple push delivery channels allowed. A user may subscribe to multiple services. In-app pull notification doesn't require subscription as it's not intrusive to user.

### notification
* Support both in-app pull notifications (a.k.a. messages or alerts) and push notifications
* Support both unicast and broadcast message types
* Deliver push notifications to confirmed subscription channels (or force delivering to unconfirmed channels):
  * email
  * sms
* For in-app pull notifications
  * support message states - read, deleted
  * support message expiration
  * deleted messages are not deleted immediately for auditing and recovery purposes

### subscription and un-subscription
* Verify the ownership of push notification subscription channel:
  * generates confirmation code based on a regex input
  * send confirmation request to unconfirmed subscription channel
  * verify confirmation code

### mail merge
*NotifyBC* recognizes following tokens in push notification or subscription messages. They are replaced dynamically when sending the message
 
* {confirmation_code} - subscription confirmation code
* {service_name} 
* {http_host} - http host in the form *http(s)://\<host_name\>:\<port\>*
* {restApiRoot} - configured Loopback [Root URI of REST API](https://loopback.io/doc/en/lb3/config.json.html#top-level-properties)
* {subscriptionId} 
* {unsubscriptionCode} - for anonymous subscriptions 

## Architecture

NotifyBC, designed to be a microservice, doesn't use ACL to secure API calls. Instead, it classifies incoming requests into admin and user types according to following criteria:

* If the request bears SiteMinder header, it is a user request;
* If the source ip is in the admin ip list, it's an admin request.

An admin request carries full authorization whereas user request has limited access. For example, a user request is not allowed to

* send message
* bypass the delivery channel confirmation process when subscribing to a service
* retrieve push notifications
* retrieve in-app notifications that is not targeted to the current user

The result of an API call to the same end point may differ depending on if the request is made by admin or user. For example, the call *GET /notifications* without a filter will return all notifications to all users for an admin request, but only non-deleted, non-expired in-app notifications targeted to the current user when the request comes from user browser.

The way NotifyBC interacts with other components is diagrammed below.
![architecture diagram]({{site.baseurl}}/img/architecture.png)

<div class="note warning">
  <h5>Secure RESTful API end point</h5>
  <p>When NotifyBC is used to serve SiteMinder authenticated requests, its RESTful API URL end point should be protected against direct internet access using firewall, otherwise SiteMinder headers can be easily spoofed. Firewall can be external or <a href="../configuration/#siteminder-reverse-proxy-ip-list-and-trusted-reverse-proxy-ip-list">built-in</a></p>
</div>

## Application Framework
NotifyBC is created on Node.js [LoopBack](https://loopback.io/). Contributors to source code of NotifyBC should be familiar with LoopBack. [LoopBack Docs](https://docs.strongloop.com/display/public/LB/LoopBack) serves a good complement to this documentation.

<div class="note">
  <h5>ProTips™ familiarize LoopBack</h5>
  <p>Most of NotifyBC code was writen according to LoopBack docs, especially section <a href="https://docs.strongloop.com/display/public/LB/Adding+logic+to+models">adding logic to models</a>.</p>
</div>
