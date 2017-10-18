<template>
  <v-app id="inspire">
    <v-navigation-drawer persistent v-model="drawer" enable-resize-watcher app>
      <v-list dense>
        <v-list-tile href="/">
          <v-list-tile-action>
            <v-icon>home</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>Home</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile href="/subscriptions/">
          <v-list-tile-action>
            <v-icon>list</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>Subscriptions</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile href="/notifications/">
          <v-list-tile-action>
            <v-icon>email</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>Notifications</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile href="/configurations/">
          <v-list-tile-action>
            <v-icon>settings_applications</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>Configurations</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile href="/administrators/">
          <v-list-tile-action>
            <v-icon>security</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>Administrators</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
        <v-list-tile href="/api-explorer/">
          <v-list-tile-action>
            <v-icon>code</v-icon>
          </v-list-tile-action>
          <v-list-tile-content>
            <v-list-tile-title>API Explorer</v-list-tile-title>
          </v-list-tile-content>
        </v-list-tile>
      </v-list>
    </v-navigation-drawer>
    <v-toolbar color="indigo" dark app>
      <v-toolbar-side-icon @click.stop="drawer = !drawer"></v-toolbar-side-icon>
      <v-toolbar-title>NotifyBC Web Console - {{ this.$router.currentRoute.name }}</v-toolbar-title>
    </v-toolbar>
    <main>
      <v-content>
        <v-container fluid>
          <router-view></router-view>
        </v-container>
      </v-content>
    </main>
    <v-footer color="indigo" app>
      <span class="white--text">&copy; 2017-present under the terms of <a href='https://github.com/bcgov/MyGovBC-notification-server/blob/master/LICENSE' target='_'>Apache License, Version 2.0</a></span>
    </v-footer>
  </v-app>
</template>

<script>
export default {
  name: 'app',
  data: () => ({
    drawer: true
  }),
  props: {
    source: String
  }
}
</script>

<style scoped lang='less'>
.white--text a {
  color: white !important
}
</style>
