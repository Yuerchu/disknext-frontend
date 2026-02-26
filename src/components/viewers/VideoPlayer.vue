<script setup lang="ts">
import MediaPlayer from './MediaPlayer.vue'

const props = defineProps<{
  fileUrl: string
  fileName: string
  fileSize: number
}>()
</script>

<template>
  <MediaPlayer
    :file-url="props.fileUrl"
    kind="video"
  />
</template>
