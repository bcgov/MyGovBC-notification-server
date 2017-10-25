<template>
  <div>
    <div id='nb-notification-editor'></div>
    <v-btn color="primary" @click="setCurrentlyEditedNotification">save</v-btn>
    <v-btn color="error" @click="resetEditor">cancel</v-btn>
  </div>
</template>

<script>
import 'json-editor'
import 'sceditor/src/jquery.sceditor.js'
export default {
  data: function() {
    return {
      jsonEditor: null,
      currentlyEditedNotification: undefined
    }
  },
  props: ['item'],
  methods: {
    setCurrentlyEditedNotification: async function() {
      try {
        let item = this.jsonEditor.getValue()
        await this.$store.dispatch('setNotification', item)
        this.currentlyEditedNotification = item
        this.$emit('submit')
      } catch (ex) {
        this.createJsonEditor()
      }
    },
    resetEditor: function() {
      this.createJsonEditor()
      this.$emit('cancel')
    },
    createJsonEditor: function() {
      let element = $('#nb-notification-editor', this.$el).get(0)
      window.JSONEditor.plugins.sceditor.style = ''
      window.JSONEditor.plugins.sceditor.width = '99%'
      if (this.jsonEditor) {
        this.jsonEditor.destroy()
      }
      this.jsonEditor = new window.JSONEditor(element, {
        theme: 'bootstrap3',
        iconlib: 'fontawesome4',
        keep_oneof_values: false,
        required_by_default: true,
        // required: ['serviceName', 'channel', 'message'],
        remove_empty_properties: true,
        disable_collapse: true,
        startval: this.item,
        schema: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              options: {
                hidden: true
              }
            },
            serviceName: {
              type: 'string',
              propertyOrder: 100
            },
            channel: {
              enum: ['email', 'sms', 'in-app'],
              type: 'string',
              propertyOrder: 200
            },
            userId: {
              type: 'string',
              propertyOrder: 250
            },
            userChannelId: {
              type: 'string',
              propertyOrder: 300
            },
            isBroadcast: {
              type: 'string',
              enum: [true, false],
              propertyOrder: 400
            },
            skipSubscriptionConfirmationCheck: {
              type: 'string',
              enum: [true, false],
              propertyOrder: 500
            },
            validTill: {
              type: 'string',
              format: 'datetime',
              description: 'use format yyyy-mm-ddThh:mm:ss.fffZ, ok to truncate minor parts. Examples 2017-10-23T17:53:44.502Z or 2017-10-23',
              propertyOrder: 600
            },
            invalidBefore: {
              type: 'string',
              format: 'datetime',
              description: 'use format yyyy-mm-ddThh:mm:ss.fffZ, ok to truncate minor parts. Examples 2017-10-23T17:53:44.502Z or 2017-10-23',
              propertyOrder: 700
            },
            state: {
              type: 'string',
              enum: ['new', 'sending', 'sent', 'read', 'error', 'deleted'],
              propertyOrder: 800
            },
            created: {
              type: 'string',
              options: {
                hidden: true
              }
            },
            updated: {
              type: 'string',
              options: {
                hidden: true
              }
            },
            httpHost: {
              type: 'string',
              options: {
                hidden: true
              }
            },
            message: {
              description: 'sub-fields depend on channel',
              propertyOrder: 900,
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
@import '~sceditor/minified/themes/default.min.css';
.datatable__expand-content:not(.v-leave-active) {
  height: auto!important;
}

#nb-notification-editor {
  @import '~bootstrap/less/bootstrap.less';
  select {
    -webkit-appearance: menulist-button;
  }
  .sceditor-container {
    * {
      box-sizing: content-box;
    }
    @import (less) '~sceditor/minified/jquery.sceditor.default.min.css';
  }
}
</style>
