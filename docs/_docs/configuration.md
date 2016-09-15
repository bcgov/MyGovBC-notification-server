---
layout: docs
title: Configuration
permalink: /docs/configuration/
---
Most configurations are specified in file */server/config.json* conforming to Loopback [config.json docs](https://docs.strongloop.com/display/public/LB/config.json). NotifyBC added following additional configurations. If you need to change, instead of updating */server/config.json* file, create [environment-specific file](https://docs.strongloop.com/display/public/LB/config.json#config.json-Environment-specificsettings) such as */server/config.local.json*.  

## smtp
By default *NotifyBC* bypasses SMTP relay and connects [directly](https://github.com/nodemailer/nodemailer#set-up-smtp) to recipients MX. You can setup SMTP relay by adding following entry to */server/config.local.json*

```json
{
  "smtp": {
    "host": "smtp.foo.com",
    "port": 25,
    "ignoreTLS": true,
    "secure": false
  }
}
```
