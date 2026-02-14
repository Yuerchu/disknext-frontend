<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { APP_KEY_COMPONENT, resolveIcon, useFileOpen } from '../../composables/useFileOpen'

const { t } = useI18n()
const { viewerOpen, viewerState, closeViewer } = useFileOpen()

const isDirty = ref(false)
const isSaving = ref(false)
const showUnsavedConfirm = ref(false)

const viewerComponents: Record<string, () => Promise<{ default: Component }>> = {
  ImageViewer: () => import('./ImageViewer.vue'),
  VideoPlayer: () => import('./VideoPlayer.vue'),
  AudioPlayer: () => import('./AudioPlayer.vue'),
  PdfViewer: () => import('./PdfViewer.vue'),
  CodeEditor: () => import('./CodeEditor.vue'),
  MarkdownViewer: () => import('./MarkdownViewer.vue'),
}

const IframeViewer = defineAsyncComponent(() => import('./IframeViewer.vue'))
const WopiViewer = defineAsyncComponent(() => import('./WopiViewer.vue'))

const activeComponent = computed(() => {
  const state = viewerState.value
  if (!state || state.loading || state.error) return null

  if (state.viewer.type === 'builtin') {
    const compName = APP_KEY_COMPONENT[state.viewer.app_key]
    if (compName && viewerComponents[compName]) {
      return defineAsyncComponent(viewerComponents[compName])
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
      <template v-else-if="viewerState?.viewer.type === 'builtin' && activeComponent">
        <component
          :is="activeComponent"
          :file-url="viewerState.contentUrl ?? undefined"
          :content="viewerState.textContent ?? undefined"
          :file-name="viewerState.fileName"
          :file-size="viewerState.fileSize"
          :file-id="viewerState.fileId"
          @dirty="onDirty"
          @saving="onSaving"
        />
      </template>

      <!-- Iframe viewer -->
      <IframeViewer
        v-else-if="viewerState?.viewer.type === 'iframe' && viewerState.contentUrl"
        :src="viewerState.contentUrl"
      />

      <!-- WOPI viewer -->
      <WopiViewer
        v-else-if="viewerState?.viewer.type === 'wopi' && viewerState.contentUrl"
        :src="viewerState.contentUrl"
      />
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
