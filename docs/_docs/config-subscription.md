---
layout: docs
title: Subscription
permalink: /docs/config-subscription/
---

Configs in this section customize behavior of subscription and unsubscription workflow. They are all sub-properties of config object *subscription*. This object can be defined as service-agnostic static config as well as service-specific dynamic config, which overrides the static one on a service-by-service basis. Default static config is defined in file */server/config.json*. There is no default dynamic config.

To customize static config, create the config object *subscription* in file */server/config.local.js*

```js
module.exports = {
  "subscription": {
    ...
  }
}
```

to create a service-specific dynamic config, use REST [config api](../api-config/)

```sh
~ $ curl -X POST http://localhost:3000/api/configurations \
-H 'Content-Type: application/json' \
-H 'Accept: application/json' -d @- << EOF 
{ 
  "name": "subscription", 
  "serivceName": "myService", 
  "value": { 
     ...
  } 
}
EOF
```
Sub-properties denoted by ellipsis in the above two code blocks are documented below. A service can have at most one dynamic subscription config.

## Confirmation Request Message
To prevent *NotifyBC* from being used as spam engine, when a subscription request is sent by user (as opposed to admin) without encryption, the content of confirmation request sent to user's notification channel has to come from a pre-configured template as opposed to be specified in subscription request. 

The following default subscription sub-property *confirmationRequest* defines confirmation request message settings for different channels 

```json
{
  "subscription": {
    ...
    "confirmationRequest": {
      "sms": {
        "confirmationCodeRegex": "\\d{5}",
        "sendRequest": true,
        "textBody": "Enter {confirmation_code} on screen"
      },
      "email": {
        "confirmationCodeRegex": "\\d{5}",
        "sendRequest": true,
        "from": "no_reply@invlid.local",
        "subject": "Subscription confirmation",
        "textBody": "Enter {confirmation_code} on screen",
        "htmlBody": "Enter {confirmation_code} on screen"
      }
    }
  }
}
```

## Confirmation Verification Acknowledgement Messages
You can customize *NotifyBC*'s on-screen response message to confirmation code verification requests. The following is the default settings

```json
{
  "subscription": {
    ...
    "confirmationAcknowledgements": {
      "successMessage": "You have been subscribed.",
      "failureMessage": "Error happened while confirming subscription."
    }
  }
}
```
In addition to customizing the message, you can define a redirect URL instead of displaying *successMessage* or *failureMessage*. For example, to redirect on-screen acknowledgement to a page in your app for service *myService*, create a dynamic config by calling REST config api  

```sh
~ $ curl -X POST 'http://localhost:3000/api/configurations' \
-H 'Content-Type: application/json' \
-H 'Accept: application/json' -d @- << EOF
{  
  "name": "subscription",  
  "serivceName": "myService", 
  "value": { 
    "confirmationAcknowledgements": { 
      "redirectUrl": "https://myapp/subscription/acknowledgement" 
    } 
  } 
}
EOF
```
If error happened during subscription confirmation, query string *?err=\<error\>* will be appended to *redirectUrl*.

## Duplicated Subscription
*NotifyBC* by default allows a user subscribe to a service through same channel multiple times. If this is undesirable, you can set config *subscription.detectDuplicatedSubscription* to true. In such case instead of sending user a confirmation request, *NotifyBC* sends user a duplicated subscription notification message. Unlike a confirmation request, duplicated subscription 
notification message either shouldn't contain any information to allow user confirm the subscription, or it should contain a link that allows user to replace existing confirmed subscription with this one. You can customize duplicated subscription notification message by setting config *subscription.duplicatedSubscriptionNotification* in either *config.local.js* or using configuration api for service-specific dynamic config. Following is the default settings defined in
*config.json*

```json
{
  ...
  "subscription": {
    ...
    "detectDuplicatedSubscription": false,
    "duplicatedSubscriptionNotification": {
      "sms": {
        "textBody": "A duplicated subscription was submitted and rejected. you will continue receiving notifications. If the request was not created by you, pls ignore this msg."
      },
      "email": {
        "from": "no_reply@invalid.local",
        "subject": "Duplicated Subscription",
        "textBody": "A duplicated subscription was submitted and rejected. you will continue receiving notifications. If the request was not created by you, please ignore this message."
      }
    }
  }
}
```

