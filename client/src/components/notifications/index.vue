<template>
  <div>
    <h6>Notifications</h6>
    <div id='nb-notification-editor'></div>
    <v-btn color="primary" @click="setCurrentlyEditedNotification">save</v-btn>
    <v-btn color="error" @click="resetEditor">cancel</v-btn>
  </div>
</template>

<script>
import 'json-editor'
import 'sceditor/src/jquery.sceditor.js'
import {
  mapState
} from 'vuex'
export default {
  data: function() {
    return {
      jsonEditor: null
    }
  },
  computed: mapState(['currentlyEditedNotification']),
  methods: {
    setCurrentlyEditedNotification: function() {
      this.$store.dispatch('setCurrentlyEditedNotification', this.jsonEditor.getValue())
    },
    resetEditor: function() {
      this.createJsonEditor()
    },
    createJsonEditor: function() {
      let element = $('#nb-notification-editor', this.$el).get(0)
      window.JSONEditor.plugins.sceditor.style = ''
      if (this.jsonEditor) {
        this.jsonEditor.destroy()
      }
      this.jsonEditor = new window.JSONEditor(element, {
        theme: 'bootstrap3',
        iconlib: 'fontawesome4',
        keep_oneof_values: false,
        required_by_default: true,
        disable_collapse: true,
        startval: this.$store.state.currentlyEditedNotification,
        schema: {
          type: 'object',
          properties: {
            serviceName: {
              type: 'string'
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
              description: 'sub-fields depend on channel',
              oneOf: [{
                title: 'email',
                type: 'object',
                properties: {
                  from: {
                    type: 'string'
                  },
                  subject: {
                    type: 'string'
                  },
                  textBody: {
                    type: 'string',
                    format: 'html'
                  },
                  htmlBody: {
                    type: 'string',
                    format: 'html',
                    options: {
                      wysiwyg: true
                    }
                  }
                }
              }, {
                title: 'sms',
                type: 'object',
                properties: {
                  textBody: {
                    type: 'string',
                    format: 'html'
                  }
                }
              }, {
                title: 'in-app',
                type: 'object'
              }]
            }
          }
        }
      })
    }
  },
  mounted: function() {
    this.createJsonEditor()
  }
}
</script>

<style lang='less'>
#nb-notification-editor {
  @import '~bootstrap/less/bootstrap.less';
  select {
    -webkit-appearance: menulist-button;
  }
  .sceditor-container {
    * {
      box-sizing: content-box;
    }
    @import '~sceditor/minified/jquery.sceditor.default.min.css';
    @import '~sceditor/minified/themes/default.min.css';
  }
}
</style>
