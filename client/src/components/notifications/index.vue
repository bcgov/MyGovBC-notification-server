<template>
  <div>
    <h6>Notifications</h6>
    <div id='nb-notification-editor'></div>
  </div>
</template>

<script>
import 'json-editor'
import 'sceditor/src/jquery.sceditor.js'
export default {
  mounted: function() {
    let element = document.getElementById('nb-notification-editor')
    window.JSONEditor.plugins.sceditor.style = ''
    let jsonEditor = new window.JSONEditor(element, {
      theme: 'bootstrap3',
      iconlib: 'fontawesome4',
      schema: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            format: 'html',
            options: {
              wysiwyg: true
            }
          },
          channel: {
            enum: ['email', 'sms', 'in-app'],
            type: 'string'
          },
          userChannelId: {
            type: 'string'
          },
          userId: {
            type: 'string'
          },
          isBroadcast: {
            type: 'boolean'
          },
          skipSubscriptionConfirmationCheck: {
            type: 'boolean'
          },
          validTill: {
            type: 'string',
            format: 'datetime-local'
          },
          invalidBefore: {
            type: 'string',
            format: 'datetime-local'
          },
          message: {
            type: 'object',
            description: 'sub-fields depend on channel'
          }
        },
        required: ['serviceName', 'channel', 'message']
      }
    })
  }
}
</script>

<style lang='less'>
#nb-notification-editor {
  @import '~bootstrap/less/bootstrap.less';
  .sceditor-container {
    * {
      box-sizing: content-box;
    }
    @import '~sceditor/minified/jquery.sceditor.default.min.css';
    @import '~sceditor/minified/themes/default.min.css';
  }
}
</style>
