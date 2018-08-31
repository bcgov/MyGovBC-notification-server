---
layout: docs
title: Database
permalink: /docs/config-database/
---

By default *NotifyBC* uses in-memory database backed up by file in */server/database/data.json* for local and docker deployment and MongoDB for OpenShift deployment. To use MongoDB for non-OpenShift deployment, add file */server/datasources.local.json* with MongoDB connection information such as following:

```json
{
 "db": {
   "name": "db",
   "connector": "mongodb",
   "host": "127.0.0.1",
   "database": "notifyBC",
   "port": 27017
 }
}
```

See [LoopBack MongoDB data source](https://docs.strongloop.com/display/public/LB/MongoDB+connector#MongoDBconnector-CreatingaMongoDBdatasource) for more configurable properties.

