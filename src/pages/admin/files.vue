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

interface AdminFile {
  name: string
  type: 'file' | 'folder'
  size: number
  id: string
  thumb: boolean
  created_at: string
  updated_at: string
  source_enabled: boolean
  owner_id: string
  owner_email: string
  policy_name: string
  is_banned: boolean
  banned_at: string | null
  ban_reason: string | null
}

interface FileListResponse {
  count: number
  items: AdminFile[]
}

// List state
const files = ref<AdminFile[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 20
const orderBy = ref('created_at')
const orderDesc = ref(true)
const searchQuery = ref('')
const filterBanned = ref('')

const orderOptions = [
  { label: t('adminFile.orderCreatedAt'), value: 'created_at' },
  { label: t('adminFile.orderUpdatedAt'), value: 'updated_at' }
]

const bannedFilterItems = [
  { label: t('adminFile.banned'), value: 'true' },
  { label: t('adminFile.notBanned'), value: 'false' }
]

// Debounced search
const debouncedSearch = ref('')
let searchTimer: ReturnType<typeof setTimeout> | undefined
watch(searchQuery, (val) => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { debouncedSearch.value = val }, 300)
})

function formatSize(bytes: number): string {
  if (bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { year: 'numeric', month: '2-digit', day: '2-digit' })
}

async function fetchFiles() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      offset: (page.value - 1) * pageSize,
      limit: pageSize,
      order: orderBy.value,
      desc: orderDesc.value
    }
    if (debouncedSearch.value) params.keyword = debouncedSearch.value
    if (filterBanned.value) params.is_banned = filterBanned.value === 'true'

    const { data } = await api.get<FileListResponse>('/api/v1/admin/file/list', { params })
    files.value = data.items
    total.value = data.count
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminFile.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(page, () => fetchFiles())
watch([debouncedSearch, filterBanned, orderBy, orderDesc], () => {
  page.value = 1
  fetchFiles()
})

onMounted(() => {
  fetchFiles()
})

