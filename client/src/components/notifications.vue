<template>
  <combo-table store-state='notifications' :headers='headers' :schema='schema' storeActionName='setNotification' storeSearchMutationName='setNotificationsSearch' storeFetchItemsActionName='fetchNotifications' />
</template>

<script>
import {
  mapState,
  mapActions
} from 'vuex'
import ComboTable from './shared/combo-table'
export default {
  components: {
    ComboTable
  },
  data: function() {
    return {
      headers: [{
        text: 'serviceName',
        align: 'left',
        value: 'serviceName'
      }, {
        text: 'channel',
        align: 'left',
        value: 'channel'
      }, {
        text: 'state',
        align: 'left',
        value: 'state'
      }, {
        text: 'isBroadcast',
        align: 'left',
        value: 'isBroadcast'
      }, {
        text: 'updated',
        align: 'right',
        value: 'updated'
      }, {
        text: 'actions',
        align: 'left',
        sortable: false
      }],
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
            default: 'false',
            propertyOrder: 500
          },
          asyncBroadcastPushNotification: {
            type: 'string',
            enum: [true, false],
            propertyOrder: 550,
            description: 'set to true to avoid long processing time when sending broadcast notification to many subscribers'
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
                  // todo: fix https://github.com/jdorn/json-editor/issues/651
                  // options: {
                  //   wysiwyg: true
                  // }
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
    }
  }
}
</script>
