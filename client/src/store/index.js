import Vue from 'vue'
import Vuex from 'vuex'

Vue.use(Vuex)

export default new Vuex.Store({
  state: {
    notifications: []
  },
  mutations: {},
  strict: process.env.NODE_ENV !== 'production'
})