// Table columns
function getDropdownItems(file: AdminFile): DropdownMenuItem[][] {
  return [
    [
      {
        label: file.is_banned ? t('adminFile.unbanFile') : t('adminFile.banFile'),
        icon: file.is_banned ? 'i-lucide-shield-check' : 'i-lucide-shield-ban',
        onSelect() { openBanModal(file) }
      }
    ],
    [
      {
        label: t('adminFile.deleteFile'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect() { openDeleteModal(file) }
      }
    ]
  ]
}

const columns = computed<TableColumn<AdminFile>[]>(() => [
  {
    id: 'file',
    header: t('adminFile.fileName'),
    cell: ({ row }) => {
      const icon = row.original.type === 'folder' ? 'i-lucide-folder' : 'i-lucide-file'
      return h('div', { class: 'flex items-center gap-2 min-w-0' }, [
        h(resolveComponent('UIcon'), { name: icon, class: 'size-4 shrink-0' }),
        h('span', { class: 'truncate', title: row.original.name }, row.original.name)
      ])
    }
  },
  {
    accessorKey: 'type',
    header: t('adminFile.fileType'),
    cell: ({ row }) => {
      const isFolder = row.original.type === 'folder'
      return h(UBadge, {
        color: isFolder ? 'info' : 'neutral',
        variant: 'subtle',
        size: 'xs'
      }, {
        default: () => isFolder ? t('adminFile.fileTypeFolder') : t('adminFile.fileTypeFile')
      })
    }
  },
  {
    accessorKey: 'size',
    header: t('adminFile.size'),
    cell: ({ row }) => formatSize(row.original.size)
  },
  {
    accessorKey: 'owner_email',
    header: t('adminFile.owner')
  },
  {
    accessorKey: 'policy_name',
    header: t('adminFile.policy')
  },
  {
    accessorKey: 'is_banned',
    header: t('adminFile.status'),
    cell: ({ row }) => {
      return h(UBadge, {
        color: row.original.is_banned ? 'error' : 'success',
        variant: 'subtle',
        size: 'xs'
      }, {
        default: () => row.original.is_banned ? t('adminFile.statusBanned') : t('adminFile.statusNormal')
      })
    }
  },
  {
    accessorKey: 'created_at',
    header: t('adminFile.createdAt'),
    cell: ({ row }) => formatDate(row.original.created_at)
  },
  {
    id: 'actions',
    header: t('adminFile.actions'),
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

// Ban/Unban Modal
const banModalOpen = ref(false)
const banningFile = ref<AdminFile | null>(null)
const banReason = ref('')
const banSubmitting = ref(false)

function openBanModal(file: AdminFile) {
  banningFile.value = file
  banReason.value = ''
  banModalOpen.value = true
}

async function confirmBan() {
  if (!banningFile.value) return
  banSubmitting.value = true
  const isBanning = !banningFile.value.is_banned
  try {
    const body: Record<string, unknown> = { ban: isBanning }
    if (isBanning && banReason.value.trim()) body.reason = banReason.value.trim()
    await api.patch(`/api/v1/admin/file/ban/${banningFile.value.id}`, body)
    toast.add({
      title: isBanning ? t('adminFile.banSuccess') : t('adminFile.unbanSuccess'),
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
    banModalOpen.value = false
    fetchFiles()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: isBanning ? t('adminFile.banFailed') : t('adminFile.unbanFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    banSubmitting.value = false
  }
}

// Delete Modal
const deleteModalOpen = ref(false)
const deletingFile = ref<AdminFile | null>(null)
const deletePhysical = ref(true)
const deleting = ref(false)

function openDeleteModal(file: AdminFile) {
  deletingFile.value = file
  deletePhysical.value = true
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingFile.value) return
  deleting.value = true
  try {
    await api.delete(`/api/v1/admin/file/${deletingFile.value.id}`, {
      params: { delete_physical: deletePhysical.value }
    })
    toast.add({
      title: t('adminFile.deleteSuccess'),
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
    deleteModalOpen.value = false
    fetchFiles()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminFile.deleteFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        {{ t('adminFile.title') }}
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
          @click="fetchFiles"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3">
      <UInput
        v-model="searchQuery"
        :placeholder="t('adminFile.searchPlaceholder')"
        icon="i-lucide-search"
        class="w-64"
      />
      <USelectMenu
        v-model="filterBanned"
        :items="bannedFilterItems"
        value-key="value"
        :placeholder="t('adminFile.allStatuses')"
        :search-input="false"
        clear
        class="w-40"
      />
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

    <!-- Table + Pagination -->
    <template v-else>
      <UTable
        :data="files"
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

  <!-- Ban/Unban Modal -->
  <UModal
    v-model:open="banModalOpen"
    :title="banningFile?.is_banned ? t('adminFile.unbanFile') : t('adminFile.banFile')"
    description=" "
    :ui="{ footer: 'justify-end', description: 'hidden' }"
  >
    <template #body>
      <div class="space-y-4">
        <!-- Ban: show confirm text + reason input -->
        <template v-if="banningFile && !banningFile.is_banned">
          <p class="text-sm">
            {{ t('adminFile.banConfirm', { name: banningFile.name }) }}
          </p>
          <div>
            <label class="text-sm font-medium mb-1 block">{{ t('adminFile.banReason') }}</label>
            <UInput
              v-model="banReason"
              :placeholder="t('adminFile.banReasonPlaceholder')"
              class="w-full"
            />
          </div>
        </template>

        <!-- Unban: show confirm text + current reason -->
        <template v-if="banningFile && banningFile.is_banned">
          <p class="text-sm">
            {{ t('adminFile.unbanConfirm', { name: banningFile.name }) }}
          </p>
          <p
            v-if="banningFile.ban_reason"
            class="text-sm text-muted"
          >
            {{ t('adminFile.currentBanReason') }}: {{ banningFile.ban_reason }}
          </p>
        </template>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="banModalOpen = false"
      />
      <UButton
        :label="t('common.confirm')"
        :color="banningFile?.is_banned ? 'primary' : 'error'"
        :loading="banSubmitting"
        @click="confirmBan"
      />
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="deleteModalOpen"
    :title="t('adminFile.deleteFile')"
    description=" "
    :ui="{ footer: 'justify-end', description: 'hidden' }"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm">
          {{ t('adminFile.deleteConfirm', { name: deletingFile?.name }) }}
        </p>
        <UCheckbox
          v-model="deletePhysical"
          :label="t('adminFile.deletePhysical')"
        />
      </div>
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
