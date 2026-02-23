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

const { t } = useI18n()
const toast = useToast()

interface PolicyListItem {
  id: string
  name: string
  type: 'local' | 's3'
  server: string
  max_size: number
  is_private: boolean
}

interface PolicyListResponse {
  count: number
  items: PolicyListItem[]
}

interface PolicyDetail {
  id: string
  name: string
  type: string
  server: string
  bucket_name: string
  is_private: boolean
  base_url: string
  access_key: string
  secret_key: string
  max_size: number
  auto_rename: boolean
  dir_name_rule: string
  file_name_rule: string
  is_origin_link_enable: boolean
  options: Record<string, unknown>
  groups: { id: string; name: string }[]
  object_count: number
}

// List state
const policies = ref<PolicyListItem[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 20
const orderBy = ref('created_at')
const orderDesc = ref(true)

const orderOptions = [
  { label: t('policy.orderCreatedAt'), value: 'created_at' },
  { label: t('policy.orderUpdatedAt'), value: 'updated_at' }
]

const typeOptions = [
  { label: t('policy.typeLocal'), value: 'local' },
  { label: t('policy.typeS3'), value: 's3' }
]

const namingVars = [
  '{date}', '{timestamp}', '{year}', '{month}', '{day}',
  '{hour}', '{minute}', '{randomkey16}', '{originname}',
  '{ext}', '{uid}', '{uuid}'
]

function formatSize(bytes: number): string {
  if (bytes === 0) return t('policy.unlimited')
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

async function fetchPolicies() {
  loading.value = true
  try {
    const { data } = await api.get<PolicyListResponse>('/api/v1/admin/policy/list', {
      params: {
        offset: (page.value - 1) * pageSize,
        limit: pageSize,
        order: orderBy.value,
        desc: orderDesc.value
      }
    })
    policies.value = data.items
    total.value = data.count
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('policy.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

let skipNextPageFetch = false

watch(page, () => {
  if (skipNextPageFetch) {
    skipNextPageFetch = false
    return
  }
  fetchPolicies()
})
watch([orderBy, orderDesc], () => {
  if (page.value !== 1) {
    skipNextPageFetch = true
    page.value = 1
  }
  fetchPolicies()
})

onMounted(() => fetchPolicies())

// Table columns
function getDropdownItems(item: PolicyListItem): DropdownMenuItem[][] {
  return [
    [
      {
        label: t('common.edit'),
        icon: 'i-lucide-pencil',
        onSelect() { openEditModal(item) }
      }
    ],
    [
      {
        label: t('common.delete'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect() { openDeleteModal(item) }
      }
    ]
  ]
}

const columns = computed<TableColumn<PolicyListItem>[]>(() => [
  {
    accessorKey: 'name',
    header: t('policy.name')
  },
  {
    accessorKey: 'type',
    header: t('policy.type'),
    cell: ({ row }) => h(UBadge, {
      label: row.original.type === 'local' ? t('policy.typeLocal') : t('policy.typeS3'),
      color: row.original.type === 'local' ? 'neutral' : 'primary',
      variant: 'subtle',
      size: 'md'
    })
  },
  {
    accessorKey: 'server',
    header: t('policy.server'),
    cell: ({ row }) => {
      const server = row.original.server || '-'
      return h(UTooltip, { text: server }, {
        default: () => h('span', { class: 'truncate max-w-48 inline-block align-bottom' }, server)
      })
    }
  },
  {
    accessorKey: 'max_size',
    header: t('policy.maxSize'),
    cell: ({ row }) => formatSize(row.original.max_size),
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'is_private',
    header: t('policy.isPrivate'),
    cell: ({ row }) => h(UBadge, {
      label: row.original.is_private ? t('adminShare.yes') : t('adminShare.no'),
      color: row.original.is_private ? 'warning' : 'neutral',
      variant: 'subtle',
      size: 'md'
    })
  },
  {
    id: 'actions',
    header: t('policy.actions'),
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
const editingPolicy = ref<PolicyListItem | null>(null)
const editLoading = ref(false)
const submitting = ref(false)

const formData = ref({
  name: '',
  type: 'local' as string,
  server: '',
  bucket_name: '',
  is_private: false,
  base_url: '',
  access_key: '',
  secret_key: '',
  max_size: 0,
  auto_rename: false,
  dir_name_rule: '',
  file_name_rule: '',
  is_origin_link_enable: false,
  file_type: '',
  mimetype: '',
  chunk_size: 52428800,
  s3_path_style: false,
  s3_region: 'us-east-1'
})

const isEditing = computed(() => !!editingPolicy.value)
const isS3 = computed(() => formData.value.type === 's3')

// Unit conversion: bytes <-> MB
const maxSizeMB = computed({
  get: () => formData.value.max_size / (1024 * 1024),
  set: (v: number | null) => { formData.value.max_size = (v ?? 0) * 1024 * 1024 }
})

const chunkSizeMB = computed({
  get: () => formData.value.chunk_size / (1024 * 1024),
  set: (v: number | null) => { formData.value.chunk_size = (v ?? 0) * 1024 * 1024 }
})

function resetForm() {
  formData.value = {
    name: '',
    type: 'local',
    server: '',
    bucket_name: '',
    is_private: false,
    base_url: '',
    access_key: '',
    secret_key: '',
    max_size: 0,
    auto_rename: false,
    dir_name_rule: '',
    file_name_rule: '',
    is_origin_link_enable: false,
    file_type: '',
    mimetype: '',
    chunk_size: 52428800,
    s3_path_style: false,
    s3_region: 'us-east-1'
  }
}

function openCreateModal() {
  editingPolicy.value = null
  resetForm()
  formModalOpen.value = true
}

async function openEditModal(item: PolicyListItem) {
  editingPolicy.value = item
  resetForm()
  formModalOpen.value = true
  editLoading.value = true
  try {
    const { data } = await api.get<PolicyDetail>(`/api/v1/admin/policy/${item.id}`)
    formData.value = {
      name: data.name,
      type: data.type,
      server: data.server || '',
      bucket_name: data.bucket_name || '',
      is_private: data.is_private,
      base_url: data.base_url || '',
      access_key: data.access_key || '',
      secret_key: data.secret_key || '',
      max_size: data.max_size,
      auto_rename: data.auto_rename,
      dir_name_rule: data.dir_name_rule || '',
      file_name_rule: data.file_name_rule || '',
      is_origin_link_enable: data.is_origin_link_enable,
      file_type: (data.options?.file_type as string) || '',
      mimetype: (data.options?.mimetype as string) || '',
      chunk_size: (data.options?.chunk_size as number) || 52428800,
      s3_path_style: (data.options?.s3_path_style as boolean) || false,
      s3_region: (data.options?.s3_region as string) || 'us-east-1'
    }
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('policy.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
    formModalOpen.value = false
  } finally {
    editLoading.value = false
  }
}

async function submitForm() {
  if (!formData.value.name.trim()) return
  submitting.value = true
  try {
    if (isEditing.value) {
      const updateData = Object.fromEntries(
        Object.entries(formData.value).filter(([k]) => k !== 'type')
      )
      await api.patch(`/api/v1/admin/policy/${editingPolicy.value!.id}`, updateData)
      toast.add({ title: t('policy.updateSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    } else {
      await api.post('/api/v1/admin/policy/', formData.value)
      toast.add({ title: t('policy.createSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    }
    formModalOpen.value = false
    fetchPolicies()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: isEditing.value ? t('policy.updateFailed') : t('policy.createFailed'),
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
const deletingPolicy = ref<PolicyListItem | null>(null)
const deleting = ref(false)

function openDeleteModal(item: PolicyListItem) {
  deletingPolicy.value = item
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingPolicy.value) return
  deleting.value = true
  try {
    await api.delete(`/api/v1/admin/policy/${deletingPolicy.value.id}`)
    toast.add({ title: t('policy.deleteSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    deleteModalOpen.value = false
    fetchPolicies()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('policy.deleteFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

// Test functionality
const testingPath = ref(false)
const testingS3 = ref(false)

async function testLocalPath() {
  if (!formData.value.server.trim()) return
  testingPath.value = true
  try {
    const { data } = await api.post<{ path: string; is_exists: boolean; is_writable: boolean }>(
      '/api/v1/admin/policy/test/path',
      { path: formData.value.server }
    )
    const messages: string[] = []
    messages.push(data.is_exists ? t('policy.pathExists') : t('policy.pathNotExists'))
    messages.push(data.is_writable ? t('policy.pathWritable') : t('policy.pathNotWritable'))
    toast.add({
      title: data.is_exists && data.is_writable ? t('policy.testSuccess') : t('policy.testFailed'),
      description: messages.join(' | '),
      icon: data.is_exists && data.is_writable ? 'i-lucide-check-circle' : 'i-lucide-circle-x',
      color: data.is_exists && data.is_writable ? 'success' : 'error'
    })
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('policy.testFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    testingPath.value = false
  }
}

async function testS3Connection() {
  testingS3.value = true
  try {
    const { data } = await api.post<{ is_connected: boolean; message: string }>(
      '/api/v1/admin/policy/test/s3',
      {
        server: formData.value.server,
        bucket_name: formData.value.bucket_name,
        access_key: formData.value.access_key,
        secret_key: formData.value.secret_key,
        s3_region: formData.value.s3_region,
        s3_path_style: formData.value.s3_path_style
      }
    )
    toast.add({
      title: data.is_connected ? t('policy.s3Connected') : t('policy.s3NotConnected'),
      description: data.message,
      icon: data.is_connected ? 'i-lucide-check-circle' : 'i-lucide-circle-x',
      color: data.is_connected ? 'success' : 'error'
    })
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('policy.testFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    testingS3.value = false
  }
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        {{ t('policy.title') }}
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
          @click="fetchPolicies"
        />
        <UButton
          :label="t('policy.createPolicy')"
          icon="i-lucide-plus"
          @click="openCreateModal"
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
      v-else-if="policies.length === 0"
      class="text-center py-12 text-muted"
    >
      <UIcon
        name="i-lucide-database"
        class="size-12 mx-auto mb-4 opacity-50"
      />
      <p>{{ t('policy.empty') }}</p>
    </div>

    <!-- Table + Pagination -->
    <template v-else>
      <UTable
        :data="policies"
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
    :title="isEditing ? t('policy.editPolicy') : t('policy.createPolicy')"
    description=" "
    :ui="{ footer: 'justify-end', content: 'sm:max-w-2xl', description: 'hidden' }"
  >
    <template #body>
      <!-- Edit loading -->
      <div
        v-if="editLoading"
        class="flex justify-center py-8"
      >
        <UIcon
          name="i-lucide-loader-2"
          class="size-6 animate-spin text-muted"
        />
      </div>

      <div
        v-else
        class="space-y-6"
      >
        <!-- Basic Info -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted">
            {{ t('policy.basicInfo') }}
          </h3>
          <div class="space-y-3">
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('policy.name') }}</label>
              <UInput
                v-model="formData.name"
                :placeholder="t('policy.namePlaceholder')"
                class="w-full"
              />
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('policy.type') }}</label>
              <USelect
                v-model="formData.type"
                :items="typeOptions"
                :disabled="isEditing"
                class="w-full"
              />
            </div>
            <div>
              <USwitch
                v-model="formData.is_private"
                :label="t('policy.isPrivate')"
                :description="t('policy.isPrivateDesc')"
              />
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('policy.maxSize') }} (MB)</label>
              <UInputNumber
                v-model="maxSizeMB"
                :min="0"
                :step="1"
                class="w-full"
              />
              <p class="text-xs text-muted mt-1">
                {{ t('policy.maxSizeDesc') }}
              </p>
            </div>
          </div>
        </div>

        <USeparator />

        <!-- Storage Config -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted">
            {{ t('policy.storageConfig') }}
          </h3>
          <div class="space-y-3">
            <!-- Local storage path -->
            <div v-if="!isS3">
              <label class="text-sm font-medium mb-1 block">{{ t('policy.server') }}</label>
              <div class="flex gap-2">
                <UInput
                  v-model="formData.server"
                  :placeholder="t('policy.serverPlaceholder')"
                  class="flex-1"
                />
                <UButton
                  :label="t('policy.testPath')"
                  icon="i-lucide-flask-conical"
                  color="neutral"
                  variant="outline"
                  :loading="testingPath"
                  :disabled="!formData.server.trim()"
                  @click="testLocalPath"
                />
              </div>
            </div>

            <!-- S3 config -->
            <template v-if="isS3">
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('policy.server') }}</label>
                <UInput
                  v-model="formData.server"
                  :placeholder="t('policy.serverS3Placeholder')"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('policy.bucketName') }}</label>
                <UInput
                  v-model="formData.bucket_name"
                  :placeholder="t('policy.bucketNamePlaceholder')"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('policy.accessKey') }}</label>
                <UInput
                  v-model="formData.access_key"
                  :placeholder="t('policy.accessKeyPlaceholder')"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('policy.secretKey') }}</label>
                <UInput
                  v-model="formData.secret_key"
                  type="password"
                  :placeholder="t('policy.secretKeyPlaceholder')"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('policy.s3Region') }}</label>
                <UInput
                  v-model="formData.s3_region"
                  class="w-full"
                />
              </div>
              <div>
                <USwitch
                  v-model="formData.s3_path_style"
                  :label="t('policy.s3PathStyle')"
                  :description="t('policy.s3PathStyleDesc')"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('policy.baseUrl') }}</label>
                <UInput
                  v-model="formData.base_url"
                  :placeholder="t('policy.baseUrlPlaceholder')"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('policy.chunkSize') }} (MB)</label>
                <UInputNumber
                  v-model="chunkSizeMB"
                  :min="1"
                  :step="1"
                  class="w-full"
                />
                <p class="text-xs text-muted mt-1">
                  {{ t('policy.chunkSizeDesc') }}
                </p>
              </div>
              <div>
                <UButton
                  :label="t('policy.testS3')"
                  icon="i-lucide-flask-conical"
                  color="neutral"
                  variant="outline"
                  :loading="testingS3"
                  @click="testS3Connection"
                />
              </div>
            </template>
          </div>
        </div>

        <USeparator />

        <!-- Upload Rules -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted">
            {{ t('policy.uploadRules') }}
          </h3>
          <div class="space-y-3">
            <div>
              <USwitch
                v-model="formData.auto_rename"
                :label="t('policy.autoRename')"
                :description="t('policy.autoRenameDesc')"
              />
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('policy.dirNameRule') }}</label>
              <UInput
                v-model="formData.dir_name_rule"
                :placeholder="t('policy.dirNameRulePlaceholder')"
                class="w-full"
              />
              <p class="text-xs text-muted mt-1">
                {{ t('policy.namingVarsHint') }}
              </p>
              <div class="flex flex-wrap gap-1 mt-1">
                <code
                  v-for="v in namingVars"
                  :key="v"
                  class="text-xs bg-[var(--ui-bg-muted)] px-1.5 py-0.5 rounded cursor-pointer hover:bg-[var(--ui-bg-elevated)]"
                  @click="formData.dir_name_rule += v"
                >{{ v }}</code>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('policy.fileNameRule') }}</label>
              <UInput
                v-model="formData.file_name_rule"
                :placeholder="t('policy.fileNameRulePlaceholder')"
                class="w-full"
              />
              <p class="text-xs text-muted mt-1">
                {{ t('policy.namingVarsHint') }}
              </p>
              <div class="flex flex-wrap gap-1 mt-1">
                <code
                  v-for="v in namingVars"
                  :key="v"
                  class="text-xs bg-[var(--ui-bg-muted)] px-1.5 py-0.5 rounded cursor-pointer hover:bg-[var(--ui-bg-elevated)]"
                  @click="formData.file_name_rule += v"
                >{{ v }}</code>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('policy.fileType') }}</label>
              <UInput
                v-model="formData.file_type"
                :placeholder="t('policy.fileTypePlaceholder')"
                class="w-full"
              />
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('policy.mimetype') }}</label>
              <UInput
                v-model="formData.mimetype"
                :placeholder="t('policy.mimetypePlaceholder')"
                class="w-full"
              />
            </div>
            <div>
              <USwitch
                v-model="formData.is_origin_link_enable"
                :label="t('policy.isOriginLinkEnable')"
                :description="t('policy.isOriginLinkEnableDesc')"
              />
            </div>
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
        :disabled="!formData.name.trim() || editLoading"
        @click="submitForm"
      />
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="deleteModalOpen"
    :title="t('policy.deletePolicy')"
    description=" "
    :ui="{ footer: 'justify-end', description: 'hidden' }"
  >
    <template #body>
      <p class="text-sm">
        {{ t('policy.deleteConfirm', { name: deletingPolicy?.name }) }}
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
