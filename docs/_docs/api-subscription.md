---
layout: docs
title: Subscription API
permalink: /docs/api-subscription/
---
The subscription API encapsulates the backend workflow of user subscription and un-subscription. Depending on whether a subscription request comes from user browser as a user request or from an authorized server as an admin request, NotifyBC applies different validation rules. For user requests, the notification channel entered by user is unconfirmed. A confirmation code will be associated with this request. The confirmation code  can be created in one of two ways:

 * by NotifyBC based on a RegEx pattern specified in the request.
 * by a trusted third party. This trusted third party encrypts the confirmation code using the public RSA key of the NotifyBC instance and pass the encrypted confirmation code to NotifyBC via user browser in the same subscription request. NotifyBC then decrypts to obtain the confirmation code. This method allows user subscribe to multiple notification services provided by different NotifyBC instances in one browser session and confirm the notification channel only once. 
 
With the confirmation code and a message template, NotifyBC can send out confirmation request to unconfirmed subscription channel. At a minimum this confirmation request should contain the confirmation code. When user receives the message, he/she sends the confirmation code to a NotifyBC provided API to verify against saved record. If match, the state of the subscription request is changed to confirmed.

For admin requests, NotifyBC can still performs the above confirmation process. But admin request also has the privilege to set the subscription state to confirmed, therefore bypassing confirmation. 

## Model Schema
The API operates on following subscription data model fields: 
<table>
  <tr>
    <th>Name</th>
    <th>Attributes</th>
  </tr>
  <tr>
    <td>
      <p class="name">id</p>
      <p class="description">subscription id</p>
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
      <p class="description">name of the delivery channel. Valid values: email, sms.</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>string</td></tr>
        <tr><td>required</td><td>true</td></tr>
        <tr><td>default</td><td>email</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">userChannelId</p>
      <p class="description">user's delivery channel id, for example, email address</p>
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
      <p class="name">state</p>
      <p class="description">state of subscription. Valid values: unconfirmed, confirmed, deleted</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>string</td></tr>
        <tr><td>required</td><td>true</td></tr>
        <tr><td>default</td><td>unconfirmed</td></tr>
      </table>
    </td>
  </tr>
  <tr>
    <td>
      <p class="name">userId</p>
      <p class="description">user id. Auto-populated from SiteMinder header for SiteMinder authenticated user requests.</p>
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
      <p class="name">confirmationRequest</p>
      <div class="description">an object containing these child fields
        <ul>
          <li>
            <div class="name">
              confirmationCodeRegex
            </div> 
            <ul>
              <li>type: string</li>
              <li>regular expression used to generate confirmation code
              </li>
            </ul>
          </li>
          <li>
            <div class="name">
              confirmationCodeEncrypted
            </div> 
            <ul>
              <li>type: string</li>
              <li>encrypted confirmation code
              </li>
            </ul>
          </li>
          <li>
            <div class="name">
              sendRequest
            </div> 
            <ul>
              <li>type: boolean</li>
              <li>
                whether to send confirmation request
              </li>
            </ul>
          </li>
          <li>
            <div class="name">
              from, subject, textBody, htmlBody
            </div> 
            <ul>
              <li>type: string</li>
              <li>
                these are email template fields used for sending email confirmation request. If confirmationRequest.sendRequest is true and channel is email, then these fields should be supplied in order to send confirmation email.
              </li>
            </ul>
          </li>
        </ul>
      </div>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>object</td></tr>
        <tr><td>required</td><td>true for user request; false for admin request</td></tr>
      </table>
    </td>
  </tr>
</table>

## Get Subscriptions
```
GET /subscriptions
```
* inputs 
  * a filter defining fields, where, include, order, offset, and limit
    * parameter name: filter
    * required: false
    * parameter type: query
    * data type: object
* outcome
  * for admin requests, returns unabridged array of subscription data matching the filter
  * for user requests, in addition to filter, following constraints are imposed on the returned array
    * only non-deleted subscriptions 
    * only subscriptions created by the user 
    * the *confirmationRequest* field is removed. 

## Create a Subscription
```
POST /subscriptions
```
* inputs
  * an object containing subscription data model fields. At a minimum all required fields that don't have a default value must be supplied. Id field should be omitted since it's auto-generated. The API explorer only created an empty object for field *confirmationRequest* but you should populate the child fields according to [model schema](#model-schema)
    * parameter name: data
    * required: true
    * parameter type: body
    * data type: object
* outcome

  NotifyBC performs following actions in sequence
  
  1. inputs are validated. If validation fails, error is returned.
  2. the subscription request is saved to database. The saved record, which contains subscription id, is passed on to following operation
  3. for user requests, the *state* field is forced to *unconfirmed*
  4. if *confirmationRequest.confirmationCodeRegex* is populated, a confirmation code is generated conforming to regex and put to field *confirmationRequest.confirmationCode*
  5. otherwise, if *confirmationRequest.confirmationCodeEncrypted* is populated, a confirmation code is generated by decrypting this field using private RSA key, then put decrypted confirmation code to field *confirmationRequest.confirmationCode*
  6. if *confirmationRequest.sendRequest* is true, a confirmation request is sent to *userChannelId* using the template fields in *confirmationRequest* with following string placeholders substituted:
    * \{\{confirmation_code\}\} replaced with *confirmationRequest.confirmationCode*
  7. the updated subscription request is saved to database 
  8. The subscription data, including auto-generated id, is returned as response unless there is error when sending confirmation request or saving to database. For user request, the field *confirmationRequest* is removed prior to sending the response.
  

## Update a Subscription
```
PUT /subscriptions/{id}
```
This API is used for changing user channel id (such as email address) and resending confirmation code. 

* inputs
  * subscription id
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

  NotifyBC processes the request similarly as creating a subscription except during input validation it imposes following extra constraints to user request  
  * only fields *userChannelId*, *state* and *confirmationRequest* can be updated     
  * when changing *userChannelId*, *confirmationRequest* must also be supplied

     
## Delete a Subscription (un-subscribing)
```
DELETE /subscriptions/{id}
```
* inputs
  * subscription id
    * parameter name: id
    * required: true
    * parameter type: path
    * data type: string
* outcome

  NotifyBC performs following actions in sequence
  
  1. the subscription identified by *id* is retrieved
  2. for user request, the *userId* of the subscription is checked against current request user, if not match, error is returned; otherwise
  3. the field *state* is set to *deleted*
  4. the subscription is saved back to database
  5. returns 1 (number of records deleted) unless  error occurs when saving to database
  
## Verify a Confirmation Code
```
GET /subscriptions/{id}/verify
```
* inputs
  * subscription id
    * parameter name: id
    * required: true
    * parameter type: path
    * data type: string
  * confirmation code
    * parameter name: confirmationCode
    * required: true
    * parameter type: query
    * data type: string
* outcome

  NotifyBC performs following actions in sequence
  
  1. the subscription identified by *id* is retrieved
  2. for user request, the *userId* of the subscription is checked against current request user, if not match, error is returned; otherwise
  3. input parameter *confirmationCode* is checked against *confirmationRequest.confirmationCode*. If not match, error is returned; otherwise
  4. *state* is set to *confirmed*
  5. the subscription is saved back to database
  6. returns HTTP status code 200 for success unless error occurs during saving
