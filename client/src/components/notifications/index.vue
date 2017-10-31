<template>
  <div>
    <v-text-field append-icon="search" hint='Enter free style text for full text search or LoopBack <i>where filter</i> compatible JSON string for parametrized search, for example {"channel": "email"}.' label="Search" single-line hide-details v-model="search"></v-text-field>
    <v-data-table :headers="headers" :items="notifications.items" class="elevation-1" :pagination.sync="pagination" :total-items="notifications.totalCount" :loading="loading">
      <template slot="items" slot-scope="props">
        <td>{{ props.item.serviceName }}</td>
        <td>{{ props.item.channel }}</td>
        <td>{{ props.item.state }}</td>
        <td>{{ props.item.isBroadcast }}</td>
        <td class='text-xs-right'>{{ props.item.updated }}</td>
        <td>
          <v-btn @click="editItem(props)" v-if="props.item.state === 'new'" flat icon>
            <v-icon>create</v-icon>
          </v-btn>
          <v-btn @click="viewItem(props)" flat icon>
            <v-icon>info</v-icon>
          </v-btn>
        </td>
      </template>
      <template slot="expand" slot-scope="props">
        <component :is='currentExpanderView' class='ma-2' @submit="closeEditPanel(props)" @cancel="closeEditPanel(props)" :item='props.item' :schema='schema' storeActionName='setNotification' />
      </template>
      <template slot="footer">
        <td colspan="100%" class='pa-0'>
          <v-expansion-panel>
            <v-expansion-panel-content hide-actions v-model='newPanelExpanded'>
              <div slot="header" class='text-xs-center' color="indigo">
                <v-btn flat icon>
                  <v-icon large color="indigo">{{this.newPanelExpanded?'keyboard_arrow_up':'add'}}</v-icon>
                </v-btn>
              </div>
              <v-card>
                <v-card-text class="grey lighten-3">
                  <notification-editor class='ma-2' @submit="closeNewPanel" @cancel="closeNewPanel" :schema='schema' storeActionName='setNotification' />
                </v-card-text>
              </v-card>
            </v-expansion-panel-content>
          </v-expansion-panel>
        </td>
      </template>
    </v-data-table>
  </div>
</template>

<script>
import {
  mapState,
  mapActions
} from 'vuex'
import NotificationEditor from './editor'
import NotificationViewer from './viewer'
export default {
  components: {
    notificationEditor: NotificationEditor,
    notificationViewer: NotificationViewer
  },
  computed: {...mapState(['notifications']),
    search: {
      get() {
        return this.notifications.search
      },
      set(value) {
        this.$store.commit('setNotificationsSearch', value)
        let filter = {
          where: undefined
        }
        if (value !== '') {
          filter.where = {
            '$text': {
              search: value
            }
          }
          try {
            let searchJson = JSON.parse(value)
            if (searchJson instanceof Object) {
              filter.where = searchJson
            }
          } catch (ex) {}
          filter.skip = 0
          this.pagination.page = 1
        }
        this.fetchNotifications(filter)
      }
    }
  },
  created: async function() {
    await this.fetchNotifications()
  },
  methods: {
    fetchNotifications: async function(filter) {
      this.loading = true
      await this.$store.dispatch('fetchNotifications', filter)
      this.loading = false
    },
    editItem: function(props) {
      props.expanded = (this.currentExpanderView === 'notificationEditor') ? !props.expanded : true
      this.currentExpanderView = 'notificationEditor'
    },
    viewItem: function(props) {
      props.expanded = (this.currentExpanderView === 'notificationViewer') ? !props.expanded : true
      this.currentExpanderView = 'notificationViewer'
    },
    closeEditPanel: function(props) {
      props.expanded = false
    },
    closeNewPanel: function() {
      this.newPanelExpanded = false
    }
  },
  watch: {
    pagination: {
      async handler() {
        let filter
        if (this.pagination.rowsPerPage >= -1) {
          filter = filter || {}
          if (this.pagination.rowsPerPage > 0) {
            filter.limit = this.pagination.rowsPerPage
            filter.skip = this.pagination.rowsPerPage * (this.pagination.page - 1)
          } else {
            filter.limit = undefined
            filter.skip = 0
          }
        }
        if (this.pagination.sortBy) {
          filter = filter || {}
          filter.order = this.pagination.sortBy + ' ' + (this.pagination.descending ? 'DESC' : 'ASC')
        }
        await this.fetchNotifications(filter)
        return
      },
      deep: true
    }
  },
  data: function() {
    return {
      newPanelExpanded: false,
      currentExpanderView: 'notificationEditor',
      pagination: {},
      loading: true,
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
<style lang='less' scoped>
.table__overflow {
  overflow-x: visible;
  overflow-y: visible;
}
</style>
