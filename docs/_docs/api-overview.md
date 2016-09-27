---
layout: docs
title: API Overview
permalink: /docs/api-overview/
---
*NotifyBC* is built around two data models - subscription and notification. The data model determines the underlying database schema and the I/O of API.
The APIs displayed in the explorer (by default 
<a href="http://localhost:3000/explorer/" target="_blank">http://localhost:3000/explorer</a>) are also grouped by the data models. Click on a data model, say notification, to explore the operations on that data model. Model specific APIs are  available here:

{% assign apiDocs =  site.data.docs | where: "title","API" | first %}
{% assign restApiDocs = apiDocs.docs | shift %}
{% include docs_ul.html items=restApiDocs %}


