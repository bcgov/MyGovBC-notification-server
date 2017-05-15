---
layout: docs
title: Configuration API
permalink: /docs/api-config/
---
The configuration API is used by administrators to define dynamic configurations, hence **the API is accessible by admin requests only**. Dynamic configuration is needed in situations like

* RSA key pair generated automatically at boot time if not present
* service-specific subscription confirmation request message template

## Model Schema
The API operates on following configuration data model fields: 
<table>
  <tr>
    <th>Name</th>
    <th>Attributes</th>
  </tr>
  <tr>
    <td>
      <p class="name">id</p>
      <p class="description">config id</p>
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
      <p class="name">name</p>
      <p class="description">config name</p>
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
      <p class="name">value</p>
      <div class="description">config value.
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
      <p class="name">serviceName</p>
      <p class="description">name of the service the config applicable to</p>
    </td>
    <td>
      <table>
        <tr><td>type</td><td>string</td></tr>
        <tr><td>required</td><td>false</td></tr>
      </table>
    </td>
  </tr>
</table>

## Get Configurations
```
GET /configurations
```
* inputs 
  * a [filter](https://loopback.io/doc/en/lb3/Querying-data.html#filters) defining fields, where, include, order, offset, and limit
    * parameter name: filter
    * required: false
    * parameter type: query
    * data type: object
* outcome
  
  For admin request, a list of config items matching the filter; forbidden for user request

* example

  to retrieve config items with name *rsa*, run
  
  ```bash
  ~ $ curl -X GET --header 'Accept: application/json' \
  'http://localhost:3000/api/configurations?filter=%7B%22where%22%3A%20%7B%22name%22%3A%22rsa%22%7D%7D'
  ```
  the value of filter query parameter is the [stringified JSON](https://loopback.io/doc/en/lb3/Querying-data.html#using-stringified-json-in-rest-queries) 
  
  ```json
  {"where": {"name":"rsa"}}
  ```

## Create a Configuration
```
POST /configurations
```
* inputs 
  * an object containing configuration data model fields. At a minimum all required fields that don't have a default value must be supplied. Id field should be omitted since it's auto-generated. The API explorer only created an empty object for field *value* but you should populate the child fields.
    * parameter name: data
    * required: true
    * parameter type: body
    * data type: object
* outcome
  
  For admin request, create the config item requested if all required fields are populated; forbidden for user request

* example
  
  see the cURL command on how to create a [Subscription Confirmation Request Template](../configuration/#subscription-confirmation-request-template)

## Update a Configuration
```
PATCH /configurations/{id}
```
* inputs 
  * configuration id
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
  
  For admin request, update the config item requested if all required fields are populated; forbidden for user request


## Delete a Configuration
```
DELETE /configurations/{id}
```
* inputs 
  * configuration id
    * parameter name: id
    * required: true
    * parameter type: path
    * data type: string

* outcome
  
  For admin request, delete the config item requested; forbidden for user request