To allow user to replace existing confirmed subscription, set the message to something like 

```json
{
  ...
  "subscription": {
    ...
    "detectDuplicatedSubscription": false,
    "duplicatedSubscriptionNotification": {
      "email": {
        "textBody": "A duplicated subscription was submitted. If the request is not submitted by you, please ignore this message. Otherwise if you want to replace existing subscription with this one, click {subscription_confirmation_url}&replace=true."
      }
    }
  }
}
```
The query parameter *&replace=true* following the token *{subscription_confirmation_url}* will cause existing subscription be replaced.

## Anonymous Unsubscription
For anonymous subscription, *NotifyBC* supports one-click opt-out by allowing unsubscription URL provided in notifications. To thwart unauthorized unsubscription attempts, *NotifyBC* implemented and enabled by default two security measurements 

* Anonymous unsubscription request requires unsubscription code, which is a random string generated at subscription time. Unsubscription code reduces brute force attack risk by increasing size of key space. Without it, an attacker only needs to successfully guess subscription id. Be aware, however, the unsubscription code has to be embedded in unsubscription link. If the user forwarded a notification to other people, he/she is still vulnerable to unauthorized unsubscription.
* Acknowledgement notification - a (final) notification is sent to user acknowledging unsubscription, and offers a link to revert had the change been made unauthorized. A deleted subscription (unsubscription) may have a limited lifetime (30 days by default) according to retention policy defined in [cron jobs](../config-cronJobs/) so the reversion can only be performed within the lifetime.  

You can customize anonymous unsubscription settings by changing the *anonymousUnsubscription* configuration. Following is the default settings defined in [config.json](https://github.com/bcgov/MyGovBC-notification-server/blob/master/server/config.json)
 
```json
{
  "subscription": {
    ...
    "anonymousUnsubscription": {
      "code": {
        "required": true,
        "regex": "\\d{5}"
      },
      "acknowledgements":{
        "onScreen": {
          "successMessage": "You have been un-subscribed.",
          "failureMessage": "Error happened while un-subscribing."
        },
        "notification":{
          "email": {
            "from": "no_reply@invlid.local",
            "subject": "Un-subscription acknowledgement",
            "textBody": "This is to acknowledge you have been un-subscribed from receiving notification for {unsubscription_service_names}. If you did not authorize this change or if you changed your mind, click {unsubscription_reversion_url} to revert."
          }
        }
      }
    }
  }
}
```
The settings control whether or not unsubscription code is required, its RegEx pattern, and acknowledgement message templates for both on-screen and push notifications. Customization should be made to file */server/config.local.js* for static config or using configuration api for service-specific dynamic config.

To disable acknowledgement notification, set *subscription.anonymousUnsubscription.acknowledgements.notification* or a specific channel underneath to *null*

```js
module.exports = {
  subscription:{
    anonymousUnsubscription: {
      acknowledgements:{
        notification: null
      }
    }
  }
}
```

For on-screen acknowledgement, you can define a redirect URL instead of displaying *successMessage* or *failureMessage*. For example, to redirect on-screen acknowledgement to a page in your app for all services, create following config in file */server/config.local.js* 

```js
module.exports = {
  "subscription":{
    "anonymousUnsubscription": {
      "acknowledgements":{
        "onScreen": {
          "redirectUrl": "https://myapp/unsubscription/acknowledgement"
        }
      }
    }
  }
}
```
If error happened during unsubscription, query string *?err=\<error\>* will be appended to *redirectUrl*.

<a name="anonymousUndoUnsubscription"></a>
You can customize message displayed on-screen when user clicks revert unsubscription link in the acknowledgement notification. The default settings are

```json
{
  "subscription": {
    "anonymousUndoUnsubscription":{
      "successMessage": "You have been re-subscribed.",
      "failureMessage": "Error happened while re-subscribing."
    }
  }
}
```
You can redirect the message page by defining *anonymousUndoUnsubscription.redirectUrl*.
