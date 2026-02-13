<script setup lang="ts">
import { h, ref, computed, onMounted, watch, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { AxiosError } from 'axios'
import api from '../../utils/api'

type ApiErrorResponse = { detail?: string }

const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UAvatar = resolveComponent('UAvatar')

const { t } = useI18n()
const toast = useToast()

interface User {
  id: string
  email: string
  nickname: string
  status: 'active' | 'admin_banned' | 'system_banned'
  score: number
  storage: number
  avatar: string
  group_expires: string | null
  group_id: string
  group_name: string
  two_factor: string
  created_at: string
  updated_at: string
}

interface UserListResponse {
  count: number
  items: User[]
}

interface SimpleGroup {
  id: string
  name: string
}

interface CalibrateResponse {
  user_id: string
  previous_storage: number
  current_storage: number
  difference: number
  file_count: number
}

// Group list (for filters & form selects)
const groupList = ref<SimpleGroup[]>([])
const groupSelectItems = computed(() =>
  groupList.value.map(g => ({ label: g.name, value: g.id }))
)

const groupFormItems = computed(() =>
  groupList.value.map(g => ({ label: g.name, value: g.id }))
)

async function fetchGroupList() {
  try {
    const { data } = await api.get<{ count: number; items: SimpleGroup[] }>('/api/v1/admin/group/', {
      params: { offset: 0, limit: 100 }
    })
    groupList.value = data.items
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('group.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  }
}

// List state
const users = ref<User[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 20
const orderBy = ref('created_at')
const orderDesc = ref(true)
const searchQuery = ref('')
const filterGroupId = ref('')
const filterStatus = ref('')

const orderOptions = [
  { label: t('adminUser.orderCreatedAt'), value: 'created_at' },
  { label: t('adminUser.orderUpdatedAt'), value: 'updated_at' }
]

const statusFilterItems = [
  { label: t('adminUser.statusActive'), value: 'active' },
  { label: t('adminUser.statusAdminBanned'), value: 'admin_banned' },
  { label: t('adminUser.statusSystemBanned'), value: 'system_banned' }
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

async function fetchUsers() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      offset: (page.value - 1) * pageSize,
      limit: pageSize,
      order: orderBy.value,
      desc: orderDesc.value
    }
    if (debouncedSearch.value) {
      params.email = debouncedSearch.value
      params.nickname = debouncedSearch.value
    }
    if (filterGroupId.value) params.group_id = filterGroupId.value
    if (filterStatus.value) params.status = filterStatus.value

    const { data } = await api.get<UserListResponse>('/api/v1/admin/user/list', { params })
    users.value = data.items
    total.value = data.count
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminUser.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(page, () => fetchUsers())
watch([debouncedSearch, filterGroupId, filterStatus, orderBy, orderDesc], () => {
  page.value = 1
  fetchUsers()
})

onMounted(() => {
  fetchGroupList()
  fetchUsers()
})

// Status badge config
const statusConfig: Record<string, { color: 'success' | 'error' | 'warning'; key: string }> = {
  active: { color: 'success', key: 'adminUser.statusActive' },
  admin_banned: { color: 'error', key: 'adminUser.statusAdminBanned' },
  system_banned: { color: 'warning', key: 'adminUser.statusSystemBanned' }
}

// Table columns
function getDropdownItems(user: User): DropdownMenuItem[][] {
  return [
    [
      {
        label: t('common.edit'),
        icon: 'i-lucide-pencil',
        onSelect() { openEditModal(user) }
      },
      {
        label: t('adminUser.calibrate'),
        icon: 'i-lucide-hard-drive',
        onSelect() { calibrateUser(user) }
      }
    ],
    [
      {
        label: t('common.delete'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect() { openDeleteModal(user) }
      }
    ]
  ]
}

const columns = computed<TableColumn<User>[]>(() => [
  {
    id: 'user',
    header: t('adminUser.email'),
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-3' }, [
        h(UAvatar, { alt: row.original.nickname || row.original.email, size: 'sm' }),
        h('div', { class: 'min-w-0' }, [
          h('div', { class: 'font-medium truncate' }, row.original.email),
          h('div', { class: 'text-xs text-muted truncate' }, row.original.nickname || '-')
        ])
      ])
    }
  },
  {
    accessorKey: 'status',
    header: t('adminUser.status'),
    cell: ({ row }) => {
      const cfg = statusConfig[row.original.status]
      if (!cfg) return row.original.status
      return h(UBadge, { color: cfg.color, variant: 'subtle', size: 'xs' }, { default: () => t(cfg.key) })
    }
  },
  {
    accessorKey: 'group_name',
    header: t('adminUser.group')
  },
  {
    accessorKey: 'storage',
    header: t('adminUser.storage'),
    cell: ({ row }) => formatSize(row.original.storage)
  },
  {
    accessorKey: 'score',
    header: t('adminUser.score')
  },
  {
    accessorKey: 'created_at',
    header: t('adminUser.createdAt'),
    cell: ({ row }) => formatDate(row.original.created_at)
  },
  {
    id: 'actions',
    header: t('adminUser.actions'),
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
const editingUser = ref<User | null>(null)
const submitting = ref(false)

const formData = ref({
  email: '',
  password: '',
  nickname: '',
  group_id: '',
  status: 'active' as string,
  score: 0,
  storage: 0,
  group_expires: '',
  two_factor: ''
})

const isEditing = computed(() => !!editingUser.value)

const storageGB = computed({
  get: () => formData.value.storage / (1024 * 1024 * 1024),
  set: (v: number | null) => { formData.value.storage = (v ?? 0) * 1024 * 1024 * 1024 }
})

const statusFormItems = [
  { label: t('adminUser.statusActive'), value: 'active' },
  { label: t('adminUser.statusAdminBanned'), value: 'admin_banned' },
  { label: t('adminUser.statusSystemBanned'), value: 'system_banned' }
]

function resetForm() {
  formData.value = {
    email: '',
    password: '',
    nickname: '',
    group_id: groupList.value.length ? groupList.value[0].id : '',
    status: 'active',
    score: 0,
    storage: 0,
    group_expires: '',
    two_factor: ''
  }
}

function openCreateModal() {
  editingUser.value = null
  resetForm()
  formModalOpen.value = true
}

function openEditModal(user: User) {
  editingUser.value = user
  formData.value = {
    email: user.email,
    password: '',
    nickname: user.nickname,
    group_id: user.group_id,
    status: user.status,
    score: user.score,
    storage: user.storage,
    group_expires: user.group_expires ? user.group_expires.slice(0, 16) : '',
    two_factor: user.two_factor
  }
  formModalOpen.value = true
}

async function submitForm() {
  if (!formData.value.email.trim()) return
  submitting.value = true
  try {
    if (isEditing.value) {
      const body: Record<string, unknown> = {
        email: formData.value.email,
        nickname: formData.value.nickname,
        group_id: formData.value.group_id,
        status: formData.value.status,
        score: formData.value.score,
        storage: formData.value.storage,
        group_expires: formData.value.group_expires ? new Date(formData.value.group_expires).toISOString() : null,
        two_factor: formData.value.two_factor
      }
      if (formData.value.password) body.password = formData.value.password
      await api.patch(`/api/v1/admin/user/${editingUser.value!.id}`, body)
      toast.add({ title: t('adminUser.updateSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    } else {
      if (!formData.value.password.trim()) return
      await api.post('/api/v1/admin/user/create', {
        email: formData.value.email,
        password: formData.value.password,
        nickname: formData.value.nickname,
        group_id: formData.value.group_id,
        status: formData.value.status
      })
      toast.add({ title: t('adminUser.createSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    }
    formModalOpen.value = false
    fetchUsers()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: isEditing.value ? t('adminUser.updateFailed') : t('adminUser.createFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

function clearTwoFactor() {
  formData.value.two_factor = ''
}

// Delete Modal
const deleteModalOpen = ref(false)
const deletingUser = ref<User | null>(null)
const deleting = ref(false)

function openDeleteModal(user: User) {
  deletingUser.value = user
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingUser.value) return
  deleting.value = true
  try {
    await api.delete('/api/v1/admin/user/', { data: { ids: [deletingUser.value.id] } })
    toast.add({ title: t('adminUser.deleteSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    deleteModalOpen.value = false
    fetchUsers()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminUser.deleteFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

// Calibrate storage
async function calibrateUser(user: User) {
  try {
    const { data } = await api.post<CalibrateResponse>(`/api/v1/admin/user/calibrate/${user.id}`)
    toast.add({
      title: t('adminUser.calibrateSuccess'),
      description: t('adminUser.calibrateResult', {
        previous: formatSize(data.previous_storage),
        current: formatSize(data.current_storage),
        diff: formatSize(Math.abs(data.difference))
      }),
      icon: 'i-lucide-check-circle',
      color: 'success'
    })
    fetchUsers()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminUser.calibrateFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        {{ t('adminUser.title') }}
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
          @click="fetchUsers"
        />
        <UButton
          :label="t('adminUser.createUser')"
          icon="i-lucide-plus"
          @click="openCreateModal"
        />
      </div>
    </div>

    <!-- Filters -->
    <div class="flex items-center gap-3">
      <UInput
        v-model="searchQuery"
        :placeholder="t('adminUser.searchPlaceholder')"
        icon="i-lucide-search"
        class="w-64"
      />
      <USelectMenu
        v-model="filterGroupId"
        :items="groupSelectItems"
        value-key="value"
        :placeholder="t('adminUser.allGroups')"
        :search-input="false"
        clear
        class="w-40"
      />
      <USelectMenu
        v-model="filterStatus"
        :items="statusFilterItems"
        value-key="value"
        :placeholder="t('adminUser.allStatuses')"
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
        :data="users"
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
    :title="isEditing ? t('adminUser.editUser') : t('adminUser.createUser')"
    description=" "
    :ui="{ footer: 'justify-end', content: 'sm:max-w-2xl', description: 'hidden' }"
  >
    <template #body>
      <form @submit.prevent="submitForm">
        <div class="space-y-6">
          <!-- Basic Info -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-muted">
              {{ t('adminUser.basicInfo') }}
            </h3>
            <div class="space-y-3">
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('adminUser.email') }}</label>
                <UInput
                  v-model="formData.email"
                  type="email"
                  :placeholder="t('adminUser.emailPlaceholder')"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('adminUser.nickname') }}</label>
                <UInput
                  v-model="formData.nickname"
                  :placeholder="t('adminUser.nicknamePlaceholder')"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('adminUser.password') }}</label>
                <UInput
                  v-model="formData.password"
                  type="password"
                  :placeholder="isEditing ? t('adminUser.passwordEditHint') : t('adminUser.passwordPlaceholder')"
                  class="w-full"
                />
              </div>
            </div>
          </div>

          <USeparator />

          <!-- Account Settings -->
          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-muted">
              {{ t('adminUser.accountSettings') }}
            </h3>
            <div class="space-y-3">
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-sm font-medium mb-1 block">{{ t('adminUser.group') }}</label>
                  <USelect
                    v-model="formData.group_id"
                    :items="groupFormItems"
                    class="w-full"
                  />
                </div>
                <div>
                  <label class="text-sm font-medium mb-1 block">{{ t('adminUser.status') }}</label>
                  <USelect
                    v-model="formData.status"
                    :items="statusFormItems"
                    class="w-full"
                  />
                </div>
              </div>

              <template v-if="isEditing">
                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="text-sm font-medium mb-1 block">{{ t('adminUser.score') }}</label>
                    <UInputNumber
                      v-model="formData.score"
                      :min="0"
                      :step="1"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <label class="text-sm font-medium mb-1 block">{{ t('adminUser.storage') }} (GB)</label>
                    <UInputNumber
                      v-model="storageGB"
                      :min="0"
                      :step="0.1"
                      class="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label class="text-sm font-medium mb-1 block">{{ t('adminUser.groupExpires') }}</label>
                  <UInput
                    v-model="formData.group_expires"
                    type="datetime-local"
                    class="w-full"
                  />
                </div>

                <div class="flex items-center justify-between">
                  <div>
                    <label class="text-sm font-medium block">{{ t('adminUser.twoFactor') }}</label>
                    <span class="text-xs text-muted">
                      {{ formData.two_factor ? t('common.enabled') : t('common.disabled') }}
                    </span>
                  </div>
                  <UButton
                    v-if="formData.two_factor"
                    :label="t('adminUser.clearTwoFactor')"
                    color="error"
                    variant="soft"
                    size="xs"
                    @click="clearTwoFactor"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>
      </form>
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
        :disabled="!formData.email.trim() || (!isEditing && !formData.password.trim())"
        @click="submitForm"
      />
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="deleteModalOpen"
    :title="t('adminUser.deleteUser')"
    description=" "
    :ui="{ footer: 'justify-end', description: 'hidden' }"
  >
    <template #body>
      <p class="text-sm">
        {{ t('adminUser.deleteConfirm', { email: deletingUser?.email }) }}
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
