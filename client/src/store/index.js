import Vue from 'vue'
import Vuex from 'vuex'
import axios from 'axios'

Vue.use(Vuex)

const ApiUrlPrefix = window.ApiUrlPrefix || '/api'
export default new Vuex.Store({
  state: {
    notifications: {
      items: [],
      filter: undefined,
      totalCount: undefined,
      search: undefined
    },
    subscriptions: {
      items: [],
      filter: undefined,
      totalCount: undefined,
      search: undefined
    },
    configurations: {
      items: [],
      filter: undefined,
      totalCount: undefined,
      search: undefined
    },
    administrators: {
      items: [],
      filter: undefined,
      totalCount: undefined,
      search: undefined
    },
    bounces: {
      items: [],
      filter: undefined,
      totalCount: undefined,
      search: undefined
    }
  },
  mutations: {
    setLocalItems(state, payload) {
      state[payload.model].items = payload.items
    },
    setTotalItemCount(state, payload) {
      state[payload.model].totalCount = payload.cnt
    },
    setItemFilter(state, payload) {
      state[payload.model].filter = payload.filter
    },
    setItemSearch(state, payload) {
      state[payload.model].search = payload.value
    }
  },
  actions: {
    async setItem({ commit, dispatch }, payload) {
      let id,
        method = 'post',
        item = payload.item
      if (item.id) {
        id = item.id
        method = 'put'
        delete item.id
        delete item.updated
        delete item.created
      }
      await axios({
        method: method,
        url: ApiUrlPrefix + '/' + payload.model + (id ? '/' + id : ''),
        data: item
      })
    },
    async deleteItem(context, payload) {
      await axios({
        method: 'delete',
        url: ApiUrlPrefix + '/' + payload.model + '/' + payload.item.id
      })
    },
    async fetchItems({ commit, state }, payload) {
      let filter = payload.filter
      if (filter) {
        filter = Object.assign({}, state[payload.model].filter, filter)
      } else {
        commit('setItemSearch', { model: payload.model })
      }
      commit('setItemFilter', {
        model: payload.model,
        filter: filter
      })
      let url = ApiUrlPrefix + '/' + payload.model
      if (filter) {
        url += '?filter=' + encodeURIComponent(JSON.stringify(filter))
      }
      let items = await axios.get(url)
      commit('setLocalItems', { model: payload.model, items: items.data })
      url = ApiUrlPrefix + '/' + payload.model + '/count'
      if (filter && filter.where) {
        url += '?where=' + encodeURIComponent(JSON.stringify(filter.where))
      }
      let response = await axios.get(url)
      commit('setTotalItemCount', {
        model: payload.model,
        cnt: response.data.count
      })
    },
    async getSubscribedServiceNames() {
      let url = ApiUrlPrefix + '/subscriptions/services'
      let res = await axios.get(url)
      return res.data
    }
  },
  strict: process.env.NODE_ENV !== 'production'
})
