---
layout: docs
title: Overview
permalink: /docs/overview/
---

NotifyBC is a general purpose notification subscription API Server supporting multi-channel delivery. It aims to implement some common backend processes of a notification service without imposing any constraints on the UI frontend, nor impeding other server components' functionality. This is achieved by interacting with user browser and other server components through RESTful API and other standard protocols in a loosely coupled way.

NotifyBC is designed initially for MyGovBC but can be used independently.

## Features
A NotifyBC instance supports multiple notification services offered by an organization or program area.  A service can be regarded as a topic of interest and is used to partition notification messages and user subscriptions. A user may subscribe to a service in multiple push delivery channels allowed. In-app pull notification doesn't require subscription as it's not intrusive.

### notification
* Support both in-app pull notifications and push notifications
* Support both unicast and broadcast message types
* Deliver push notifications to confirmed subscription channels (or force to deliver to unconfirmed channels via admin port):
  * email
  * sms (planned)
* For in-app pull notifications
  * support message states - read, deleted
  * support message expiration
  * deleted messages are not deleted immediately for auditing and recovery purposes
 
### subscription and un-subscription
* Verify the ownership of push notification subscription channel:
  * generates confirmation code based on a regex input
  * send confirmation request to unconfirmed subscription channel
  * verify confirmation code

## Architecture

NotifyBC, designed to be a microservice, doesn't use ACL to secure API calls. Instead, it classifies incoming requests into admin and user types according to following criteria:

* If the request bears SiteMinder header, it is a user request;
* (planned) If the source ip is in the admin ip list, it's an admin request.  

An admin request carries full power whereas user request has limited access. For example, a user request is not allowed to send message, cannot subscribe to a service without first confirming the delivery channel, etc.

The way NotifyBC interacts with other components is diagrammed below.
![architecture diagram]({{site.baseurl}}/img/architecture.png)

## Application Framework
NotifyBC is created on Node.js [LoopBack](https://loopback.io/). Contributors to source code of NotifyBC should be familiar with LoopBack. [LoopBack Docs](https://docs.strongloop.com/display/public/LB/LoopBack) serves a good complement to this documentation.

<div class="note">
  <h5>ProTips™: Familiarize LoopBack</h5>
  <p>Most of NotifyBC code was writen according to LoopBack docs, especially section <a href="https://docs.strongloop.com/display/public/LB/Adding+logic+to+models">adding logic to models</a>.</p>
</div>
