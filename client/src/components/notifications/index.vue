<template>
  <div>
    <h6>Notifications</h6>
    <div id='nb-notification-editor'></div>
  </div>
</template>

<script>
import 'script-loader!json-editor'
export default {
  mounted: function() {
    let element = document.getElementById('nb-notification-editor')
    new window.JSONEditor(element, {
      theme: 'bootstrap3',
      iconlib: "fontawesome4",
      schema: {
        type: "object",
        properties: {
          name: {
            "type": "string"
          }
        }
      }
    })
  }
}
</script>

<style lang='less'>
#nb-notification-editor {
  @import '../../../node_modules/bootstrap/less/bootstrap.less';
}
</style>
