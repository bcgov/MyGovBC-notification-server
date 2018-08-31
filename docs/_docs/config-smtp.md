---
layout: docs
title: SMTP
permalink: /docs/config-smtp/
---

By default *NotifyBC* acts as the SMTP server itself and connects directly to recipient's SMTP server. To setup SMTP relay to a host, say *smtp.foo.com*, add following *smtp* config object to */server/config.local.js*

```js
module.exports = {
  ...
  smtp: {
    host: 'smtp.foo.com',
    port: 25,
    pool: true,
    tls: {
      rejectUnauthorized: false
    }
  },
}
```
Check out [Nodemailer](https://nodemailer.com/smtp/) for other config options that you can define in *smtp* object. Using SMTP relay and fine-tuning some options are critical for performance. See [benchmark advices](../benchmarks/#advices). There are also options allowing you to throttle down throughput if needed.