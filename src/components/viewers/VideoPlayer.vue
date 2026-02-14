<script setup lang="ts">
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

const props = defineProps<{
  fileUrl: string
  fileName: string
  fileSize: number
}>()

const videoRef = ref<HTMLVideoElement | null>(null)
let player: Plyr | null = null

onMounted(() => {
  if (videoRef.value) {
    player = new Plyr(videoRef.value, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen'],
    })
  }
})

onBeforeUnmount(() => {
  player?.destroy()
  player = null
})
</script>

<template>
  <div class="flex items-center justify-center h-full bg-black">
    <video
      ref="videoRef"
      class="max-h-full max-w-full"
    >
      <source :src="props.fileUrl">
    </video>
  </div>
</template>
