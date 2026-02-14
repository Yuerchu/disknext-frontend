<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  fileUrl: string
  fileName: string
  fileSize: number
}>()

const { t } = useI18n()

const scale = ref(1)
const rotation = ref(0)
const translateX = ref(0)
const translateY = ref(0)
const dragging = ref(false)
const dragStart = ref({ x: 0, y: 0 })

const containerRef = ref<HTMLElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)

const transform = computed(() =>
  `translate(${translateX.value}px, ${translateY.value}px) scale(${scale.value}) rotate(${rotation.value}deg)`
)

function zoomIn() {
  scale.value = Math.min(scale.value * 1.25, 10)
}

function zoomOut() {
  scale.value = Math.max(scale.value / 1.25, 0.1)
}

function rotateRight() {
  rotation.value += 90
}

function resetView() {
  scale.value = 1
  rotation.value = 0
  translateX.value = 0
  translateY.value = 0
}

function fitToWindow() {
  if (!containerRef.value || !imgRef.value) return
  const container = containerRef.value.getBoundingClientRect()
  const img = imgRef.value
  if (!img.naturalWidth || !img.naturalHeight) return

  const scaleX = container.width / img.naturalWidth
  const scaleY = container.height / img.naturalHeight
  scale.value = Math.min(scaleX, scaleY, 1)
  rotation.value = 0
  translateX.value = 0
  translateY.value = 0
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (e.deltaY < 0) {
    scale.value = Math.min(scale.value * 1.1, 10)
  } else {
    scale.value = Math.max(scale.value / 1.1, 0.1)
  }
}

function onPointerDown(e: PointerEvent) {
  dragging.value = true
  dragStart.value = { x: e.clientX - translateX.value, y: e.clientY - translateY.value }
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  translateX.value = e.clientX - dragStart.value.x
  translateY.value = e.clientY - dragStart.value.y
}

function onPointerUp() {
  dragging.value = false
}

onMounted(() => {
  if (imgRef.value?.complete && imgRef.value.naturalWidth) {
    fitToWindow()
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-center gap-1 px-3 py-2 border-b border-default shrink-0">
      <UButton
        icon="i-lucide-zoom-in"
        :aria-label="t('viewer.zoomIn')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="zoomIn"
      />
      <UButton
        icon="i-lucide-zoom-out"
        :aria-label="t('viewer.zoomOut')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="zoomOut"
      />
      <UButton
        icon="i-lucide-rotate-cw"
        :aria-label="t('viewer.rotateRight')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="rotateRight"
      />
      <USeparator
        orientation="vertical"
        class="h-5 mx-1"
      />
      <UButton
        icon="i-lucide-maximize"
        :aria-label="t('viewer.fitToWindow')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="fitToWindow"
      />
      <UButton
        icon="i-lucide-scan"
        :aria-label="t('viewer.resetView')"
        color="neutral"
        variant="ghost"
        size="sm"
        @click="resetView"
      />
      <span class="ml-2 text-xs text-muted tabular-nums">{{ Math.round(scale * 100) }}%</span>
    </div>

    <!-- Image area -->
    <div
      ref="containerRef"
      class="flex-1 overflow-hidden flex items-center justify-center bg-muted/20 select-none"
      :class="{ 'cursor-grab': !dragging, 'cursor-grabbing': dragging }"
      @wheel="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
    >
      <img
        ref="imgRef"
        :src="props.fileUrl"
        :alt="props.fileName"
        class="max-w-none"
        :style="{ transform }"
        draggable="false"
        @load="fitToWindow"
      >
    </div>
  </div>
</template>
