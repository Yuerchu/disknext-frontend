<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAsyncAction } from '../composables/useAsyncAction'
import { getFileIcon } from '../composables/useFileOpen'
import api from '../utils/api'
import { getApiErrorMessage } from '../utils/apiErrors'
import type { AxiosError } from 'axios'

interface FileObject {
  id: string
  name: string
  type: 'file' | 'folder'
  size: number
  thumb: boolean
  created_at: string
  updated_at: string
}

interface ObjectPropertyDetail {
  id: string
  name: string
  type: 'file' | 'folder'
  size: number
  mime_type: string | null
  created_at: string
  updated_at: string
  checksum_md5: string | null
  checksum_sha256: string | null
  share_count: number
  total_views: number
  total_downloads: number
  policy_name: string | null
  reference_count: number
  metadatas: Record<string, unknown>
}

const props = defineProps<{
  file: FileObject | null
  open: boolean
}>()

const emit = defineEmits<{
  (e: 'update:open', value: boolean): void
}>()

const { t, locale } = useI18n()
const toast = useToast()
const actions = useAsyncAction()
const detail = ref<ObjectPropertyDetail | null>(null)
const thumbError = ref(false)

watch(() => props.file?.id, async (id) => {
  detail.value = null
  thumbError.value = false
  if (!id) return
  await actions.run('fetch-detail', async () => {
    try {
      const { data } = await api.get<ObjectPropertyDetail>(`/api/v1/object/property/${id}/detail`)
      detail.value = data
    } catch (e: unknown) {
      const message = getApiErrorMessage(e as AxiosError<{ detail?: string }>, t('errors.fetchFailed'), {})
      toast.add({ title: message, color: 'error' })
    }
  })
})

function formatSize(bytes: number): string {
  if (bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}
</script>

<template>
  <Transition name="sidebar-slide">
    <div
      v-if="open && file"
      class="w-72 shrink-0 border-l border-default bg-default overflow-y-auto"
    >
      <div class="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-default border-b border-default">
        <span class="text-sm font-semibold truncate">{{ t('propertyModal.title') }}</span>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="emit('update:open', false)"
        />
      </div>

      <div class="p-4 space-y-4">
        <!-- File icon / thumbnail -->
        <div class="flex flex-col items-center gap-2">
          <img
            v-if="file.thumb && file.type === 'file' && !thumbError"
            :src="`/api/v1/file/${file.id}/thumb`"
            :alt="file.name"
            class="size-20 rounded-lg object-cover"
            @error="thumbError = true"
          >
          <UIcon
            v-else
            :name="getFileIcon(file.name, file.type === 'folder')"
            :class="file.type === 'folder' ? 'text-primary' : 'text-muted'"
            class="size-16"
          />
          <p class="text-sm font-medium text-center break-all">
            {{ file.name }}
          </p>
          <UBadge
            :label="file.type === 'file' ? t('propertyModal.typeFile') : t('propertyModal.typeFolder')"
            color="neutral"
            variant="subtle"
            size="sm"
          />
        </div>

        <USeparator />

        <!-- Loading state -->
        <div
          v-if="actions.isRunning('fetch-detail')"
          class="space-y-3"
        >
          <USkeleton
            v-for="i in 5"
            :key="i"
            class="h-4 w-full"
          />
        </div>

        <!-- Basic info -->
        <template v-else-if="detail">
          <div class="space-y-2.5">
            <div class="text-xs font-medium text-muted uppercase tracking-wide">
              {{ t('propertyModal.basicInfo') }}
            </div>
            <div
              v-if="detail.type === 'file'"
              class="flex justify-between text-sm"
            >
              <span class="text-muted">{{ t('propertyModal.size') }}</span>
              <span>{{ formatSize(detail.size) }}</span>
            </div>
            <div
              v-if="detail.mime_type"
              class="flex justify-between text-sm"
            >
              <span class="text-muted">{{ t('propertyModal.mimeType') }}</span>
              <span class="font-mono text-xs">{{ detail.mime_type }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ t('propertyModal.createdAt') }}</span>
              <span class="text-xs">{{ formatDate(detail.created_at) }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ t('propertyModal.updatedAt') }}</span>
              <span class="text-xs">{{ formatDate(detail.updated_at) }}</span>
            </div>
            <div
              v-if="detail.policy_name"
              class="flex justify-between text-sm"
            >
              <span class="text-muted">{{ t('propertyModal.policyName') }}</span>
              <span>{{ detail.policy_name }}</span>
            </div>
          </div>

          <!-- Checksums -->
          <template v-if="detail.type === 'file' && (detail.checksum_md5 || detail.checksum_sha256)">
            <USeparator />
            <div class="space-y-2.5">
              <div class="text-xs font-medium text-muted uppercase tracking-wide">
                {{ t('propertyModal.detailInfo') }}
              </div>
              <div
                v-if="detail.checksum_md5"
                class="space-y-1"
              >
                <span class="text-xs text-muted">{{ t('propertyModal.checksumMd5') }}</span>
                <p class="font-mono text-[10px] break-all text-muted">
                  {{ detail.checksum_md5 }}
                </p>
              </div>
              <div
                v-if="detail.checksum_sha256"
                class="space-y-1"
              >
                <span class="text-xs text-muted">{{ t('propertyModal.checksumSha256') }}</span>
                <p class="font-mono text-[10px] break-all text-muted">
                  {{ detail.checksum_sha256 }}
                </p>
              </div>
            </div>
          </template>

          <!-- Statistics -->
          <USeparator />
          <div class="space-y-2.5">
            <div class="text-xs font-medium text-muted uppercase tracking-wide">
              {{ t('propertyModal.statistics') }}
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ t('propertyModal.shareCount') }}</span>
              <span>{{ detail.share_count }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ t('propertyModal.totalViews') }}</span>
              <span>{{ detail.total_views }}</span>
            </div>
            <div class="flex justify-between text-sm">
              <span class="text-muted">{{ t('propertyModal.totalDownloads') }}</span>
              <span>{{ detail.total_downloads }}</span>
            </div>
          </div>

          <!-- Metadata -->
          <template v-if="detail.metadatas && Object.keys(detail.metadatas).length > 0">
            <USeparator />
            <div class="space-y-2.5">
              <div class="text-xs font-medium text-muted uppercase tracking-wide">
                {{ t('propertyModal.metadata') }}
              </div>
              <div
                v-for="(value, key) in detail.metadatas"
                :key="String(key)"
                class="flex justify-between text-sm"
              >
                <span class="text-muted">{{ key }}</span>
                <span class="text-right break-all max-w-[60%]">{{ value }}</span>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.sidebar-slide-enter-active,
.sidebar-slide-leave-active {
  transition: width 0.2s ease, opacity 0.2s ease;
  overflow: hidden;
}
.sidebar-slide-enter-from,
.sidebar-slide-leave-to {
  width: 0;
  opacity: 0;
}
</style>
