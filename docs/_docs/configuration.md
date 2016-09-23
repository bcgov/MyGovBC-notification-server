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

## RSA Keys
When NotifyBC starts up, it checks if two files containing a RSA key pair exists: */server/id_rsa* and *server/id_rsa.pub*. If not it will generate the files. This RSA key pair is used to exchange confidential information with trusted third parties through user's browser. For an example of use case, see [Subscription API](../api-subscription/). To make it work, send the public key file *server/id_rsa.pub* to the trusted third party. 

<div class="note warning">
  <h5>Expose RSA public key to only trusted party</h5>
  <p>Dispite of the adjective public, NotifyBC's public key should only be distributed to trusted third party. The trusted third party should only use the public key at server backend. Using the public key in client-side JavaScript poses a security loophole.</p>
</div>
