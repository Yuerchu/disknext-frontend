<script setup lang="ts">
import * as opentype from 'opentype.js'
import type { Font } from 'opentype.js'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  fileUrl: string
  fileName: string
  fileSize: number
}>()

const { t } = useI18n()

const loading = ref(true)
const error = ref<string | null>(null)
const font = ref<Font | null>(null)
const previewText = ref('The quick brown fox jumps over the lazy dog 0123456789')
const previewSizes = [14, 20, 28, 36, 48, 64]
const fontFamilyName = ref('')

interface FontMeta { label: string; value: string }
const metaItems = ref<FontMeta[]>([])

function getNameValue(rec: Record<string, string> | undefined): string {
  if (!rec) return ''
  return rec.en || rec[Object.keys(rec)[0]] || ''
}

async function init() {
  try {
    const response = await fetch(props.fileUrl)
    const arrayBuffer = await response.arrayBuffer()

    // Register font for CSS rendering
    const uniqueName = `_preview_${Date.now()}`
    const fontFace = new FontFace(uniqueName, arrayBuffer)
    await fontFace.load()
    document.fonts.add(fontFace)
    fontFamilyName.value = uniqueName

    // Try parsing metadata with opentype.js (may fail for woff2)
    try {
      const parsed = opentype.parse(arrayBuffer)
      font.value = parsed
      const names = parsed.names
      metaItems.value = [
        { label: t('viewer.font.family'), value: getNameValue(names.fontFamily) },
        { label: t('viewer.font.subfamily'), value: getNameValue(names.fontSubfamily) },
        { label: t('viewer.font.designer'), value: getNameValue(names.designer) },
        { label: t('viewer.font.version'), value: getNameValue(names.version) },
        { label: t('viewer.font.glyphs'), value: String(parsed.numGlyphs) },
        { label: t('viewer.font.unitsPerEm'), value: String(parsed.unitsPerEm) },
      ].filter(item => item.value)
    } catch {
      // woff2 or unsupported format — skip metadata, still show preview
    }

    loading.value = false
  } catch {
    error.value = t('viewer.font.loadError')
    loading.value = false
  }
}

onMounted(init)

onBeforeUnmount(() => {
  if (fontFamilyName.value) {
    document.fonts.forEach((f) => {
      if (f.family === fontFamilyName.value) document.fonts.delete(f)
    })
  }
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center justify-center h-full"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="flex flex-col items-center justify-center h-full gap-2"
    >
      <UIcon
        name="i-lucide-circle-x"
        class="size-10 text-error"
      />
      <p class="text-sm text-muted">
        {{ error }}
      </p>
    </div>

    <!-- Content -->
    <div
      v-else
      class="flex-1 overflow-auto p-6 space-y-6"
    >
      <!-- Meta info -->
      <div
        v-if="metaItems.length"
        class="grid grid-cols-2 sm:grid-cols-3 gap-3"
      >
        <div
          v-for="item in metaItems"
          :key="item.label"
          class="space-y-1"
        >
          <p class="text-xs text-muted">
            {{ item.label }}
          </p>
          <p class="text-sm font-medium">
            {{ item.value }}
          </p>
        </div>
      </div>

      <USeparator v-if="metaItems.length" />

      <!-- Preview text input -->
      <UInput
        v-model="previewText"
        :placeholder="t('viewer.font.inputPlaceholder')"
        class="w-full"
      />

      <!-- Size previews -->
      <div class="space-y-4">
        <div
          v-for="size in previewSizes"
          :key="size"
        >
          <p class="text-xs text-muted mb-1">
            {{ size }}px
          </p>
          <p
            class="leading-normal break-words"
            :style="{ fontFamily: fontFamilyName, fontSize: `${size}px` }"
          >
            {{ previewText }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
