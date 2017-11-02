<template>
  <div>
    <iframe id='nb-api-explorer' :src='ApiExplorerUrlPrefix' />
  </div>
</template>

<script>
import iFrameResize from 'iframe-resizer'
export default {
  data: function() {
    return {
      ApiExplorerUrlPrefix: window.ApiExplorerUrlPrefix || '/explorer',
      iframes: undefined
    }
  },
  mounted: async function() {
    this.iframes = $('#nb-api-explorer').iFrameResize({
      log: false
    })
  },
  beforeDestroy: function(){
    console.log(this.iframes)
  }
}
</script>

<style scoped>
iframe {
  min-width: 100%;
  width: 1px;
  border: none;
}
</style>
