---
title: Developer Notes
layout: docs
permalink: /docs/developer-notes/
---

## Unit Testing
Unit testing framework is created with and follows [Jasmine 2.6](https://jasmine.github.io/2.6/node.html) convention. To launch test, run `npm test`. To debug unit testing scripts in IDE such as WebStorm, create a Node.js run/debug config, set *cwd* to project root and script to *~/node_modules/jasmine/bin/jasmine.js*.

Jenkins CI runs unit tests as part of the build, therefore all unit test scripts should be able to run unattended, headless, quickly and depend only on local resources. 
