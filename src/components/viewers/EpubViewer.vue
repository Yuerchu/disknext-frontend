<script setup lang="ts">
import ePub from 'epubjs'
import type { Book, Rendition, NavItem } from 'epubjs'
import { useI18n } from 'vue-i18n'
import { useSwipeGesture } from '../../composables/useSwipeGesture'

const props = defineProps<{
  fileUrl: string
  fileName: string
  fileSize: number
}>()

const { t } = useI18n()

const containerRef = ref<HTMLDivElement | null>(null)
const epubAreaRef = ref<HTMLElement | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const toc = ref<NavItem[]>([])
const tocOpen = ref(false)
const fontSize = ref(100)
const atStart = ref(true)
const atEnd = ref(false)

let book: Book | null = null
let rendition: Rendition | null = null

function isDark() {
  return document.documentElement.classList.contains('dark')
}

function applyTheme() {
  if (!rendition) return
  if (isDark()) {
    rendition.themes.override('color', '#e4e4e7')
    rendition.themes.override('background', '#18181b')
  } else {
    rendition.themes.override('color', '#27272a')
    rendition.themes.override('background', '#ffffff')
  }
}

function applyFontSize() {
  rendition?.themes.fontSize(`${fontSize.value}%`)
}

async function init() {
  if (!containerRef.value) return
  try {
    const response = await fetch(props.fileUrl)
    const arrayBuffer = await response.arrayBuffer()

    book = ePub(arrayBuffer as unknown as string)
    rendition = book.renderTo(containerRef.value, {
      width: '100%',
      height: '100%',
      flow: 'paginated',
      spread: 'none',
    })

    const navigation = await book.loaded.navigation
    toc.value = navigation.toc

    rendition.on('relocated', (location: { atStart: boolean; atEnd: boolean }) => {
      atStart.value = location.atStart
      atEnd.value = location.atEnd
    })

    applyTheme()
    applyFontSize()
    await rendition.display()
    loading.value = false
  } catch {
    error.value = t('viewer.epub.loadError')
    loading.value = false
  }
}

function prevPage() { rendition?.prev() }
function nextPage() { rendition?.next() }

function goToChapter(href: string) {
  rendition?.display(href)
  tocOpen.value = false
}

function increaseFontSize() {
  fontSize.value = Math.min(fontSize.value + 10, 200)
  applyFontSize()
}

function decreaseFontSize() {
  fontSize.value = Math.max(fontSize.value - 10, 50)
  applyFontSize()
}

// Swipe gesture for page turning
useSwipeGesture(epubAreaRef, {
  threshold: 50,
  onSwipeLeft: () => nextPage(),
  onSwipeRight: () => prevPage(),
})

onMounted(() => {
  init()

  const observer = new MutationObserver(() => applyTheme())
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  onBeforeUnmount(() => observer.disconnect())
})

onBeforeUnmount(() => {
  rendition?.destroy()
  book?.destroy()
  rendition = null
  book = null
})
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Toolbar -->
    <div class="flex items-center justify-center gap-2 px-3 py-2 border-b border-default shrink-0">
      <UButton
        icon="i-lucide-list"
        :aria-label="t('viewer.epub.toc')"
        color="neutral"
        :variant="tocOpen ? 'soft' : 'ghost'"
        size="sm"
        :disabled="toc.length === 0"
        @click="tocOpen = !tocOpen"
      />
      <USeparator
        orientation="vertical"
        class="h-5 mx-1"
      />
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="atStart"
        @click="prevPage"
      />
      <UButton
        icon="i-lucide-chevron-right"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="atEnd"
        @click="nextPage"
      />
      <USeparator
        orientation="vertical"
        class="h-5 mx-1"
      />
      <UButton
        icon="i-lucide-minus"
        :aria-label="t('viewer.zoomOut')"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="fontSize <= 50"
        @click="decreaseFontSize"
      />
      <span class="text-xs text-muted tabular-nums">{{ fontSize }}%</span>
      <UButton
        icon="i-lucide-plus"
        :aria-label="t('viewer.zoomIn')"
        color="neutral"
        variant="ghost"
        size="sm"
        :disabled="fontSize >= 200"
        @click="increaseFontSize"
      />
    </div>

    <div class="flex flex-1 overflow-hidden relative">
      <!-- TOC sidebar -->
      <div
        v-if="tocOpen"
        class="w-64 shrink-0 border-r border-default overflow-y-auto p-2"
      >
        <p class="text-sm font-medium px-2 py-1 text-muted">
          {{ t('viewer.epub.toc') }}
        </p>
        <button
          v-for="item in toc"
          :key="item.id"
          class="block w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted/50 truncate"
          @click="goToChapter(item.href)"
        >
          {{ item.label.trim() }}
        </button>
      </div>

      <!-- EPUB render area -->
      <div
        ref="epubAreaRef"
        class="flex-1 overflow-hidden relative"
      >
        <div
          v-if="loading"
          class="flex items-center justify-center h-full"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-8 animate-spin text-muted"
          />
        </div>
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
        <div
          ref="containerRef"
          class="h-full"
        />
      </div>
    </div>
  </div>
</template>
