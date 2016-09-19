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
</table>
