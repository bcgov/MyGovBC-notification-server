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
    setCurrentlyEditedNotification({ commit }, item) {
      return new Promise((resolve, reject) => {
        axios
          .get('https://www.google.ca')
          .then(function(response) {
            commit('setCurrentlyEditedNotification', item)
            resolve()
          })
          .catch(function(error) {
            reject(error)
          })
      })
    }
  },
  strict: process.env.NODE_ENV !== 'production'
})
