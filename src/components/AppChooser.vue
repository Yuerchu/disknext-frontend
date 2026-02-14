<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { FileAppSummary } from '../types/fileApp'
import { resolveIcon, getFileExtension, useFileOpen } from '../composables/useFileOpen'

const { t } = useI18n()
const { chooserOpen, chooserFile, chooserViewers, onAppChosen } = useFileOpen()

const selectedId = ref<string | null>(null)

watch(chooserOpen, (open) => {
  if (open) selectedId.value = null
})

const ext = computed(() => {
  if (!chooserFile.value) return ''
  return getFileExtension(chooserFile.value.name)
})

function selectViewer(viewer: FileAppSummary) {
  selectedId.value = viewer.id
}

function confirm(remember: boolean) {
  if (!selectedId.value) return
  onAppChosen(selectedId.value, remember)
}
</script>

<template>
  <UModal
    v-model:open="chooserOpen"
    :title="t('appChooser.title')"
    :description="t('appChooser.description', { ext })"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-1">
        <button
          v-for="viewer in chooserViewers"
          :key="viewer.id"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors"
          :class="selectedId === viewer.id
            ? 'bg-primary/10 ring-1 ring-primary'
            : 'hover:bg-elevated/50'"
          @click="selectViewer(viewer)"
          @dblclick="onAppChosen(viewer.id, false)"
        >
          <UIcon
            :name="resolveIcon(viewer.icon)"
            class="size-5 shrink-0 text-muted"
          />
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium truncate">
              {{ viewer.name }}
            </p>
            <p
              v-if="viewer.description"
              class="text-xs text-muted truncate"
            >
              {{ viewer.description }}
            </p>
          </div>
        </button>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('appChooser.justOnce')"
        color="neutral"
        variant="outline"
        :disabled="!selectedId"
        @click="confirm(false)"
      />
      <UButton
        :label="t('appChooser.always')"
        color="primary"
        :disabled="!selectedId"
        @click="confirm(true)"
      />
    </template>
  </UModal>
</template>
