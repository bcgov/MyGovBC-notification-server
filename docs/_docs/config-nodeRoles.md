---
layout: docs
title: Node Roles
permalink: /docs/config-nodeRoles/
---

In a multi-node deployment, some tasks should only be run by one node. That node is designated as *master*. The distinction is made using environment variable *NOTIFYBC_NODE_ROLE*. Setting to anything other than *slave*, including not set, will be regarded as *master*.
