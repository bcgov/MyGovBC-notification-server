---
layout: docs
title: Notification API
permalink: /docs/api-notification/
---
The notification API encapsulates the backend workflow of staging and dispatching a message to targeted user after receiving the message from event source.


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
        <tr><td>type</td><td>number</td></tr>
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
      <p class="description">user's delivery channel id, for example, email address. For unicast inApp notification, this is authenticated user id.</p>
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

## Create a Notification
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
  2. inputs are validated. If validation fails, error is returned
  3. the notification request is saved to database. 
  4. for push notification, the notification is sent
  5. the state of push notification is updated to *sent* or *error* depending on sending status
  6. the updated notification is saved back to database
  7. the saved record is returned unless there is an error saving to database, in which case error is returned
  
## Update a Notification
```
PUT /notifications/{id}
```
This API is mainly used for marking an inApp notification as read or deleted.

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
    5. the saved record is returned as response unless error occurs, in which case error is returned
