<template>
  <div>
    <iframe id='api-explorer' src='http://localhost:3000/explorer/' />
  </div>
</template>

<script>
import iFrameResize from 'iframe-resizer'
export default {
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
