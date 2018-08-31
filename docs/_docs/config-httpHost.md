---
layout: docs
title: HTTP Host
permalink: /docs/config-httpHost/
---

*httpHost* config sets the fallback http host used by

* mail merge token substitution
* interal HTTP requests spawned by *NotifyBC* 

*httpHost* can be overridden by other configs or data. For example

* *internalHttpHost* config
* *httpHost* field in a notification

There are contexts where there is no alternatives to *httpHost*. Therefore this config should be defined.

Define the config, which has no default value, in */server/config.local.js*

```js
module.exports = {
  "httpHost" : "http://foo.com"
}
```