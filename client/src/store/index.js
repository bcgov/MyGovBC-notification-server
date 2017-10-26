import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'

Vue.use(Vuex)

const ApiUrlPrefix = 'http://localhost:3000/api'
export default new Vuex.Store({
  state: {
    notifications: {
      items: [],
      filter: undefined,
      totalCount: undefined
    }
  },
  mutations: {
    setLocalNotifications(state, items) {
      state.notifications.items = items
    },
    setTotalNotificationCount(state, cnt) {
      state.notifications.totalCount = cnt
    },
    setNotificationsFilter(state, filter){
      state.notifications.filter = filter
    }
  },
  actions: {
    async setNotification({ commit, dispatch }, item) {
      let id,
        method = 'post'
      if (item.id) {
        id = item.id
        method = 'patch'
        delete item.id
        delete item.updated
        delete item.created
      }
      await axios({
        method: method,
        url: ApiUrlPrefix + '/notifications' + (id ? '/' + id : ''),
        data: item
      })
      await dispatch('fetchNotifications')
      await dispatch('fetchNotificationCount')
    },
    async fetchNotifications({ commit }, filter) {
      commit('setNotificationsFilter', filter)
      let url = ApiUrlPrefix + '/notifications'
      if (filter) {
        url += '?filter=' + encodeURIComponent(JSON.stringify(filter))
      }
      let items = await axios.get(url)
      commit('setLocalNotifications', items.data)
      return items.data
    },
    async fetchNotificationCount({ commit , state}) {
      let url = ApiUrlPrefix + '/notifications/count'
      if (state.notifications.filter && state.notifications.filter.where) {
        url += '?where=' + encodeURIComponent(JSON.stringify(state.notifications.filter.where))
      }
      let response = await axios.get(url)
      commit('setTotalNotificationCount', response.data.count)
      return response.data.count
    }
  },
  strict: process.env.NODE_ENV !== 'production'
})
