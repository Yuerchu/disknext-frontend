<script setup lang="ts">
import { computed, defineAsyncComponent, markRaw } from 'vue'
import { useI18n } from 'vue-i18n'
import { APP_KEY_COMPONENT, resolveIcon, useFileOpen } from '../../composables/useFileOpen'

type ViewerComponents = Record<string, ReturnType<typeof defineAsyncComponent>>

const { t } = useI18n()
const { viewerOpen, viewerState, closeViewer, navigateFile, hasPrevFile, hasNextFile } = useFileOpen()

const isDirty = ref(false)
const isSaving = ref(false)
const showUnsavedConfirm = ref(false)

const viewerComponents: ViewerComponents = markRaw({
  ImageViewer: defineAsyncComponent({
    loader: () => import('./ImageViewer.vue'),
    delay: 120,
    timeout: 30000,
  }),
  VideoPlayer: defineAsyncComponent({
    loader: () => import('./VideoPlayer.vue'),
    delay: 120,
    timeout: 30000,
  }),
  AudioPlayer: defineAsyncComponent({
    loader: () => import('./AudioPlayer.vue'),
    delay: 120,
    timeout: 30000,
  }),
  PdfViewer: defineAsyncComponent({
    loader: () => import('./PdfViewer.vue'),
    delay: 120,
    timeout: 30000,
  }),
  CodeEditor: defineAsyncComponent({
    loader: () => import('./CodeEditor.vue'),
    delay: 120,
    timeout: 30000,
  }),
  MarkdownViewer: defineAsyncComponent({
    loader: () => import('./MarkdownViewer.vue'),
    delay: 120,
    timeout: 30000,
  }),
  EpubViewer: defineAsyncComponent({
    loader: () => import('./EpubViewer.vue'),
    delay: 120,
    timeout: 30000,
  }),
  ModelViewer: defineAsyncComponent({
    loader: () => import('./ModelViewer.vue'),
    delay: 120,
    timeout: 30000,
  }),
  FontViewer: defineAsyncComponent({
    loader: () => import('./FontViewer.vue'),
    delay: 120,
    timeout: 30000,
  }),
})

const IframeViewer = markRaw(defineAsyncComponent({
  loader: () => import('./IframeViewer.vue'),
  delay: 120,
  timeout: 30000,
}))
const WopiViewer = markRaw(defineAsyncComponent({
  loader: () => import('./WopiViewer.vue'),
  delay: 120,
  timeout: 30000,
}))

const activeComponent = computed(() => {
  const state = viewerState.value
  if (!state || state.loading || state.error) return null

  if (state.viewer.type === 'builtin') {
    const compName = APP_KEY_COMPONENT[state.viewer.app_key]
    if (compName && viewerComponents[compName]) {
      return viewerComponents[compName]
    }
  }
  return null
})

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function onDirty(dirty: boolean) {
  isDirty.value = dirty
}

function onSaving(saving: boolean) {
  isSaving.value = saving
}

function handleClose() {
  if (isDirty.value) {
    showUnsavedConfirm.value = true
    return
  }
  doClose()
}

function doClose() {
  isDirty.value = false
  isSaving.value = false
  showUnsavedConfirm.value = false
  closeViewer()
}

// Reset state when viewer closes externally
watch(viewerOpen, (open) => {
  if (!open) {
    isDirty.value = false
    isSaving.value = false
  }
})
</script>

