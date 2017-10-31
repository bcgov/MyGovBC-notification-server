<template>
  <div>
    <iframe id='api-explorer' :src='ApiExplorerUrlPrefix' />
  </div>
</template>

<script>
import iFrameResize from 'iframe-resizer'
export default {
  data: function() {
    return {
      ApiExplorerUrlPrefix: window.ApiExplorerUrlPrefix || '/explorer'
    }
  },
  mounted: async function() {
    $('#api-explorer').iFrameResize({
      log: false
    })
  },
}
</script>

<style scoped>
iframe {
  min-width: 100%;
  width: 1px;
  border: none;
}
</style>
