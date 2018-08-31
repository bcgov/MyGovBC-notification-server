---
layout: docs
title: API Overview
permalink: /docs/api-overview/
---
*NotifyBC*'s core function is implemented by two [LoopBack models](https://docs.strongloop.com/display/public/LB/LoopBack+core+concepts#LoopBackcoreconcepts-Models) - subscription and notification. Other models - configuration, administrator and bounces, are for adminstrative purposes. A LoopBack model determines the underlying database schema and the API.
The APIs displayed in the web console (by default <a href="http://localhost:3000" target="_blank">http://localhost:3000</a>) and API explorer are also grouped by the LoopBack models. Click on a LoopBack model in API explorer, say notification, to explore the operations on that model. Model specific APIs are  available here:

{% assign apiDocs =  site.data.docs | where: "title","API" | first %}
{% assign restApiDocs = apiDocs.docs | shift %}
{% include docs_ul.html items=restApiDocs %}


