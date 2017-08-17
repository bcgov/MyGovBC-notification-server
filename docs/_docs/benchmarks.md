---
layout: docs
title: Benchmarks
permalink: /docs/benchmarks/
---

<div class="note info">
  <h5>tl;dr</h5>
  <p>A single-node <i>NotifyBC</i> server can deliver 1 million emails in as little as 1 hour to a single-node SMTP server. SMTP server's disk I/O is the bottleneck in such case. Throughput can be improved through horizontal scaling.</p>
</div>

When *NotifyBC* is used to deliver broadcast push notifications to a large number of subscribers, probably the most important benchmark is throughput. The benchmark is especially critical if a latency cap is imposed. To facilitate capacity planning, load testing on the email channel has been conducted. The test environment, procedure, results and performance tuning advices are provided hereafter. 

## Environment

### Hardware
Two computers, connnected by 1Gbps LAN, are used to host 

* *NotifyBC*
  * Mac Mini Late 2012 model
  * Intel core i7-3615QM
  * 16GB RAM
  * 2TB HDD
* SMTP and mail delivery
  * Lenovo ThinkCentre M Series 2015 model
  * Intel core i5-3470
  * 8GB RAM
  * 256GB SSD

### Software Stack
The test was performed in August 2017. Unless otherwise specified, the versions of all other software were reasonably up-to-date at the time of testing.

* *NotifyBC*
  * MacOS Sierra Version 10.12.6
  * Virtualbox VM with 8vCPU, 10GB RAM, created using miniShift v1.3.1+f4900b07
  * OpenShift 1.5.1+7b451fc with metrics
  * default *NotifyBC* OpenShift installation, which contains following relevant pods
    * 1 mongodb pod with 1 core, 1GiB RAM limit
    * a variable number of Nodejs app pods each with 1 core, 1GiB RAM limit. The number varies by test runs as indicated in result.

* SMTP and mail delivery
  * Windows 7 host
  * Virtualbox VM with 4 vCPU, 3.5GB RAM, running Windows Server 2012
  * added SMTP Server feature
  * in SMTP Server properties dialog box, uncheck all of following boxes in *Messages* tab
    * Limit message size to (KB)
    * Limit session size to (KB)
    * Limit number of messages per connection to
    * Limit number of recipients per message to

## Procedure

1. update file */server/config.local.js* through [configMap](../installation/#update-configuration-files). Add sections for SMTP server and a custom filter funtion

   ```
   ...
   smtp: {
     host: '<smtp-vm-ip-or-hostname>',
     secure: false,
     port: 25,
     pool: true,
     direct: false,
     maxMessages: 99999,
     maxConnections: 50
   },
   ...
   notification: {
     broadcastCustomFilterFunctions: {
       /*jshint camelcase: false */
       contains_ci: {
         _func: function(resolvedArgs) {
           if (!resolvedArgs[0] || !resolvedArgs[1]) {
             return false
           }
           return (
             _.toLower(resolvedArgs[0]).indexOf(
              _.toLower(resolvedArgs[1])) >= 0
           )
         },
         _signature: [
           {
             types: [2]
           },
           {
             types: [2]
           }
         ]
       }
     }
   }
   ```
2. create a number of subscriptions in bulk using script [bulk-post-subs.js](https://github.com/bcgov/MyGovBC-notification-server/blob/master/utils/bulk-post-subs.js). To load test different email volumes, you can create bulk subscriptions in different services. For example, generate 10 subscriptions under service named *load10*; 1,000,000 subscriptions under serivce *load1000000* etc. *bulk-post-subs.js* takes *serviceName* and other optional parameters

   ```
   node utils/bulk-post-subs.js <apiUrlPrefix> \
   <userChannleId> <numberOfSubscriptions> <serviceName>
   ```
The generated subscriptions contain a filter, hence all load testing results below included time spent on filtering.
3. launch load testing using script [curl-ntf.sh](https://github.com/bcgov/MyGovBC-notification-server/blob/master/utils/curl-ntf.sh), which takes following optional parameters

   ```
   utils/curl-ntf.sh <apiUrlPrefix> <serviceName> <senderEmail>
   ```
The script will print start time and the time taken to dispatch the notification.

## Results

| email count | time taken (min) | throughput (#/min) | app pod count | notes on bottleneck                                     |
|------------:|-----------------:|-------------------:|--------------:|---------------------------------------------|
|   1,000,000 |             71.5 |             13,986 |             1 | app pod cpu capped                         |
|     100,000 |              5.8 |             17,241 |             2 | smtp vm disk queue length hits 1 frequently |
|   1,000,000 |               57 |             17,544 |             2 | smtp vm disk queue length hits 1 frequently |
|   1,000,000 |             57.8 |             17,301 |             3 | smtp vm disk queue length hits 1 frequently |

Test runs using other software or configurations described below have also been conducted. Because throughput is significantly lower, results are not shown

* using Linux sendmail SMTP. The throughput of a 4-vCPU Linux VM is about the same as a 1-vCPU Windows SMTP server. Bottleneck in such case is the CPU of SMTP server.
* Reducing *NotifyBC* app pod's resource limit to 100 millicore CPU and 512MiB RAM. Even when scaled up pod count to 15, throughput is still about 1/3 of a 1-core pod.

[Here](../../attachments/benchmark-email.txt) is a sample email saved onto the mail drop folder of SMTP server.

### Comparison to Other Benchmarks
According to [Baseline Performance for SMTP](https://technet.microsoft.com/en-us/library/bb124213(v=exchg.65).aspx) published on Microsoft Technet in 2005, Windows SMTP server has a max throughput of 142 emails/s. However this *NotifyBC* load test yields a max throughput of 292 emails/s. The discrepency may be attributed to following factors

1. Email size in Microsoft's load test is 50k, as opposed to 1k used in this test
2. SSD storage is used in this test. It is unlikely the test conducted in 2005 used SSD.

## Advices

* Avoid using default direct mode in production. Instead use SMTP server. Direct mode doesn't support connnection pooling, resulting in port depletion quickly.
* Enable pooled connection for SMTP.
* Set smtp config *maxConnections* to a number big enough as long as SMTP server can handle. Test found for Windows SMTP server 50 is a suitable number, beyond which performance increase is insignificant.
* Avoid setting CPU resource limit too low for *NotifyBC* app pods.
* If you have control over the SMTP server,
  * use SSD for its storage
  * create a load balanced cluster if possible, since SMTP server is more likely to be the bottleneck.