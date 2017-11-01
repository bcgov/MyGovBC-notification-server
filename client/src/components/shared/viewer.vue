<template>
  <pre>{{JSON.stringify(item, null, 2)}}</pre>
</template>

<script>
export default {
  props: ['item']
}
</script>
