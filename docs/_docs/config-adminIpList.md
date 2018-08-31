---
layout: docs
title: Admin IP List
permalink: /docs/config-adminIpList/
---

By [design](../overview/#architecture), *NotifyBC* classifies incoming requests into four types. For a request to be classified as super-admin, the request's source ip must be in admin ip list. By default, the list contains *localhost* only as defined by *defaultAdminIps* in */server/config.json* 

```json
{
  "defaultAdminIps": [
    "127.0.0.1"
  ]
}
```
to modify, create config object *adminIps* with updated list in file */server/config.local.js* instead. For example, to add ip range *192.168.0.0/24* to the list

```js
module.exports = {
  "adminIps": [
    "127.0.0.1",
    "192.168.0.0/24"
  ]
}
```
It should be noted that *NotifyBC* may generate http requests sending to itself. These http requests are expected to be admin requests. If you have created an app cluster such as in OpenShift, you should add the cluster ip range to *adminIps*. In OpenShift, this ip range is a private ip range. In BCGov's OpenShift cluster, the ip range starts with octet 172.


<div class="note warning">
  <h5>Define static array config in one file only</h5>
  <p>
  Due to a <a href="https://github.com/strongloop/loopback-boot/issues/172">bug</a> in Loopback a config of array type such as <i>adminIps</i> cannot be merged if defined in multiple files with different length. To mitigate, only define an array config in one file.
  It is for this reason that the default admin ip list has to use a different name <i>defaultAdminIps</i> as shown above.
  </p>
</div>

