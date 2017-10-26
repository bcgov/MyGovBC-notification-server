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
      totalCount: undefined,
      search: undefined
    }
  },
  mutations: {
    setLocalNotifications(state, items) {
      state.notifications.items = items
    },
    setTotalNotificationCount(state, cnt) {
      state.notifications.totalCount = cnt
    },
    setNotificationsFilter(state, filter) {
      state.notifications.filter = filter
    },
    setNotificationsSearch(state, value) {
      state.notifications.search = value
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
    },
    async fetchNotifications({ commit, state }, filter) {
      if (filter) {
        filter = Object.assign({}, state.notifications.filter, filter)
      }
      commit('setNotificationsFilter', filter)
      let url = ApiUrlPrefix + '/notifications'
      if (filter) {
        url += '?filter=' + encodeURIComponent(JSON.stringify(filter))
      }
      let items = await axios.get(url)
      commit('setLocalNotifications', items.data)
      url = ApiUrlPrefix + '/notifications/count'
      if (filter && filter.where) {
        url += '?where=' + encodeURIComponent(JSON.stringify(filter.where))
      }
      let response = await axios.get(url)
      commit('setTotalNotificationCount', response.data.count)
    }
  },
  strict: process.env.NODE_ENV !== 'production'
})
