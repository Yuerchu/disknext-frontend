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
const scrollContainer = ref<HTMLElement | null>(null)
const pageInput = ref('')
const editingPage = ref(false)

// Generate array [1, 2, ..., pages]
const pageList = computed(() => {
  const total = pages.value ?? 0
  return Array.from({ length: total }, (_, i) => i + 1)
})

// Page refs for IntersectionObserver
const pageRefs = new Map<number, Element>()

function setPageRef(page: number, el: unknown) {
  if (el && (el as { $el?: Element }).$el) {
    pageRefs.set(page, (el as { $el: Element }).$el)
  } else if (el instanceof Element) {
    pageRefs.set(page, el)
  } else {
    pageRefs.delete(page)
  }
}

// Track visible page via IntersectionObserver
let observer: IntersectionObserver | null = null

function setupObserver() {
  if (!scrollContainer.value) return
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      let maxRatio = 0
      let bestPage = currentPage.value
      for (const entry of entries) {
        if (entry.intersectionRatio > maxRatio) {
          maxRatio = entry.intersectionRatio
          const pageNum = Number(entry.target.getAttribute('data-page'))
          if (pageNum) bestPage = pageNum
        }
      }
      if (maxRatio > 0) currentPage.value = bestPage
    },
    {
      root: scrollContainer.value,
      threshold: [0, 0.25, 0.5, 0.75, 1],
    },
  )
  for (const [, el] of pageRefs) {
    observer.observe(el)
  }
}

// Jump to page on input
function startPageEdit() {
  pageInput.value = String(currentPage.value)
  editingPage.value = true
}

function confirmPageJump() {
  editingPage.value = false
  const page = parseInt(pageInput.value, 10)
  if (!page || page < 1 || page > (pages.value ?? 1)) return
  const el = pageRefs.get(page)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 3)
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.25)
}

// Setup observer once pages are rendered
watch(pageList, () => {
  nextTick(() => setupObserver())
})

onBeforeUnmount(() => {
  observer?.disconnect()
  pageRefs.clear()
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-center gap-2 px-3 py-2 border-b border-default shrink-0">
      <button
        v-if="!editingPage"
        class="text-xs text-muted tabular-nums hover:text-default cursor-pointer px-1"
        :title="t('viewer.goToPage')"
        @click="startPageEdit"
      >
        {{ t('viewer.pageOf', { current: currentPage, total: pages ?? '?' }) }}
      </button>
      <input
        v-else
        v-model="pageInput"
        type="number"
        class="w-12 text-xs text-center border border-default rounded px-1 py-0.5 tabular-nums bg-default"
        :min="1"
        :max="pages ?? 1"
        autofocus
        @keydown.enter="confirmPageJump"
        @blur="confirmPageJump"
      >
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

    <!-- PDF content: continuous scroll -->
    <div
      ref="scrollContainer"
      class="flex-1 overflow-auto p-4 bg-muted/20"
    >
      <div class="flex flex-col items-center gap-4">
        <div
          v-for="page in pageList"
          :key="page"
          :ref="(el: unknown) => setPageRef(page, el)"
          :data-page="page"
        >
          <VuePDF
            :pdf="pdf"
            :page="page"
            :scale="scale"
          />
        </div>
      </div>
    </div>
  </div>
</template>
