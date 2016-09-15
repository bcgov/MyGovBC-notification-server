---
layout: docs
title: API Overview
permalink: /docs/api-overview/
---

The APIs displayed in the explorer (by default 
<a href="http://localhost:3000/explorer/" target="_blank">http://localhost:3000/explorer</a>) are grouped by data models. Click on a data model, say notification, to explore the operations on that data model. Model specific APIs are  available here:

{% assign apiDocs =  site.data.docs | where: "title","API" | first %}
{% assign restApiDocs = apiDocs.docs | shift %}
{% include docs_ul.html items=restApiDocs %}


