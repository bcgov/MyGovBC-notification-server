---
layout: docs
title: Installation
permalink: /docs/installation/
---

*NotifyBC* can be installed from source code or by deploying a Docker container. To setup a development environment in order to contribute to *NotifyBC*, installing from source code is recommended. For small-scale production deployment or for the purpose of evaluation, both methods will do. For prouduction deployment that requires horizontal scaling, deploying the docker container to PAAS such as OpenShift and running on a MongoDB cluster is recommended. 

## Installing *NotifyBC* from Source

### System Requirements
* Software
  * Git
  * [Node.js](https://nodejs.org)@^4.2.0
  * MongoDB (optional but recommended) 
* Network
  * Minimum firewall requirements:
    * outbound to your ISP DNS server  
    * outbound to any on port 80, 443 and 22 in order to run build scripts and send SMS messages
    * outbound to any on SMTP port 25 if using direct mail; for SMTP relay, outbound to your configured SMTP server and port only
    * inbound to listening port (3000 by default)from other authorized server ips
    * if *NotifyBC* instance will handle anonymous subscription from client browser, the listening port should be open to internet (i.e. any) either directly or indirectly through a reverse proxy; If *NotifyBC* instance will handle SiteMinder authenticated webapp requests, the listening port should NOT be open to internet. Instead, it should only open to SiteMinder web agent reverse proxy. 
  * To use in-app notification feature, both *NotifyBC* API server and client-facing front-end web app have to be protected by SiteMinder
<div class="note warning">
  <h5>Don't expose a NotifyBC instance to both anonymous and SiteMinder-eneabled secure webapps</h5>
  <p>This creates a security loophole. Instead, setup separate NotifyBC instances.</p>
</div>

### Installation
run following commands

```sh
~ $ git clone \
https://github.com/bcgov/MyGovBC-notification-server.git \
notifyBC
~ $ cd notifyBC
~/notifyBC $ npm install
~/notifyBC $ npm start
```

If successful, you will see following output

```
> notification@1.0.0 start .../notification
> node .

Web server listening at: http://localhost:3000
Browse your REST API at http://localhost:3000/explorer
```

Now browse to <a href="http://localhost:3000/explorer" target="_blank">http://localhost:3000/explorer</a> the page displays StrongLoop API Explorer.

## Deploying NotifyBC Docker Container

## Installing NotifyBC Docs Website 
