---
layout: docs
title: Notification API
permalink: /docs/api-notification/
---
The notification API encapsulates the backend workflow of staging and dispatching a message to targeted user after receiving the message from event source. 

 Depending on whether an API call comes from user browser as a user request or from an authorized server application as an admin request, NotifyBC applies different permissions. Admin request allows full CRUD operations. An authenticated user request, on the other hand, are only allowed to get a list of in-app pull notifications targeted to the current user and changing the state of the notifications. An unauthenticated user request can not access any  API.
 
When a notification is created by the event source server application, the message is saved to database prior to responding to API caller. In addition, for push notification, the message is delivered immediately, i.e. the API call is synchronous. For in-app pull notification, the message, which by default is in state *new*, can be retrieved later on by browser user request. A user request can only get the list of in-app messages targeted to the current user. A user request can then change the message state to *read* or *deleted* depending on user action. A deleted message cannot be retrieved subsequently by user requests, but the state can be updated given the correct *id*. 
<div class="note info">
  <h5><i>Deleted</i> message is still kept in database.</h5>
  <p><i>NotifyBC</i> provides API for deleting a notification. For the purpose of auditing and recovery, this API only marks the <i>state</i> field as deleted rather than deleting the record from database.</p>
</div>
<div class="note">
  <h5>ProTips™ undo in-app notification deletion within a session</h5>
  <p>Because "deleted" message is still kept in database, you can implement undo feature for in-app notification as long as the message id is retained prior to deletion within the current session. To undo, call <a href="#update-a-notification">update</a> API to set desired state. </p>
</div>

In-app pull notification also supports message expiration by setting a date in field *validTill*. An expired message cannot be retrieved by user requests. 
 
A message, regardless of push or pull, can be unicast or broadcast. A unicast message is intended for an individual user whereas a broadcast message is intended for all confirmed subscribers of a service. A unicast message must have field *userChannelId* populated. The value of *userChannelId* is channel dependent. In the case of email for example, this would be user's email address. A broadcast message must set *isBroadcast* to true and leave *userChannelId* empty.

<div class="note info">
  <h5>Why field <i>isBroadcast</i>?</h5>
  <p>Unicast and broadcast message can be distinguished by whether field <i>userChannelId</i> is empty or not alone. So why the extra field <i>isBroadcast</i>? This is in order to prevent inadvertent marking a unicast message broadcast by omitting <i>userChannelId</i> or populating  it with empty value. The precaution is necessary because in-app notifications may contain personalized and confidential information.</p>
</div>
*NotifyBC* ensures the state of an in-app broadcast message is isolated by user, so that for example, a message read by one user is still new to another user. To achieve this, *NotifyBC* maintains two internal fields of array type - *readBy* and *deletedBy*. When a user request updates the *state* field of an in-app broadcast message to *read* or *deleted*, instead of altering the *state* field, *NotifyBC* appends the current user to *readBy* or *deletedBy* list. When user request retrieving in-app messages, the *state* field of the broadcast message in HTTP response is updated based on whether the user exists in field *deletedBy* and *readBy*. If existing in both fields, *deletedBy* takes precedence (the message therefore is not returned). The record in database, meanwhile, is unchanged. Neither field *deletedBy* nor *readBy* is visible to user request.


## Model Schema
The API operates on following notification data model fields: 
<table>
  <tr>
    <th>Name</th>
    <th>Attributes</th>
  </tr>
  <tr>
    <td>
      <p class="name">id</p>
      <p class="description">notification id</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>string, format depends on db</td></tr>
        <tr><td>auto-generated</td><td>true</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">serviceName</p>
      <p class="description">name of the service</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>string</td></tr>
        <tr><td>required</td><td>true</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">channel</p>
      <p class="description">name of the delivery channel. Valid values: inApp, email, sms.</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>string</td></tr>
        <tr><td>required</td><td>true</td></tr>
        <tr><td>default</td><td>inApp</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">userChannelId</p>
      <p class="description">user's delivery channel id, for example, email address. For unicast inApp notification, this is authenticated user id. When sending unicast push notification, either <i>userChannelId</i> or <i>userId</i> is required.</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>string</td></tr>
        <tr><td>required</td><td>false</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">userId</p>
      <p class="description">authenticated user id. When sending unicast push notification, either <i>userChannelId</i> or <i>userId</i> is required.</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>string</td></tr>
        <tr><td>required</td><td>false</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">state</p>
      <p class="description">state of notification. Valid values: new, read (inApp only), deleted (inApp only), sent (push only), error</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>string</td></tr>
        <tr><td>required</td><td>true</td></tr>
        <tr><td>default</td><td>new</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">created</p>
      <p class="description">date and time of creation</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>date</td></tr>
        <tr><td>required</td><td>false</td></tr>
        <tr><td>default</td><td>$now</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">isBroadcast</p>
      <p class="description">whether it's a broadcast message. A broadcast message should omit <i>userChannelId</i> and set <i>isBroadcast</i> to true</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>boolean</td></tr>
        <tr><td>required</td><td>false</td></tr>
        <tr><td>default</td><td>false</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">skipSubscriptionConfirmationCheck</p>
      <p class="description">When sending unicast push notification, whether or not to verify if the recipient has a confirmed subscription. This field allows subscription information be kept elsewhere and <i>NotifyBC</i> be used as a unicast push notification gateway only.</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>boolean</td></tr>
        <tr><td>required</td><td>false</td></tr>
        <tr><td>default</td><td>false</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">validTill</p>
      <p class="description">expiration date of the message. Applicable to inApp notification only.</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>date</td></tr>
        <tr><td>required</td><td>false</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">message</p>
      <div class="description">an object whose child fields are channel dependent:
        <ul>
          <li>
            <div>
              for inApp, <i>NotifyBC</i> doesn't have any restriction as long as web application can handle the message. <i>subject</i> and <i>body</i> are  common examples.
            </div> 
          </li>
          <li>
            <div>
              for email: <span class="name"> from, subject, textBody, htmlBody</span>
            </div> 
            <ul>
              <li>type: string</li>
              <li>
                these are email template fields.
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>object</td></tr>
        <tr><td>required</td><td>true</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">readBy</p>
      <p class="description">this is an internal field to track the list of users who have read an inApp broadcast message. It's not visible to a user request.</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>array</td></tr>
        <tr><td>internal</td><td>true</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">deletedBy</p>
      <p class="description">this is an internal field to track the list of users who have marked an inApp broadcast message as deleted. It's not visible to a user request.</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>array</td></tr>
        <tr><td>internal</td><td>true</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">errorWhenSendingToUsers</p>
      <p class="description">this is an internal field to track the list of <i>userChannelId</i>s a broadcast push notification failed to deliver to. It is returned to notification creation API caller.</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>array</td></tr>
        <tr><td>internal</td><td>true</td></tr>
      </table>
    </td>
  </tr>
