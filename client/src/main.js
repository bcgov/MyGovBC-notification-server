// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'
import store from './store'
import VueMaterial from 'vue-material'
import Vuetify from 'vuetify'
import 'vuetify/src/stylus/main.styl'
require('font-awesome-webpack')
require('bootstrap-webpack')

Vue.config.productionTip = false
Vue.use(VueMaterial)
Vue.use(Vuetify)

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  store,
  template: '<App/>',
  components: { App }
})
