<script setup lang="ts">
import { h, ref, computed, onMounted, watch, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { AxiosError } from 'axios'
import api from '../../utils/api'

type ApiErrorResponse = { detail?: string }

const UAvatar = resolveComponent('UAvatar')
const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UProgress = resolveComponent('UProgress')

const { t, locale } = useI18n()
const toast = useToast()

interface AdminTaskItem {
  id: number
  type: 'policy_migrate'
  status: 'queued' | 'running' | 'completed' | 'error'
  progress: number
  error: string | null
  user_id: string
  created_at: string
  updated_at: string
  username: string | null
}

interface AdminTaskListResponse {
  count: number
  items: AdminTaskItem[]
}

interface AdminTaskDetail {
  id: number
  status: 'queued' | 'running' | 'completed' | 'error'
  type: 'policy_migrate'
  progress: number
  error: string | null
  user_id: string
  username: string | null
  props: Record<string, unknown>
  created_at: string
  updated_at: string
}

// List state
const tasks = ref<AdminTaskItem[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 20
const orderBy = ref('created_at')
const orderDesc = ref(true)
const statusFilter = ref('all')

const orderOptions = [
  { label: t('adminTask.orderCreatedAt'), value: 'created_at' },
  { label: t('adminTask.orderUpdatedAt'), value: 'updated_at' }
]

const statusOptions = [
  { label: t('adminTask.filterAll'), value: 'all' },
  { label: t('adminTask.statusQueued'), value: 'queued' },
  { label: t('adminTask.statusProcessing'), value: 'running' },
  { label: t('adminTask.statusCompleted'), value: 'completed' },
  { label: t('adminTask.statusFailed'), value: 'error' }
]

// Delete modal
const deleteModalOpen = ref(false)
const deletingTask = ref<AdminTaskItem | null>(null)
const deleting = ref(false)

// Detail modal
const detailModalOpen = ref(false)
const detailLoading = ref(false)
const taskDetail = ref<AdminTaskDetail | null>(null)

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

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    queued: 'neutral',
    running: 'info',
    completed: 'success',
    error: 'error'
  }
  return map[status] || 'neutral'
}

function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    queued: t('adminTask.statusQueued'),
    running: t('adminTask.statusProcessing'),
    completed: t('adminTask.statusCompleted'),
    error: t('adminTask.statusFailed')
  }
  return map[status] || status
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    policy_migrate: t('adminTask.typePolicyMigrate')
  }
  return map[type] || type
}

async function fetchTasks() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      offset: (page.value - 1) * pageSize,
      limit: pageSize,
      order: orderBy.value,
      desc: orderDesc.value
    }
    if (statusFilter.value !== 'all') params.status = statusFilter.value
    const { data } = await api.get<AdminTaskListResponse>('/api/v1/admin/task/list', { params })
    tasks.value = data.items
    total.value = data.count
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminTask.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(page, () => fetchTasks())
watch([orderBy, orderDesc, statusFilter], () => {
  page.value = 1
  fetchTasks()
})

onMounted(() => {
  fetchTasks()
})

