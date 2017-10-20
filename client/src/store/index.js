import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'

Vue.use(Vuex)

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
      await axios.get('https://www.google.ca')
      commit('setCurrentlyEditedNotification', item)
      return
    }
  },
  strict: process.env.NODE_ENV !== 'production'
})
