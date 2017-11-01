<template>
  <combo-table :headers='headers' :schema='schema' model='configurations'>
    <template slot-scope='props'>
      <td>{{ props.props.item.name }}</td>
      <td>{{ props.props.item.serviceName }}</td>
      <td class='text-xs-right'>{{ props.props.item.updated }}</td>
    </template>
  </combo-table>
</template>

<script>
import ComboTable from './shared/combo-table'
export default {
  components: {
    ComboTable
  },
  data: function() {
    return {
      headers: [{
        text: 'name',
        align: 'left',
        value: 'name'
      }, {
        text: 'serviceName',
        align: 'left',
        value: 'serviceName'
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
            enum: ['email', 'sms'],
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
          state: {
            type: 'string',
            enum: ['unconfirmed', 'confirmed', 'deleted'],
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
          }
        }
      }
    }
  }
}
</script>
