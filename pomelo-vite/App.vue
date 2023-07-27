<template>
  <div>
    {{ state.title }}
  </div>
</template>

<script>
import {reactive} from "vue";

export default {
  setup() {
    const state = reactive({
      title: '测试html'
    })
    return {
      state
    }
  }
}
</script>

<style scoped>

</style>