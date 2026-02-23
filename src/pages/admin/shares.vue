<script setup lang="ts">
import { h, ref, computed, onMounted, watch, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { AxiosError } from 'axios'
import api from '../../utils/api'

type ApiErrorResponse = { detail?: string }

const UBadge = resolveComponent('UBadge')
const UTooltip = resolveComponent('UTooltip')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { t, locale } = useI18n()
const toast = useToast()

interface AdminShareItem {
  id: string
  code: string
  views: number
  downloads: number
  remain_downloads: number | null
  expires: string | null
  preview_enabled: boolean
  score: number
  user_id: string
  created_at: string
  username: string | null
  object_name: string | null
}

interface AdminShareListResponse {
  count: number
  items: AdminShareItem[]
}

interface AdminShareDetail {
  id: string
  code: string
  views: number
  downloads: number
  remain_downloads: number | null
  expires: string | null
  preview_enabled: boolean
  score: number
  has_password: boolean
  user_id: string
  username: string | null
  object: Record<string, unknown>
  created_at: string
}

// List state
const shares = ref<AdminShareItem[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 20
const orderBy = ref('created_at')
const orderDesc = ref(true)

const orderOptions = [
  { label: t('adminShare.orderCreatedAt'), value: 'created_at' },
  { label: t('adminShare.orderUpdatedAt'), value: 'updated_at' }
]

// Delete modal
const deleteModalOpen = ref(false)
const deletingShare = ref<AdminShareItem | null>(null)
const deleting = ref(false)

// Detail modal
const detailModalOpen = ref(false)
const detailLoading = ref(false)
const shareDetail = ref<AdminShareDetail | null>(null)

function formatDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function fetchShares() {
  loading.value = true
  try {
    const { data } = await api.get<AdminShareListResponse>('/api/v1/admin/share/list', {
      params: {
        offset: (page.value - 1) * pageSize,
        limit: pageSize,
        order: orderBy.value,
        desc: orderDesc.value
      }
    })
    shares.value = data.items
    total.value = data.count
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminShare.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(page, () => fetchShares())
watch([orderBy, orderDesc], () => {
  page.value = 1
  fetchShares()
})

onMounted(() => {
  fetchShares()
})

function copyLink(item: AdminShareItem) {
  const link = `${window.location.origin}/s/${item.code}`
  navigator.clipboard.writeText(link)
  toast.add({ title: t('adminShare.copied'), icon: 'i-lucide-check-circle', color: 'success' })
}

function openDeleteModal(item: AdminShareItem) {
  deletingShare.value = item
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingShare.value) return
  deleting.value = true
  try {
    await api.delete(`/api/v1/admin/share/${deletingShare.value.id}`)
    toast.add({ title: t('adminShare.deleteSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    deleteModalOpen.value = false
    fetchShares()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminShare.deleteFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

async function openDetailModal(item: AdminShareItem) {
  shareDetail.value = null
  detailModalOpen.value = true
  detailLoading.value = true
  try {
    const { data } = await api.get<AdminShareDetail>(`/api/v1/admin/share/${item.id}`)
    shareDetail.value = data
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminShare.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
    detailModalOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

function getDropdownItems(item: AdminShareItem): DropdownMenuItem[][] {
  return [
    [
      {
        label: t('adminShare.copyLink'),
        icon: 'i-lucide-copy',
        onSelect() { copyLink(item) }
      },
      {
        label: t('adminShare.viewDetail'),
        icon: 'i-lucide-eye',
        onSelect() { openDetailModal(item) }
      }
    ],
    [
      {
        label: t('adminShare.deleteShare'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect() { openDeleteModal(item) }
      }
    ]
  ]
}

const columns = computed<TableColumn<AdminShareItem>[]>(() => [
  {
    accessorKey: 'object_name',
    header: t('adminShare.objectName'),
    cell: ({ row }) => {
      const name = row.original.object_name || '-'
      return h(UTooltip, { text: name }, {
        default: () => h('span', { class: 'truncate max-w-48 inline-block align-bottom' }, name)
      })
    }
  },
  {
    accessorKey: 'username',
    header: t('adminShare.username'),
    cell: ({ row }) => row.original.username || '-'
  },
  {
    accessorKey: 'views',
    header: t('adminShare.viewsDownloads'),
    cell: ({ row }) => `${row.original.views} / ${row.original.downloads}`,
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'remain_downloads',
    header: t('adminShare.downloadLimit'),
    cell: ({ row }) => row.original.remain_downloads != null
      ? String(row.original.remain_downloads)
      : t('adminShare.unlimited'),
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'preview_enabled',
    header: t('adminShare.preview'),
    cell: ({ row }) => h(UBadge, {
      label: row.original.preview_enabled ? t('adminShare.previewOn') : t('adminShare.previewOff'),
      color: row.original.preview_enabled ? 'success' : 'neutral',
      variant: 'subtle',
      size: 'md'
    })
  },
  {
    accessorKey: 'expires',
    header: t('adminShare.expires'),
    cell: ({ row }) => row.original.expires
      ? formatDate(row.original.expires)
      : t('adminShare.neverExpire'),
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'created_at',
    header: t('adminShare.createdAt'),
    cell: ({ row }) => formatDate(row.original.created_at),
    meta: { class: { td: 'text-muted' } }
  },
  {
    id: 'actions',
    header: t('adminShare.actions'),
    cell: ({ row }) => {
      return h(UDropdownMenu, {
        items: getDropdownItems(row.original),
        content: { align: 'end' }
      }, {
        default: () => h(resolveComponent('UButton'), {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs'
        })
      })
    }
  }
])
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        {{ t('adminShare.title') }}
      </h1>
      <div class="flex items-center gap-2">
        <USelect
          v-model="orderBy"
          :items="orderOptions"
          class="w-32"
        />
        <UButton
          :icon="orderDesc ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-narrow-wide'"
          color="neutral"
          variant="ghost"
          @click="orderDesc = !orderDesc"
        />
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          @click="fetchShares"
        />
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <!-- Empty -->
    <div
      v-else-if="shares.length === 0"
      class="text-center py-12 text-muted"
    >
      <UIcon
        name="i-lucide-share-2"
        class="size-12 mx-auto mb-4 opacity-50"
      />
      <p>{{ t('adminShare.empty') }}</p>
    </div>

    <!-- Table + Pagination -->
    <template v-else>
      <UTable
        :data="shares"
        :columns="columns"
      />

      <div
        v-if="total > pageSize"
        class="flex justify-center"
      >
        <UPagination
          v-model:page="page"
          :total="total"
          :items-per-page="pageSize"
          show-edges
        />
      </div>
    </template>
  </div>

  <!-- Detail Modal -->
  <UModal
    v-model:open="detailModalOpen"
    :title="t('adminShare.detailTitle')"
    description=" "
    :ui="{ footer: 'justify-end', content: 'sm:max-w-lg', description: 'hidden' }"
  >
    <template #body>
      <div
        v-if="detailLoading"
        class="flex justify-center py-8"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-6 animate-spin text-muted"
        />
      </div>
      <div
        v-else-if="shareDetail"
        class="space-y-3 text-sm"
      >
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminShare.code') }}</span>
          <span class="font-mono">{{ shareDetail.code }}</span>
        </div>
        <USeparator />
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminShare.username') }}</span>
          <span>{{ shareDetail.username || '-' }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminShare.hasPassword') }}</span>
          <span>{{ shareDetail.has_password ? t('adminShare.yes') : t('adminShare.no') }}</span>
        </div>
        <USeparator />
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminShare.viewsDownloads') }}</span>
          <span>{{ shareDetail.views }} / {{ shareDetail.downloads }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminShare.downloadLimit') }}</span>
          <span>{{ shareDetail.remain_downloads != null ? shareDetail.remain_downloads : t('adminShare.unlimited') }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminShare.preview') }}</span>
          <UBadge
            :label="shareDetail.preview_enabled ? t('adminShare.previewOn') : t('adminShare.previewOff')"
            :color="shareDetail.preview_enabled ? 'success' : 'neutral'"
            variant="subtle"
            size="md"
          />
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminShare.score') }}</span>
          <span>{{ shareDetail.score }}</span>
        </div>
        <USeparator />
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminShare.expires') }}</span>
          <span>{{ shareDetail.expires ? formatDate(shareDetail.expires) : t('adminShare.neverExpire') }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminShare.createdAt') }}</span>
          <span>{{ formatDate(shareDetail.created_at) }}</span>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="detailModalOpen = false"
      />
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="deleteModalOpen"
    :title="t('adminShare.deleteShare')"
    description=" "
    :ui="{ footer: 'justify-end', description: 'hidden' }"
  >
    <template #body>
      <p class="text-sm">
        {{ t('adminShare.deleteConfirm', { name: deletingShare?.object_name || deletingShare?.code }) }}
      </p>
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="deleteModalOpen = false"
      />
      <UButton
        :label="t('common.delete')"
        color="error"
        :loading="deleting"
        @click="confirmDelete"
      />
    </template>
  </UModal>
</template>
