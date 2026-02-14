<script setup lang="ts">
defineProps<{
  src: string
}>()
</script>

<template>
  <iframe
    :src
    class="w-full h-full border-0"
    allow="fullscreen"
  />
</template>
