<script setup lang="ts">
defineProps<{
  content: string
  fileName: string
  fileSize: number
}>()
</script>

<template>
  <div class="h-full overflow-auto p-6">
    <div class="prose dark:prose-invert max-w-none">
      <UEditor
        :model-value="content"
        content-type="markdown"
        :editable="false"
      />
    </div>
  </div>
</template>
