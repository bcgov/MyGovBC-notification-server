---
layout: docs
title: Bulk Import
permalink: /docs/bulk-import/
---

To facilitate migrating subscriptions from other notification systems, *NotifyBC* provides a utility script to bulk import subscription data from a .csv file. To use the utility, you need 

* Software installed
  * NodeJS@>=6.9.1
  * Git
* Admin Access to a *NotifyBC* instance by adding your client ip to the [Admin IP List](../config-adminIpList/)
* a csv file with header row matching [subscription model schema](../api-subscription/#model-schema). A sample csv file is [provided](https://github.com/bcgov/MyGovBC-notification-server/tree/master/utils/bulk-import/sample-subscription.csv). Compound fields (of object type) should be dot-flattened as shown in the sample for field  *confirmationRequest.sendRequest*

To run the utility

```bash
~ $ git clone \
https://github.com/bcgov/MyGovBC-notification-server.git \
notifyBC
~ $ cd notifyBC
~/notifyBC $ npm i -g yarn && yarn install
~/notifyBC $ node utils/bulk-import/subscription.js \
-a <api-url-prefix> -c <concurrency> <csv-file-path>
```

Here \<csv-file-path\> is the path to csv file and \<api-url-prefix\> is the *NotifyBC* api url prefix , default to *http://localhost:3000/api*.

The script parses the csv file and generates a HTTP post request for each row. The concurrency of HTTP request is controlled by option *-c* which is default to 10 if omitted. A successful run should ouput the number of rows imported wihout any error message

```
success row count = ***
```

### Field Parsers

The utility script takes care of type conversion for built-in fields. If you need to import proprietary fields, by default the fields are imported as strings. To import non-string fields or manipulating json output, you need to define [custom parsers](https://github.com/Keyang/node-csvtojson#custom-parsers) in file [*utils/bulk-import/subscription.js*](https://github.com/bcgov/MyGovBC-notification-server/blob/master/utils/bulk-import/subscription.js). For example, to parse *myCustomIntegerField* to integer, add in the *colParser* object

```js
  colParser: {
    ...
    , myCustomIntegerField: (item, head, resultRow, row, colIdx) => {
      return parseInt(item)
    }
  }
```