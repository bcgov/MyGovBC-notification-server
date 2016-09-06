NotifiyBC
===========

A general purpose notification subscription API Server supporting multi-channel deliveries. The application is designed for MyGovBC but can be used independently. 

##Features
### Notification
* Support both in-app pull notifications and push notifications
* Support both uni-cast and broadcast messages
* Deliver push notifications to confirmed subscription channels:
  * email
  * sms (planned)
* For in-app pull notifications
  * support message states - read, deleted
  * deleted messages are not deleted immediately for auditing and recovery purposes
 
### Subscription
* Verify the ownership of push notifciation subscription channel:
  * generates confirmation code based on a regex input
  * send confirmation request to unconfirmed subscription channel
  * verify confirmation code
  
## Assumptions
* For in-app notifcations, the application has to be protected by SiteMinder

## Installation
    git clone https://github.com/bcgov/MyGovBC-notification-server.git
    cd MyGovBC-notification-server
    npm install
    npm start
    
## Configuration
### smtp
By default *NotifiyBC* uses smtp server on localhost as configured in */server/config.json*. To change, instead of updating */server/config.json*, create file */server/config.local.json* containing

    {
      "smtp": {
        "host": "smtp.foo.com",
        "port": 25,
        "ignoreTLS": true,
        "secure": false
      }
    }


## License

    Copyright 2016 Province of British Columbia

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at 

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
