---
title: Developer Notes
layout: docs
permalink: /docs/developer-notes/
---

## Automated Testing
Test framework is created with and follows [Jasmine 2.6](https://jasmine.github.io/2.6/node.html) convention. To launch test, run `npm test`. To debug test scripts in IDE such as WebStorm, create a Node.js run/debug config, set *cwd* to project root and script to */node_modules/jasmine/bin/jasmine.js*.

Jenkins CI runs tests as part of the build, therefore all test scripts should be able to run unattended, headless, quickly and depend only on local resources. 

## Code Coverage
After running `npm test`, Istanbul code coverage report is generated in git ignored folder */coverage*.  */coverage/lcov-report/index.html* is the report entry point.
