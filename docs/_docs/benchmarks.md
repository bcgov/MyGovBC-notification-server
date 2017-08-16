---
layout: docs
title: Benchmarks
permalink: /docs/benchmarks/
---


<div class="note info">
  <h5>tl;dr</h5>
  <p><i>NotifyBC</i> can deliver 1 million emails of 1KB size in 1 hour from an app server on 2-vCPU OpenShift pod to a Windows IIS SMTP server on a 4-vCPU SSD VM. SMTP server's disk I/O is the bottleneck in such case. Throughput can be improved through horizontal scaling.</p>
</div>

When *NotifyBC* is used to deliver broadcast push notifications to a large number of subscribers, probably the most important benchmark is throughput. The benchmark is especially critical if a latency tolerance is imposed. To facilitate capacity planning, load testing result of the email channel is provided hereafter. 

[sample email](../../attachments/benchmark-email.txt)

(tbd)