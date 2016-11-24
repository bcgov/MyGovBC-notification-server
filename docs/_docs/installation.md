---
layout: docs
title: Installation
permalink: /docs/installation/
---

*NotifyBC* can be installed in 3 ways:

  1. from source code
  2. deploying a Docker container
  3. deploying to OpenShift

For small-scale production deployment or for the purpose of evaluation, both source code and docker container will do. For large-scale production deployment that requires horizontal scalability, deploying to OpenShift and running on a MongoDB cluster is recommended. To setup a development environment in order to contribute to *NotifyBC*, installing from source code is preferred.

## Install from Source Code

### System Requirements
* Software
  * Git
  * [Node.js](https://nodejs.org)@^4.2.0
  * MongoDB (optional but recommended)
* Network
  * Minimum firewall requirements:
    * outbound to your ISP DNS server
    * outbound to any on port 80, 443 and 22 in order to run build scripts and send SMS messages
    * outbound to any on SMTP port 25 if using direct mail; for SMTP relay, outbound to your configured SMTP server and port only
    * inbound to listening port (3000 by default)from other authorized server ips
    * if *NotifyBC* instance will handle anonymous subscription from client browser, the listening port should be open to internet (i.e. any) either directly or indirectly through a reverse proxy; If *NotifyBC* instance will handle SiteMinder authenticated webapp requests, the listening port should NOT be open to internet. Instead, it should only open to SiteMinder web agent reverse proxy.
  * To use in-app notification feature, both *NotifyBC* API server and client-facing front-end web app have to be protected by SiteMinder
<div class="note warning">
  <h5>Don't expose a NotifyBC instance to both anonymous and SiteMinder-eneabled secure webapps</h5>
  <p>This creates a security loophole. Instead, setup separate NotifyBC instances.</p>
</div>

### Installation
run following commands

```sh
~ $ git clone \
https://github.com/bcgov/MyGovBC-notification-server.git \
notifyBC
~ $ cd notifyBC
~/notifyBC $ npm install
~/notifyBC $ npm start
```

If successful, you will see following output

```
> notification@1.0.0 start .../notification
> node .

Web server listening at: http://localhost:3000
Browse your REST API at http://localhost:3000/explorer
```

Now browse to <a href="http://localhost:3000/explorer" target="_blank">http://localhost:3000/explorer</a> the page displays StrongLoop API Explorer.

## Deploy Docker Container
If you have git and Docker installed, you can run following command to deploy NotifyBC Docker container:

```sh
~ $ git clone \
https://github.com/bcgov/MyGovBC-notification-server.git \
notifyBC
~ $ cd notifyBC
~ $ docker build -t notify-bc .
~ $ docker -p 3000:3000 notify-bc
```

If successful, similar output is displayed as in source code installation.

## Deploy to OpenShift
*NotifyBC* supports deployment to OpenShift Origin of minimum version 1.3, or other compatible platforms such as OpenShift Container Platform of matching version. An [OpenShift instant app template](https://github.com/bcgov/MyGovBC-notification-server/blob/master/.opensift-templates/mongodb-binary-src.yml) has been created to facilitate deployment. This template adopts [source-to-image strategy](https://docs.openshift.org/latest/dev_guide/builds.html#using-secrets-s2i-strategy) with [binary source](https://docs.openshift.org/latest/dev_guide/builds.html#binary-source) input and supports [incremental builds](https://docs.openshift.org/latest/dev_guide/builds.html#incremental-builds). The advantages of this deployment method are

  * flexible to allow instance specific configurations or other customizations
  * reduced build time
  * allow using Jenkins for CI

To deploy to OpenShift, you need to have access to an OpenShift project with minimum edit role . The deployment commands below assumes the project name is *notify-bc*.

The deployment can be initiated from localhost or from CI service such as Jenkins. Regardless, at the initiator's side following software needs to be installed:

  * git
  * [OpenShift CLI](https://docs.openshift.org/latest/cli_reference/index.html)

If using Jenkins, all the software are pre-installed on OpenShift provided Jenkins instant-app template so it is the preferred hosting environment.

### Initiated from localhost
Run following commands

```sh
~ $ git clone \
https://github.com/bcgov/MyGovBC-notification-server.git \
notifyBC
~ $ cd notifyBC
... (optional: customize config)
~ $ oc login -u <username> -p <password>
~ $ oc project notify-bc
~ $ oc create -f .opensift-templates/mongodb-binary-src.yml
~ $ oc process notify-bc|oc create -f-
~ $ oc start-build notify-bc --follow --wait --from-dir=.
```

If the build is successful, you can launch *NotifyBC* from the URL provided in OpenShift *notify-bc* project.

### Initiated from Jenkins

To initiate the deployment from Jenkins, first create all the *NotifyBC* artifacts on OpenShift by running the commands in section [Initiate from localhost](#initiate-from-localhost) above except for the last line, then create a new Freestyle project in Jenkins. Set *Source Code Management* to Git repository https://github.com/bcgov/MyGovBC-notification-server.git and add a *Execute Shell* build step with following scripts, substituting login credential and url placeholders:

```
oc login -u <username> -p <password> <openshift-console-url>
oc project notify-bc
oc start-build notify-bc --from-dir=. --follow --wait
```

If Jenkins is running in the same OpenShift cluster but in a different project from notify-bc, instead of doing *oc login*, you can use Jenkins service account *system:serviceaccount:\<jenkins-project-name\>:\<jenkins-service-name\>*, replacing \<jenkins-project-name\> and \<jenkins-service-name\>. In such case, grant the service account edit role to the *notify-bc* project by running

```sh
~ $ oc policy add-role-to-user edit \
system:serviceaccount:<jenkins-project-name>:<jenkins-service-name> \
-n notify-bc
```

In some editions of OpenShift, *\<jenkins-service-name\>* is fixed to *default*. To find exact Jenkins service account, add following line to Jenkins shell build step and inspect its build output

```sh
oc whoami
```

If Jenkins is running in the same project notify-bc, then the service account already has proper access so there is no need to add role to user.

After setting up the jenkins project, you can manually start the build or add a webhook to trigger the build upon git push.

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
