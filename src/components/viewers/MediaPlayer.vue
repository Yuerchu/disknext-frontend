<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

const props = defineProps<{
  fileUrl: string
  kind: 'audio' | 'video'
}>()

const mediaRef = ref<HTMLAudioElement | HTMLVideoElement | null>(null)
const loading = ref(true)
let player: Plyr | null = null

const controls = computed(() => {
  if (props.kind === 'video') {
    return ['play-large', 'play', 'progress', 'current-time', 'duration', 'mute', 'volume', 'fullscreen']
  }
  return ['play', 'progress', 'current-time', 'duration', 'mute', 'volume']
})

function onLoaded() {
  loading.value = false
}

onMounted(() => {
  const element = mediaRef.value
  if (!element) return

  loading.value = true
  player = new Plyr(element, { controls: controls.value })

  const media = element as HTMLMediaElement
  media.addEventListener('loadeddata', onLoaded)
  media.addEventListener('loadedmetadata', onLoaded)
  media.addEventListener('error', onLoaded)
  if (media.readyState >= 2) onLoaded()
})

onBeforeUnmount(() => {
  const element = mediaRef.value
  if (element) {
    const media = element as HTMLMediaElement
    media.removeEventListener('loadeddata', onLoaded)
    media.removeEventListener('loadedmetadata', onLoaded)
    media.removeEventListener('error', onLoaded)
  }
  player?.destroy()
  player = null
})
</script>

<template>
  <div class="relative w-full h-full">
    <div
      v-if="loading"
      class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-transparent"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <video
      v-if="kind === 'video'"
      ref="mediaRef as HTMLVideoElement | null"
      class="max-h-full max-w-full"
    >
      <source :src="props.fileUrl">
    </video>
    <audio
      v-else
      ref="mediaRef as HTMLAudioElement | null"
      class="w-full"
    >
      <source :src="props.fileUrl">
    </audio>
  </div>
</template>
