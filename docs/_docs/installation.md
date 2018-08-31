---
layout: docs
title: Installation
permalink: /docs/installation/
---

*NotifyBC* can be installed in 3 ways:

  1. deploying locally from source code
  2. deploying a Docker container
  3. deploying to OpenShift

For small-scale production deployment or for evaluation, both source code and docker container will do. For large-scale production deployment that requires horizontal scalability, the recommendation is one of

* deploying to OpenShift
* setting up a load banalced app cluster from source code build, backed by mongodb.

To setup a development environment in order to contribute to *NotifyBC*, 
installing from source code is preferred.

## Deploy Locally from Source Code

### System Requirements
* Software
  * Git
  * [Node.js](https://nodejs.org)@>=6.9.1
* Services
  * MongoDB, optional but recommended for production
  * A standard SMTP server to deliver outgoing email, optional but recommended for production. You can use an existing organizational shared service, cloud-based service such as Amazon SES, or setting up your own SMTP server 
  * A tcp proxy server such as [nginx stream proxy](http://nginx.org/en/docs/stream/ngx_stream_proxy_module.html) if list-unsubscribe by email is needed and *NotifyBC* server cannot expose port 25 to internet
  * A SMS service provider account if needs to enable SMS channel. The supported service providers are
    * Twilio (default) 
  * SiteMinder, if need to allow authenticated user request
* Network and Permissions
  * Minimum runtime firewall requirements:
    * outbound to your ISP DNS server
    * outbound to any on port 80, 443 and 22 in order to run build scripts and send SMS messages
    * outbound to any on SMTP port 25 if using direct mail; for SMTP relay, outbound to your configured SMTP server and port only
    * inbound to listening port (3000 by default)from other authorized server ips
    * if *NotifyBC* instance will handle anonymous subscription from client browser, the listening port should be open to internet either directly or indirectly through a reverse proxy; If *NotifyBC* instance will only handle SiteMinder authenticated webapp requests, the listening port should NOT be open to internet. Instead, it should only open to SiteMinder web agent reverse proxy.
  * If list-unsubscribe by email is needed, then one of the following must be met 
    * *NotifyBC* can bind to port 25 opening to internet
    * a tcp proxy server of which port 25 is open to internet. This proxy server can reach *NotifyBC* on a tcp port. 

### Installation
<div class="note">
  <h5>ProTips™ install from behind firewall</h5>
  <p>If you want to install on a server behind firewall which restricts internet connection, you can work around the firewall as long as you have access to a http(s) forward proxy server. Assuming the proxy server is http://my_proxy:8080 which proxies both http and https requests, to use it:</p>
  <ul>
    <li>For Linux, run
        <p>export http_proxy=http://my_proxy:8080</p>
        <p>export https_proxy=http://my_proxy:8080</p>
        <p>git config --global url."https://".insteadOf git://</p>
    </li>
    <li>For Windows, run
        <p>git config --global http.proxy http://my_proxy:8080</p>
        <p>git config --global url."https://".insteadOf git://</p>
        <p>npm config set proxy http://my_proxy:8080</p>
        <p>npm i -g yarn</p>
        <p>yarn config set proxy http://my_proxy:8080</p>
    </li>
  </ul>
</div>

run following commands

```sh
~ $ git clone \
https://github.com/bcgov/MyGovBC-notification-server.git \
notifyBC
~ $ cd notifyBC
~/notifyBC $ npm i -g yarn && yarn install
~/notifyBC $ npm start
```

If successful, you will see following output

```
> notification@1.0.0 start .../notification
> node .

...
Web server listening at: http://localhost:3000
```

Now browse to <a href="http://localhost:3000" target="_blank">http://localhost:3000</a> the page displays NotifyBC Web Console.

#### Install Windows Service
After get the app running interactivelly, if your server is Windows and you want to install the app as a Windows service, run

```
npm install -g node-windows
npm link node-windows
node 'windows service.js'
```

This will create and start service *notifyBC*. To change service name, modify file *windows service.js* before running it. See [node-windows](https://github.com/coreybutler/node-windows) for other operations such as uninstalling the service.


## Deploy Docker Container
If you have git and Docker installed, you can run following command to deploy *NotifyBC* Docker container:

```sh
~ $ git clone \
https://github.com/bcgov/MyGovBC-notification-server.git \
notifyBC
~ $ cd notifyBC
~ $ docker build -t notify-bc .
~ $ docker run -p 3000:3000 notify-bc
```

If successful, similar output is displayed as in source code installation.

## Deploy to OpenShift
*NotifyBC* supports deployment to OpenShift Origin of minimum version 1.5, or other compatible platforms such as OpenShift Container Platform of matching version. [OpenShift instant app templates](https://github.com/bcgov/MyGovBC-notification-server/blob/master/.opensift-templates) have been created to facilitate build and deployment. This template adopts [source-to-image strategy](https://docs.openshift.org/latest/dev_guide/builds.html#using-secrets-s2i-strategy) with [binary source](https://docs.openshift.org/latest/dev_guide/builds.html#binary-source) input and supports [incremental builds](https://docs.openshift.org/latest/dev_guide/builds.html#incremental-builds). 

To deploy to OpenShift, you need to have access to relevant OpenShift projects with minimum edit role. This implies you know and have access to OpenShift web console as identified by *\<openshift-console-url\>* below.

OpenShift is expected to be setup this way:

* 1 project for build. This project is identified by *\<yourprojectname-tools\>*  below. All build related activities take place in this project.
* 1 or more projects for runtime environments such as *dev*, *test* etc, identified by *\<yourprojectname-\<env\>>* below. All deployment activities and runtime artifacts are contained in respective projects to make an environment self-sufficient.

The deployment can be initiated from localhost or automated by CI service such as Jenkins. Regardless, at the initiator's side following software needs to be installed:

  * git
  * [OpenShift CLI](https://docs.openshift.org/latest/cli_reference/index.html)

If using Jenkins, all the software are pre-installed on OpenShift provided Jenkins instant-app template so it is the preferred CI environment. Instructions below assumes OpenShift Jenkins is used. OpenShift Jenkins should be created in project *\<yourprojectname-tools\>*.  

### Hosting Environment Setup

1. Install the templates

   ```bash
   ~ $ git clone \
   https://github.com/bcgov/MyGovBC-notification-server.git \
   notifyBC
   ~ $ cd notifyBC
   ~ $ oc login -u <username> -p <password> <openshift-console-url>
   ~ $ oc create -f .opensift-templates/notify-bc-build.yml -n <yourprojectname-tools>
   ~ $ oc create -f .opensift-templates/notify-bc.yml -n <yourprojectname-<env>>
   ```
   After this step you will find an instant app template called *notify-bc-build* available in the *\<yourprojectname-tools\>* project and *notify-bc* in the *\<yourprojectname-\<env\>>* project.

   The template *notify-bc.yml* creates a single instance MongoDB. If you want a 3-node MongoDB cluster, use template *notify-bc-mongodb-cluster.yml* instead, i.e. replace last command  with

   ```bash
   ~ $ oc create -f .opensift-templates/notify-bc-mongodb-cluster.yml -n <yourprojectname-<env>>
   ```
   MongoDB cluster created by this template uses stateful sets. As of OpenShift 1.5, stateful set is in technology preview phase so use the feature with precaution.
2. create OpenShift apps by clicking *Add to Project* in web console of respective projects, select JavaScript in languages catalog, and click either *notify-bc-build* or *notify-bc* template. Adjust parameters as you see fit.
3. (optional) create instance-specific [configuration](../config-overview/) files by modifying configMap *notify-bc*. To do so, in web console of a runtime environment project, click *Resources > Config Maps > notify-bc > Actions > Edit*. Each config file corresponds to an item in configMap with key being the file name. For example, to create config file *config.local.json*, create an item with key *config.local.json*. 

<div class="note">
  <h5>ProTips™ backup config files</h5>
  <p>Backup config files to a private secured SCM outside of OpenShift is highly recommended, especially for production environment.</p>
</div>

### Build
To build runtime image manually from localhost, run

```sh
~ $ oc start-build notify-bc --follow --wait --from-dir=. -n <yourprojectname-tools>
```
If build is successful, you will find image *\<yourprojectname-tools\>/notify-bc:latest* is updated.

To initiate the build from Jenkins, create a new Freestyle project. Set *Source Code Management* to Git repository https://github.com/bcgov/MyGovBC-notification-server.git and add a *Execute Shell* build step with the command. 

Proper authorization is needed for Jenkins to access OpenShift. The service account used by Jenkins has to be granted edit role in all projects by running

```sh
~ $ oc policy add-role-to-user edit \
system:serviceaccount:<yourprojectname-tools>:<jenkins-service-name> \
-n <yourprojectname-tools>
~ $ oc policy add-role-to-user edit \
system:serviceaccount:<yourprojectname-tools>:<jenkins-service-name> \
-n <yourprojectname-<env>>
```
replace *\<jenkins-service-name\>* with the jenkins service name. In some editions of OpenShift, *\<jenkins-service-name\>* is fixed to *default*. To find exact Jenkins service account, add following line to Jenkins shell build step and inspect its build output

```sh
oc whoami
```

### Deploy
Deployment is achieved through image tagging. This guarantees the image deployed to different runtime environments are binary identical. To deploy manually from localhost, run

```sh
~ $ oc tag <yourprojectname-tools>/notify-bc:latest <yourprojectname-<env>>/notify-bc:latest
```
If the deployment is successful, you can launch *NotifyBC* from the URL provided in *\<yourprojectname-\<env\>>* project.

To initiate the deployment from Jenkins, add the above command to the build command in Jenkins. 

### Change Propagation
To promote runtime image from one environment to another, for example from *dev* to *test*, run

```
oc tag <yourprojectname-tools>/notify-bc:latest <yourprojectname-test>/notify-bc:latest <yourprojectname-tools>/notify-bc:test
```
The above command will deploy the latest (which should also be dev) runtime image to *test* env. The purpose of tagging runtime image of *test* env in both \<yourprojectname-test\>/notify-bc:latest and \<yourprojectname-tools\>/notify-bc:test is to use \<yourprojectname-tools\>/notify-bc:test as backup such that in case the image stream \<yourprojectname-test\>/notify-bc, which is used by *test* runtime pods, is deleted inadvertently, it can be recovered from \<yourprojectname-tools\>/notify-bc:test.

## Install Docs Website (Optional)
If you want to contribute to *NotifyBC* docs beyond simple fix ups, you can install [Jekyll](https://jekyllrb.com/) through Ruby bundler and render this web site locally:

1. Install [Ruby](https://www.ruby-lang.org/en/documentation/installation/)
2. Run

```sh
cd /docs
gem install bundler
bundle install
bundle exec jekyll serve
```

If everything goes well, you will get output:

```
Configuration file: .../notifyBC/docs/_config.yml
            Source: .../notifyBC/docs
       Destination: .../notifyBC/docs/_site
 Incremental build: disabled. Enable with --incremental
      Generating...
                    done in 3.971 seconds.
 Auto-regeneration: enabled for '.../notifyBC/docs'
Configuration file: .../notifyBC/docs/_config.yml
    Server address: http://127.0.0.1:4000/MyGovBC-notification-server/
  Server running... press ctrl-c to stop.
```

You can now browse to the local docs site <a href="http://127.0.0.1:4000/MyGovBC-notification-server/" target="_blank">http://127.0.0.1:4000/MyGovBC-notification-server/</a>
