<script setup lang="ts">
import MediaPlayer from './MediaPlayer.vue'

const props = defineProps<{
  fileUrl: string
  fileName: string
  fileSize: number
}>()
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
      <MediaPlayer
        :file-url="props.fileUrl"
        kind="audio"
      />
    </div>
  </div>
</template>
