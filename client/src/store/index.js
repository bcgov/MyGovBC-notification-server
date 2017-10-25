import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'

Vue.use(Vuex)

const ApiUrlPrefix = 'http://localhost:3000/api'
export default new Vuex.Store({
  state: {
    notifications: []
  },
  mutations: {
    setLocalNotifications(state, items) {
      state.notifications = items
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
    async fetchNotifications({ commit }) {
      let items = await axios.get(ApiUrlPrefix + '/notifications')
      commit('setLocalNotifications', items.data)
    }
  },
  strict: process.env.NODE_ENV !== 'production'
})
