<script setup lang="ts">
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

const props = defineProps<{
  fileUrl: string
  fileName: string
  fileSize: number
}>()

const audioRef = ref<HTMLAudioElement | null>(null)
let player: Plyr | null = null

onMounted(() => {
  if (audioRef.value) {
    player = new Plyr(audioRef.value, {
      controls: ['play', 'progress', 'current-time', 'duration', 'mute', 'volume'],
    })
  }
})

onBeforeUnmount(() => {
  player?.destroy()
  player = null
})
</script>

<template>
  <div class="flex flex-col items-center justify-center h-full gap-6 p-8">
    <UIcon
      name="i-lucide-music"
      class="size-24 text-muted"
    />
    <p class="text-sm font-medium truncate max-w-md">
      {{ props.fileName }}
    </p>
    <div class="w-full max-w-lg">
      <audio ref="audioRef">
        <source :src="props.fileUrl">
      </audio>
    </div>
  </div>
</template>