<template>
  <UModal
    :open="viewerOpen"
    fullscreen
    :dismissible="false"
    :title="viewerState?.fileName ?? ''"
    description=" "
    :close="{ onClick: handleClose }"
    :ui="{
      body: 'p-0 flex-1 overflow-hidden',
      description: 'hidden',
    }"
    @update:open="(val: boolean) => { if (!val) handleClose() }"
  >
    <template #title>
      <div class="flex items-center gap-2 min-w-0">
        <UIcon
          v-if="viewerState?.viewer"
          :name="resolveIcon(viewerState.viewer.icon)"
          class="size-5 shrink-0 text-muted"
        />
        <span class="truncate">{{ viewerState?.fileName }}</span>
        <span
          v-if="isDirty"
          class="text-base shrink-0"
          title="Unsaved changes"
        >●</span>
        <UIcon
          v-if="isSaving"
          name="i-lucide-loader-circle"
          class="size-4 shrink-0 animate-spin text-muted"
        />
        <span
          v-if="viewerState"
          class="text-xs text-muted shrink-0"
        >
          {{ formatSize(viewerState.fileSize) }}
        </span>
      </div>
    </template>

    <template #body>
      <div class="relative h-full">
        <!-- Loading -->
        <div
          v-if="viewerState?.loading"
          class="flex flex-col items-center justify-center h-full gap-3"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-8 animate-spin text-muted"
          />
          <p class="text-sm text-muted">
            {{ t('viewer.preparing') }}
          </p>
        </div>

        <!-- Error -->
        <div
          v-else-if="viewerState?.error"
          class="flex flex-col items-center justify-center h-full gap-3"
        >
          <UIcon
            name="i-lucide-circle-x"
            class="size-10 text-error"
          />
          <p class="text-sm font-medium">
            {{ t('viewer.loadError') }}
          </p>
          <p class="text-sm text-muted">
            {{ viewerState.error }}
          </p>
        </div>

        <!-- Builtin viewer -->
        <template v-if="viewerState?.viewer.type === 'builtin' && activeComponent">
          <Transition
            name="viewer-content"
            mode="out-in"
          >
            <Suspense>
              <template #default>
                <component
                  :is="activeComponent"
                  :key="`${viewerState.fileId ?? viewerState.fileName}`"
                  :file-url="viewerState.contentUrl ?? undefined"
                  :content="viewerState.textContent ?? undefined"
                  :file-name="viewerState.fileName"
                  :file-size="viewerState.fileSize"
                  :file-id="viewerState.fileId"
                  @dirty="onDirty"
                  @saving="onSaving"
                  @navigate="navigateFile"
                />
              </template>
              <template #fallback>
                <div class="flex flex-col items-center justify-center h-full gap-3 text-muted">
                  <UIcon
                    name="i-lucide-loader-circle"
                    class="size-8 animate-spin"
                  />
                  <p class="text-sm">
                    {{ t('viewer.preparing') }}
                  </p>
                </div>
              </template>
            </Suspense>
          </Transition>
        </template>

        <!-- Iframe viewer -->
        <template
          v-else-if="viewerState?.viewer.type === 'iframe' && viewerState.contentUrl"
        >
          <IframeViewer
            :key="`${viewerState.fileId}`"
            :src="viewerState.contentUrl"
          />
        </template>

        <!-- WOPI viewer -->
        <template
          v-else-if="viewerState?.viewer.type === 'wopi' && viewerState.contentUrl && viewerState.wopiAccessToken != null"
        >
          <WopiViewer
            :key="`${viewerState.fileId}`"
            :src="viewerState.contentUrl"
            :access-token="viewerState.wopiAccessToken"
            :access-token-ttl="viewerState.wopiAccessTokenTtl!"
          />
        </template>

        <!-- Navigation arrows -->
        <button
          v-if="hasPrevFile"
          class="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center size-10 rounded-full bg-default/60 hover:bg-default/90 text-default backdrop-blur-sm transition-opacity cursor-pointer"
          :aria-label="t('viewer.prevFile')"
          @click="navigateFile(-1)"
        >
          <UIcon
            name="i-lucide-chevron-left"
            class="size-6"
          />
        </button>
        <button
          v-if="hasNextFile"
          class="absolute right-2 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center size-10 rounded-full bg-default/60 hover:bg-default/90 text-default backdrop-blur-sm transition-opacity cursor-pointer"
          :aria-label="t('viewer.nextFile')"
          @click="navigateFile(1)"
        >
          <UIcon
            name="i-lucide-chevron-right"
            class="size-6"
          />
        </button>

        <!-- File index indicator -->
        <div
          v-if="viewerState && viewerState.siblingFiles.length > 1 && viewerState.currentIndex >= 0"
          class="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-default/60 backdrop-blur-sm text-xs text-default tabular-nums"
        >
          {{ t('viewer.fileIndex', { current: viewerState.currentIndex + 1, total: viewerState.siblingFiles.length }) }}
        </div>
      </div>
    </template>
  </UModal>

  <!-- Unsaved changes confirmation -->
  <UModal
    :open="showUnsavedConfirm"
    :title="t('viewer.editor.unsavedTitle')"
    :description="t('viewer.editor.unsavedChanges')"
    :close="{ onClick: () => { showUnsavedConfirm = false } }"
    @update:open="(val: boolean) => { if (!val) showUnsavedConfirm = false }"
  >
    <template #body>
      <p class="text-sm text-muted">
        {{ t('viewer.editor.unsavedChanges') }}
      </p>
    </template>
    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          color="neutral"
          variant="outline"
          @click="showUnsavedConfirm = false"
        >
          {{ t('common.cancel') }}
        </UButton>
        <UButton
          color="error"
          @click="doClose"
        >
          {{ t('viewer.editor.discard') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.viewer-content-enter-active,
.viewer-content-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.viewer-content-enter-from,
.viewer-content-leave-to {
  opacity: 0;
  transform: scale(0.99);
}
</style>