function openDeleteModal(item: AdminTaskItem) {
  deletingTask.value = item
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingTask.value) return
  deleting.value = true
  try {
    await api.delete(`/api/v1/admin/task/${deletingTask.value.id}`)
    toast.add({ title: t('adminTask.deleteSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    deleteModalOpen.value = false
    fetchTasks()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminTask.deleteFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

async function openDetailModal(item: AdminTaskItem) {
  taskDetail.value = null
  detailModalOpen.value = true
  detailLoading.value = true
  try {
    const { data } = await api.get<AdminTaskDetail>(`/api/v1/admin/task/${item.id}`)
    taskDetail.value = data
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminTask.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
    detailModalOpen.value = false
  } finally {
    detailLoading.value = false
  }
}

function getDropdownItems(item: AdminTaskItem): DropdownMenuItem[][] {
  return [
    [
      {
        label: t('adminTask.viewDetail'),
        icon: 'i-lucide-eye',
        onSelect() { openDetailModal(item) }
      }
    ],
    [
      {
        label: t('adminTask.deleteTask'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect() { openDeleteModal(item) }
      }
    ]
  ]
}

const columns = computed<TableColumn<AdminTaskItem>[]>(() => [
  {
    accessorKey: 'id',
    header: t('adminTask.id'),
    cell: ({ row }) => `#${row.original.id}`,
    meta: { class: { td: 'font-mono text-muted' } }
  },
  {
    accessorKey: 'type',
    header: t('adminTask.type'),
    cell: ({ row }) => h(UBadge, {
      label: getTypeLabel(row.original.type),
      color: 'neutral',
      variant: 'subtle',
      size: 'md'
    })
  },
  {
    accessorKey: 'status',
    header: t('adminTask.status'),
    cell: ({ row }) => h(UBadge, {
      label: getStatusLabel(row.original.status),
      color: getStatusColor(row.original.status),
      variant: 'subtle',
      size: 'md'
    })
  },
  {
    accessorKey: 'progress',
    header: t('adminTask.progress'),
    cell: ({ row }) => h('div', { class: 'flex items-center gap-2 min-w-24' }, [
      h(UProgress, { modelValue: row.original.progress, size: 'xs', class: 'flex-1' }),
      h('span', { class: 'text-xs text-muted w-8 text-right' }, `${row.original.progress}%`)
    ])
  },
  {
    id: 'user',
    header: t('adminTask.username'),
    cell: ({ row }) => {
      const name = row.original.username
      if (!name) return '-'
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UAvatar, { src: row.original.user_id ? `/api/v1/user/avatar/${row.original.user_id}/48` : undefined, alt: name, size: 'xs' }),
        h('span', { class: 'truncate' }, name)
      ])
    }
  },
  {
    accessorKey: 'created_at',
    header: t('adminTask.createdAt'),
    cell: ({ row }) => formatDate(row.original.created_at),
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'updated_at',
    header: t('adminTask.updatedAt'),
    cell: ({ row }) => formatDate(row.original.updated_at),
    meta: { class: { td: 'text-muted' } }
  },
  {
    id: 'actions',
    header: t('adminTask.actions'),
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
        {{ t('adminTask.title') }}
      </h1>
      <div class="flex items-center gap-2">
        <USelect
          v-model="statusFilter"
          :items="statusOptions"
          class="w-28"
        />
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
          @click="fetchTasks"
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
      v-else-if="tasks.length === 0"
      class="text-center py-12 text-muted"
    >
      <UIcon
        name="i-lucide-list-checks"
        class="size-12 mx-auto mb-4 opacity-50"
      />
      <p>{{ t('adminTask.empty') }}</p>
    </div>

    <!-- Table + Pagination -->
    <template v-else>
      <UTable
        :data="tasks"
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
    :title="t('adminTask.detailTitle')"
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
        v-else-if="taskDetail"
        class="space-y-3 text-sm"
      >
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminTask.id') }}</span>
          <span class="font-mono">#{{ taskDetail.id }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminTask.type') }}</span>
          <span>{{ taskDetail.type }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminTask.status') }}</span>
          <span>{{ taskDetail.status }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminTask.progress') }}</span>
          <span>{{ taskDetail.progress }}%</span>
        </div>
        <USeparator />
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminTask.username') }}</span>
          <span>{{ taskDetail.username || '-' }}</span>
        </div>
        <div
          v-if="taskDetail.error"
          class="space-y-1"
        >
          <span class="text-muted">{{ t('adminTask.error') }}</span>
          <p class="text-error text-xs bg-error/5 rounded p-2 break-all">
            {{ taskDetail.error }}
          </p>
        </div>
        <USeparator />
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminTask.createdAt') }}</span>
          <span>{{ formatDate(taskDetail.created_at) }}</span>
        </div>
        <div class="flex justify-between">
          <span class="text-muted">{{ t('adminTask.updatedAt') }}</span>
          <span>{{ formatDate(taskDetail.updated_at) }}</span>
        </div>
        <template v-if="taskDetail.props && Object.keys(taskDetail.props).length > 0">
          <USeparator />
          <div class="space-y-1">
            <span class="text-muted">{{ t('adminTask.props') }}</span>
            <pre class="text-xs bg-muted/10 rounded p-2 overflow-x-auto">{{ JSON.stringify(taskDetail.props, null, 2) }}</pre>
          </div>
        </template>
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
    :title="t('adminTask.deleteTask')"
    description=" "
    :ui="{ footer: 'justify-end', description: 'hidden' }"
  >
    <template #body>
      <p class="text-sm">
        {{ t('adminTask.deleteConfirm', { id: deletingTask?.id }) }}
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