</table>


## Get Notifications
```
GET /notifications
```
* inputs 
  * a filter defining fields, where, include, order, offset, and limit
    * parameter name: filter
    * required: false
    * parameter type: query
    * data type: object
* outcome
  * for admin requests, returns unabridged array of notification data matching the filter
  * for user requests, in addition to filter, following constraints are imposed on the returned array 
    * only inApp notifications 
    * only non-deleted notifications. For broadcast notification, non-deleted means not marked by current user as deleted
    * only non-expired notifications
    * for unicast notifications, only the ones targeted to current user
    * if current user is in *readBy*, then the *state* is changed to *read*
    * the internal field *readBy* and *deletedBy* are removed

## Send Notifications
```
POST /notifications
```
* inputs
  * an object containing notification data model fields. At a minimum all required fields that don't have a default value must be supplied. Id field should be omitted since it's auto-generated. The API explorer only created an empty object for field *message* but you should populate the child fields according to [model schema](#model-schema)
    * parameter name: data
    * required: true
    * parameter type: body
    * data type: object
* outcome

  NotifyBC performs following actions in sequence
  
  1. if it's a user request, error is returned
  2. inputs are validated. If validation fails, error is returned. In particular, for unicast push notification, the recipient as identified by either *userChannelId* or *userId* must have a confirmed subscription if field *skipSubscriptionConfirmationCheck* is not set to true. If *skipSubscriptionConfirmationCheck* is set to true, then the subscription check is skipped, but in such case the request must contain *userChannelId*, not *userId* as subscription data is not queried to obtain *userChannelId* from *userId*.   
  3. the notification request is saved to database
  4. for unicast push notification, the message is sent to targeted user; for broadcast push notification, the message is sent to all confirmed subscribers of the service in the delivery channel. 
  5. the state of push notification is updated to *sent* or *error* depending on sending status. For broadcast push notification, the delivery could be failed only for a subset of users. In such case, the field *errorWhenSendingToUsers* contains the list of *userChannelId*s the message failed to deliver to, but the state will still be set to *sent*
  6. the updated notification is saved back to database
  7. the saved record is returned unless there is an error saving to database, in which case error is returned

* example

  To send a unicast email push notification, copy and paste following json object to the data value box in API explorer, change email addresses as needed, and click *Try it out!* button:
  
  ```
  {
    "serviceName": "education",
    "userChannelId": "foo@bar.com",
    "skipSubscriptionConfirmationCheck": true,
    "message": {
      "from": "no_reply@bar.com",
      "subject": "test",
      "textBody": "This is a test"
    },
    "channel": "email"
  }
  ```

  As the result, *foo@bar.com* should receive an email notification even if the user is not a confirmed subscriber, and following json object is returned to caller upon sending the email successfully:
  
  ```
  {
    "serviceName": "education",
    "state": "sent",
    "userChannelId": "foo@bar.com",
    "skipSubscriptionConfirmationCheck": true,
    "message": {
      "from": "no_reply@bar.com",
      "subject": "test",
      "textBody": "This is a test"
    },
    "created": "2016-09-30T20:37:06.011Z",
    "channel": "email",
    "isBroadcast": false,
    "id": "57eeccf23427b61a4820775e"
  }
  ```

## Update a Notification
```
PATCH /notifications/{id}
```
This API is mainly used for updating an inApp notification.

* inputs
  * notification id
    * parameter name: id
    * required: true
    * parameter type: path
    * data type: string
  * an object containing fields to be updated. 
    * parameter name: data
    * required: true
    * parameter type: body
    * data type: object

* outcome
  * for user requests, NotifyBC performs following actions in sequence
    1. for unicast notification, if the notification is not targeted to current user, error is returned
    2. all fields except for *state* are discarded from the input
    3. for broadcast notification, current user id in appended to array *readBy* or *deletedBy*, depending on whether *state* is *read* or *deleted*, unless the user id is already in the array. The *state* field itself is then discarded
    4. the notification identified by *id* is merged with the updates and saved to database
    5. HTTP response code 200 is returned, unless there is error.  
    
## Delete a Notification
This API is mainly used for marking an inApp notification deleted. It has the same effect as updating a notification with state set to *deleted*.

```
DELETE /notifications/{id}
```
* inputs
  * notification id
    * parameter name: id
    * required: true
    * parameter type: path
    * data type: string
* outcome: same as the outcome of [Update a Notification](#update-a-notification) with *state* set to *deleted*.
