<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { VuePDF, usePDF } from '@tato30/vue-pdf'

const props = defineProps<{
  fileUrl: string
  fileName: string
  fileSize: number
}>()

const { t } = useI18n()

const { pdf, pages } = usePDF({
  url: props.fileUrl,
  wasmUrl: '/pdfjs-wasm/',
})
const currentPage = ref(1)
const scale = ref(1)

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}

function nextPage() {
  if (currentPage.value < (pages.value ?? 1)) currentPage.value++
}

function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 3)
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.25)
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-center gap-2 px-3 py-2 border-b border-default shrink-0">
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="currentPage <= 1"
        @click="prevPage"
      />
      <span class="text-xs text-muted tabular-nums">
        {{ t('viewer.pageOf', { current: currentPage, total: pages ?? '?' }) }}
      </span>
      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="currentPage >= (pages ?? 1)"
        @click="nextPage"
      />
      <USeparator
        orientation="vertical"
        class="h-5 mx-1"
      />
      <UButton
        icon="i-lucide-zoom-out"
        :aria-label="t('viewer.zoomOut')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="zoomOut"
      />
      <span class="text-xs text-muted tabular-nums">{{ Math.round(scale * 100) }}%</span>
      <UButton
        icon="i-lucide-zoom-in"
        :aria-label="t('viewer.zoomIn')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="zoomIn"
      />
    </div>

    <!-- PDF content -->
    <div class="flex-1 overflow-auto flex justify-center p-4 bg-muted/20">
      <VuePDF
        :pdf="pdf"
        :page="currentPage"
        :scale="scale"
      />
    </div>
  </div>
</template>
