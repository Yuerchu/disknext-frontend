<script setup lang="ts">
import { h, ref, computed, onMounted, watch, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { AxiosError } from 'axios'
import api from '../../utils/api'

type ApiErrorResponse = { detail?: string }

const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { t } = useI18n()
const toast = useToast()

interface Group {
  id: string
  name: string
  max_storage: number
  share_enabled: boolean
  web_dav_enabled: boolean
  admin: boolean
  speed_limit: number
  user_count: number
  policy_ids: string[]
  share_download: boolean
  share_free: boolean
  relocate: boolean
  source_batch: number
  select_node: boolean
  advance_delete: boolean
  archive_download: boolean
  archive_task: boolean
  webdav_proxy: boolean
  aria2: boolean
  redirected_source: boolean
}

interface GroupListResponse {
  count: number
  items: Group[]
}

// List state
const groups = ref<Group[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 20
const orderBy = ref('created_at')
const orderDesc = ref(true)

const orderOptions = [
  { label: t('group.orderCreatedAt'), value: 'created_at' },
  { label: t('group.orderUpdatedAt'), value: 'updated_at' }
]

function formatSize(bytes: number): string {
  if (bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return t('common.noLimit')
  if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
}

async function fetchGroups() {
  loading.value = true
  try {
    const { data } = await api.get<GroupListResponse>('/api/v1/admin/group/', {
      params: {
        offset: (page.value - 1) * pageSize,
        limit: pageSize,
        order: orderBy.value,
        desc: orderDesc.value
      }
    })
    groups.value = data.items
    total.value = data.count
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('group.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(page, () => fetchGroups())
watch([orderBy, orderDesc], () => {
  page.value = 1
  fetchGroups()
})

onMounted(() => fetchGroups())

// Table columns
function getDropdownItems(group: Group): DropdownMenuItem[][] {
  return [
    [
      {
        label: t('common.edit'),
        icon: 'i-lucide-pencil',
        onSelect() { openEditModal(group) }
      }
    ],
    [
      {
        label: t('common.delete'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect() { openDeleteModal(group) }
      }
    ]
  ]
}

const columns = computed<TableColumn<Group>[]>(() => [
  {
    accessorKey: 'name',
    header: t('group.name'),
    cell: ({ row }) => {
      const children = [h('span', row.original.name)]
      if (row.original.admin) {
        children.push(h(UBadge, { color: 'error', variant: 'subtle', size: 'xs', class: 'ml-2' }, () => t('user.admin')))
      }
      return h('div', { class: 'flex items-center' }, children)
    }
  },
  {
    accessorKey: 'user_count',
    header: t('group.userCount')
  },
  {
    accessorKey: 'max_storage',
    header: t('group.maxStorage'),
    cell: ({ row }) => formatSize(row.original.max_storage)
  },
  {
    accessorKey: 'speed_limit',
    header: t('group.speedLimit'),
    cell: ({ row }) => formatSpeed(row.original.speed_limit)
  },
  {
    id: 'features',
    header: t('group.features'),
    cell: ({ row }) => {
      const badges: ReturnType<typeof h>[] = []
      if (row.original.share_enabled) {
        badges.push(h(UBadge, { color: 'primary', variant: 'subtle', size: 'xs' }, () => t('group.shareEnabled')))
      }
      if (row.original.web_dav_enabled) {
        badges.push(h(UBadge, { color: 'info', variant: 'subtle', size: 'xs' }, () => t('group.webDavEnabled')))
      }
      if (row.original.aria2) {
        badges.push(h(UBadge, { color: 'warning', variant: 'subtle', size: 'xs' }, () => t('group.aria2')))
      }
      return h('div', { class: 'flex items-center gap-1 flex-wrap' }, badges)
    }
  },
  {
    id: 'actions',
    header: t('group.actions'),
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

// Create/Edit Modal
const formModalOpen = ref(false)
const editingGroup = ref<Group | null>(null)
const submitting = ref(false)

const formData = ref({
  name: '',
  max_storage: 0,
  speed_limit: 0,
  source_batch: 0,
  share_enabled: false,
  web_dav_enabled: false,
  share_download: false,
  share_free: false,
  relocate: false,
  select_node: false,
  advance_delete: false,
  archive_download: false,
  archive_task: false,
  webdav_proxy: false,
  aria2: false,
  redirected_source: false
})

const isEditing = computed(() => !!editingGroup.value)

function resetForm() {
  formData.value = {
    name: '',
    max_storage: 0,
    speed_limit: 0,
    source_batch: 0,
    share_enabled: false,
    web_dav_enabled: false,
    share_download: false,
    share_free: false,
    relocate: false,
    select_node: false,
    advance_delete: false,
    archive_download: false,
    archive_task: false,
    webdav_proxy: false,
    aria2: false,
    redirected_source: false
  }
}

function openCreateModal() {
  editingGroup.value = null
  resetForm()
  formModalOpen.value = true
}

function openEditModal(group: Group) {
  editingGroup.value = group
  formData.value = {
    name: group.name,
    max_storage: group.max_storage,
    speed_limit: group.speed_limit,
    source_batch: group.source_batch,
    share_enabled: group.share_enabled,
    web_dav_enabled: group.web_dav_enabled,
    share_download: group.share_download,
    share_free: group.share_free,
    relocate: group.relocate,
    select_node: group.select_node,
    advance_delete: group.advance_delete,
    archive_download: group.archive_download,
    archive_task: group.archive_task,
    webdav_proxy: group.webdav_proxy,
    aria2: group.aria2,
    redirected_source: group.redirected_source
  }
  formModalOpen.value = true
}

async function submitForm() {
  if (!formData.value.name.trim()) return
  submitting.value = true
  try {
    if (isEditing.value) {
      await api.patch(`/api/v1/admin/group/${editingGroup.value!.id}`, formData.value)
      toast.add({ title: t('group.updateSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    } else {
      await api.post('/api/v1/admin/group/', formData.value)
      toast.add({ title: t('group.createSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    }
    formModalOpen.value = false
    fetchGroups()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: isEditing.value ? t('group.updateFailed') : t('group.createFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

// Delete Modal
const deleteModalOpen = ref(false)
const deletingGroup = ref<Group | null>(null)
const deleting = ref(false)

function openDeleteModal(group: Group) {
  deletingGroup.value = group
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingGroup.value) return
  deleting.value = true
  try {
    await api.delete(`/api/v1/admin/group/${deletingGroup.value.id}`)
    toast.add({ title: t('group.deleteSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    deleteModalOpen.value = false
    fetchGroups()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('group.deleteFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

// Storage input helpers (convert bytes <-> GB for display)
const maxStorageGB = computed({
  get: () => formData.value.max_storage / (1024 * 1024 * 1024),
  set: (v: number | null) => { formData.value.max_storage = (v ?? 0) * 1024 * 1024 * 1024 }
})

const speedLimitMB = computed({
  get: () => formData.value.speed_limit / (1024 * 1024),
  set: (v: number | null) => { formData.value.speed_limit = (v ?? 0) * 1024 * 1024 }
})
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        {{ t('group.title') }}
      </h1>
      <div class="flex items-center gap-2">
        <USelect
          v-model="orderBy"
          :items="orderOptions"
          class="w-36"
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
          @click="fetchGroups"
        />
        <UButton
          :label="t('group.createGroup')"
          icon="i-lucide-plus"
          @click="openCreateModal"
        />
      </div>
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <template v-else>
      <UTable
        :data="groups"
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

  <!-- Create/Edit Modal -->
  <UModal
    v-model:open="formModalOpen"
    :title="isEditing ? t('group.editGroup') : t('group.createGroup')"
    description=" "
    :ui="{ footer: 'justify-end', content: 'sm:max-w-2xl', description: 'hidden' }"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Basic Info -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted">
            {{ t('group.basicInfo') }}
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('group.name') }}</label>
              <UInput
                v-model="formData.name"
                :placeholder="t('group.namePlaceholder')"
                class="w-full"
              />
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('group.maxStorage') }} (GB)</label>
              <UInputNumber
                v-model="maxStorageGB"
                :min="0"
                :step="1"
                class="w-full"
              />
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('group.speedLimit') }} (MB/s)</label>
              <UInputNumber
                v-model="speedLimitMB"
                :min="0"
                :step="1"
                class="w-full"
              />
              <p class="text-xs text-muted mt-1">
                {{ t('group.speedLimitDesc') }}
              </p>
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('group.sourceBatch') }}</label>
              <UInputNumber
                v-model="formData.source_batch"
                :min="0"
                :step="1"
                class="w-full"
              />
              <p class="text-xs text-muted mt-1">
                {{ t('group.sourceBatchDesc') }}
              </p>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- Feature Toggles -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted">
            {{ t('group.featureToggles') }}
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <USwitch
              v-model="formData.share_enabled"
              :label="t('group.shareEnabled')"
              :description="t('group.shareEnabledDesc')"
            />
            <USwitch
              v-model="formData.web_dav_enabled"
              :label="t('group.webDavEnabled')"
              :description="t('group.webDavEnabledDesc')"
            />
            <USwitch
              v-model="formData.share_download"
              :label="t('group.shareDownload')"
              :description="t('group.shareDownloadDesc')"
            />
            <USwitch
              v-model="formData.share_free"
              :label="t('group.shareFree')"
              :description="t('group.shareFreeDesc')"
            />
          </div>
        </div>

        <USeparator />

        <!-- Advanced Permissions -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted">
            {{ t('group.advancedPermissions') }}
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <USwitch
              v-model="formData.relocate"
              :label="t('group.relocate')"
              :description="t('group.relocateDesc')"
            />
            <USwitch
              v-model="formData.select_node"
              :label="t('group.selectNode')"
              :description="t('group.selectNodeDesc')"
            />
            <USwitch
              v-model="formData.advance_delete"
              :label="t('group.advanceDelete')"
              :description="t('group.advanceDeleteDesc')"
            />
            <USwitch
              v-model="formData.archive_download"
              :label="t('group.archiveDownload')"
              :description="t('group.archiveDownloadDesc')"
            />
            <USwitch
              v-model="formData.archive_task"
              :label="t('group.archiveTask')"
              :description="t('group.archiveTaskDesc')"
            />
            <USwitch
              v-if="formData.web_dav_enabled"
              v-model="formData.webdav_proxy"
              :label="t('group.webdavProxy')"
              :description="t('group.webdavProxyDesc')"
            />
            <USwitch
              v-model="formData.aria2"
              :label="t('group.aria2')"
              :description="t('group.aria2Desc')"
            />
            <USwitch
              v-if="formData.source_batch > 0"
              v-model="formData.redirected_source"
              :label="t('group.redirectedSource')"
              :description="t('group.redirectedSourceDesc')"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="formModalOpen = false"
      />
      <UButton
        :label="isEditing ? t('common.confirm') : t('common.create')"
        :loading="submitting"
        :disabled="!formData.name.trim()"
        @click="submitForm"
      />
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="deleteModalOpen"
    :title="t('group.deleteGroup')"
    description=" "
    :ui="{ footer: 'justify-end', description: 'hidden' }"
  >
    <template #body>
      <p class="text-sm">
        {{ t('group.deleteConfirm', { name: deletingGroup?.name }) }}
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
