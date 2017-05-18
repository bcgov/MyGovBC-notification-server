---
layout: docs
title: Basic Usage
permalink: /docs/usage/
---

After [installing](../installation) *NotifyBC*, you can start exploring the function by opening the API explorer [http://localhost:3000/explorer](http://localhost:3000/explorer) and expand the data models. The API calls you made with API explorer are by default treated as [admin requests](../overview/#architecture). To see the result for user requests, you can choose one of the following methods

* accessing the API via a SiteMinder proxy if you have configured SiteMinder properly
* Define admin ip list and avoid putting localhost (127.0.0.1) in the list
* Use a tool such as *curl* that allows to specify custom headers, and supply SiteMinder header *SM_USER*:
 
```sh
 $ curl -X GET --header "Accept: application/json" \
    --header "SM_USER: foo" \
    "http://localhost:3000/api/notifications"
```

Consult the [API docs](../api-overview/) for valid inputs and expected outcome while you are exploring the APIs. Once you are familiar with the APIs, you can start writing code to call the APIs from either user browser or from a server application.  
