---
layout: docs
title: Internal HTTP Host
permalink: /docs/config-internalHttpHost/
---

By default, HTTP requests submitted by *NotifyBC* back to itself will be sent to *httpHost* if defined or the host of the incoming HTTP request that spawns such internal requests. But if config *internalHttpHost*, which has no default value, is defined, for example in file */server/config.local.js*
  
```js
module.exports = {
  "internalHttpHost" : "http://notifybc:3000"
}
```
then the HTTP request will be sent to the configured host. An internal request can be generated, for example, as a [sub-request of broadcast push notification](../config-notification/#broadcast-push-notification-task-concurrency). *internalHttpHost* shouldn't be accessible from internet. 

All internal requests are supposed to be admin requests. The purpose of *internalHttpHost* is to facilitate identifying the internal server ip as admin ip.
 

<div class="note">
  <h5>ProTips™ OpenShift Use Case</h5>
  <p>The OpenShift deployment script has set <i>internalHttpHost</i> to service url <i>http://notify-bc:3000</i> in file <a href="https://github.com/bcgov/MyGovBC-notification-server/blob/master/.s2i/configs/config.production.json">config.production.json</a> so you shouldn't re-define it in <i>/server/config.local.js</i>. The source ip in such case would be in a private OpenShift ip range. You should add this private ip range to <a href="#admin-ip-list">admin ip list</a>. The private ip range varies from OpenShift installation. In BCGov's cluster, it starts with octet 172.</p>
</div>

