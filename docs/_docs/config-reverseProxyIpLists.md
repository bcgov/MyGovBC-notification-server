---
layout: docs
title: Reverse Proxy IP Lists
permalink: /docs/config-reverseProxyIpLists/
---

SiteMinder, being a gateway approached SSO solution, expects the backend HTTP access point of the web sites it protests to be firewall restricted, otherwise the SiteMinder injected HTTP headers can be easily spoofed. However, the restriction cannot be easily implemented on PAAS such as OpenShift. To mitigate, two configuration objects are introduced to create an application-level firewall, both are arrays of ip addresses in the format of [dot-decimal](https://en.wikipedia.org/wiki/Dot-decimal_notation) or [CIDR](https://en.wikipedia.org/wiki/Classless_Inter-Domain_Routing#CIDR_notation) notation

  * *siteMinderReverseProxyIps* contains a list of ips or ranges of SiteMinder Web Agents. If set, then the SiteMinder HTTP headers are trusted only if the request is routed from the listed nodes.
  * *trustedReverseProxyIps* contains a list of ips or ranges of trusted reverse proxies between the SiteMinder Web Agents and *NotifyBC* application. When runing on OpenShift, this is usually the OpenShift router. Express.js [trust proxy](https://expressjs.com/en/guide/behind-proxies.html) is set to this config object.

By default *trustedReverseProxyIps* is empty and *siteMinderReverseProxyIps* contains only localhost as defined by *defaultSiteMinderReverseProxyIps* in */server/config.json* 

```json
{
  "defaultSiteMinderReverseProxyIps": [
    "127.0.0.1"
  ]
}
```

To modify, add following objects to file /server/config.local.js

```js
module.exports = {
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
