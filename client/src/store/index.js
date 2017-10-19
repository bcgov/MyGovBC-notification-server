import Vue from 'vue'
import Vuex from 'vuex'

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
    setCurrentlyEditedNotification({ commit }, item) {
      return new Promise((resolve, reject) => {
        commit('setCurrentlyEditedNotification', item)
        resolve()
      })
    }
  },
  strict: process.env.NODE_ENV !== 'production'
})
