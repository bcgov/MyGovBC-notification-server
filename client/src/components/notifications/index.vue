<template>
  <div>
    <h6>Notifications</h6>
    <v-data-table :headers="headers" :items="notifications.items" class="elevation-1" :pagination.sync="pagination" :total-items="notifications.totalCount" :loading="loading">
      <template slot="items" slot-scope="props">
        <td>{{ props.item.serviceName }}</td>
        <td>{{ props.item.channel }}</td>
        <td>{{ props.item.state }}</td>
        <td>{{ props.item.isBroadcast }}</td>
        <td class='text-xs-right'>{{ props.item.updated }}</td>
        <td>
          <v-btn @click="editItem(props)" flat icon color="indigo">
            <v-icon>create</v-icon>
          </v-btn>
        </td>
      </template>
      <template slot="expand" slot-scope="props">
        <notification-editor class='ma-2' @submit="closeEditPanel(props)" @cancel="closeEditPanel(props)" :item='props.item' />
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
                  <notification-editor class='ma-2' @submit="closeNewPanel" @cancel="closeNewPanel" />
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
export default {
  components: {
    'notification-editor': NotificationEditor
  },
  computed: {...mapState(['notifications']),
  },
  created: async function() {
    await this.fetchNotifications()
    await this.fetchNotificationCount()
    this.loading = false
  },
  methods: {
    ...mapActions(['fetchNotifications', 'fetchNotificationCount']),
    editItem: function(props) {
      props.expanded = !props.expanded
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
        this.loading = true
        let filter = {}
        if (this.pagination.rowsPerPage > 0) {
          filter.limit = this.pagination.rowsPerPage
          filter.skip = this.pagination.rowsPerPage * (this.pagination.page - 1)
        }
        if (this.pagination.sortBy) {
          filter.order = this.pagination.sortBy + ' ' + (this.pagination.descending ? 'DESC' : 'ASC')
        }
        await this.fetchNotifications(filter)
        await this.fetchNotificationCount()
        this.loading = false
        return
      },
      deep: true
    }
  },
  data: function() {
    return {
      newPanelExpanded: false,
      pagination: {},
      loading: true,
      headers: [{
        text: 'Service Name',
        align: 'left',
        value: 'serviceName'
      }, {
        text: 'Channel',
        align: 'left',
        value: 'channel'
      }, {
        text: 'State',
        align: 'left',
        value: 'state'
      }, {
        text: 'Is Broadcast',
        align: 'left',
        value: 'isBroadcast'
      }, {
        text: 'updated',
        align: 'right',
        value: 'updated'
      }, {
        text: 'Actions',
        align: 'left',
        sortable: false
      }]
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
