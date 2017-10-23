import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'

Vue.use(Vuex)

const ApiUrlPrefix = 'http://localhost:3000/api'
export default new Vuex.Store({
  state: {
    currentlyEditedNotification: undefined
  },
  mutations: {
    setCurrentlyEditedNotification(state, item) {
      state.currentlyEditedNotification = item
    }
  },
  actions: {
    async setCurrentlyEditedNotification({ commit }, item) {
      await axios.post(ApiUrlPrefix + '/notifications', item)
      commit('setCurrentlyEditedNotification', item)
      return
    }
  },
  strict: process.env.NODE_ENV !== 'production'
})
