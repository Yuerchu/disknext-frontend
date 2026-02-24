<script setup lang="ts">
import { h, ref, computed, onMounted, watch, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, DropdownMenuItem } from '@nuxt/ui'
import type { AxiosError } from 'axios'
import api from '../../../utils/api'

type ApiErrorResponse = { detail?: string }

const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')

const { t } = useI18n()
const toast = useToast()

interface FileApp {
  id: string
  name: string
  app_key: string
  type: 'builtin' | 'iframe' | 'wopi'
  icon: string
  description: string
  is_enabled: boolean
  is_restricted: boolean
  iframe_url_template: string
  wopi_discovery_url: string
  wopi_editor_url_template: string
  extensions: string[]
  allowed_group_ids: string[]
}

interface FileAppListResponse {
  apps: FileApp[]
  total: number
}

interface DiscoveryResult {
  discovered_extensions: { extension: string; action_url: string }[]
  app_names: string[]
  applied_count: number
}

interface SimpleGroup {
  id: string
  name: string
}

// List state
const apps = ref<FileApp[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 20
const orderBy = ref('created_at')
const orderDesc = ref(true)

const orderOptions = [
  { label: t('fileApp.orderCreatedAt'), value: 'created_at' },
  { label: t('fileApp.orderUpdatedAt'), value: 'updated_at' },
  { label: t('fileApp.orderName'), value: 'name' }
]

// Group list for restricted group select
const groupList = ref<SimpleGroup[]>([])
const groupsLoading = ref(false)

async function fetchGroupList() {
  groupsLoading.value = true
  try {
    const { data } = await api.get<{ count: number; items: SimpleGroup[] }>('/api/v1/admin/group/', {
      params: { offset: 0, limit: 100 }
    })
    groupList.value = data.items ?? []
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('group.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    groupsLoading.value = false
  }
}

async function fetchApps() {
  loading.value = true
  try {
    const { data } = await api.get<FileAppListResponse>('/api/v1/admin/file-app/list', {
      params: {
        offset: (page.value - 1) * pageSize,
        limit: pageSize,
        order: orderBy.value,
        desc: orderDesc.value
      }
    })
    apps.value = data.apps
    total.value = data.total
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('fileApp.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

watch(page, () => fetchApps())
watch([orderBy, orderDesc], () => {
  page.value = 1
  fetchApps()
})

onMounted(() => {
  fetchGroupList()
  fetchApps()
})

// Type badge config
const typeConfig: Record<string, { color: 'primary' | 'info' | 'warning'; key: string }> = {
  builtin: { color: 'primary', key: 'fileApp.typeBuiltin' },
  iframe: { color: 'info', key: 'fileApp.typeIframe' },
  wopi: { color: 'warning', key: 'fileApp.typeWopi' }
}

// Table columns
function getDropdownItems(app: FileApp): DropdownMenuItem[][] {
  return [
    [
      {
        label: t('common.edit'),
        icon: 'i-lucide-pencil',
        onSelect() { openEditModal(app) }
      }
    ],
    [
      {
        label: t('common.delete'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect() { openDeleteModal(app) }
      }
    ]
  ]
}

const columns = computed<TableColumn<FileApp>[]>(() => [
  {
    id: 'name',
    header: t('fileApp.name'),
    cell: ({ row }) => {
      return h('div', { class: 'min-w-0' }, [
        h('div', { class: 'font-medium truncate' }, row.original.name),
        h('div', { class: 'text-xs text-muted truncate' }, row.original.app_key)
      ])
    }
  },
  {
    accessorKey: 'type',
    header: t('fileApp.type'),
    cell: ({ row }) => {
      const cfg = typeConfig[row.original.type]
      if (!cfg) return row.original.type
      return h(UBadge, { color: cfg.color, variant: 'subtle', size: 'sm' }, () => t(cfg.key))
    }
  },
  {
    id: 'is_enabled',
    header: t('fileApp.enabled'),
    cell: ({ row }) => {
      return h(UBadge, {
        color: row.original.is_enabled ? 'success' : 'neutral',
        variant: 'subtle',
        size: 'sm'
      }, () => row.original.is_enabled ? t('fileApp.statusEnabled') : t('fileApp.statusDisabled'))
    }
  },
  {
    id: 'is_restricted',
    header: t('fileApp.restricted'),
    cell: ({ row }) => {
      return h(UBadge, {
        color: row.original.is_restricted ? 'warning' : 'neutral',
        variant: 'subtle',
        size: 'sm'
      }, () => row.original.is_restricted ? t('fileApp.statusRestricted') : t('fileApp.statusPublic'))
    }
  },
  {
    id: 'extensions',
    header: t('fileApp.extensions'),
    cell: ({ row }) => {
      const exts = row.original.extensions
      const badges: ReturnType<typeof h>[] = []
      const show = exts.slice(0, 3)
      for (const ext of show) {
        badges.push(h(UBadge, { color: 'neutral', variant: 'subtle', size: 'sm' }, () => `.${ext}`))
      }
      if (exts.length > 3) {
        badges.push(h('span', { class: 'text-xs text-muted' }, `+${exts.length - 3}`))
      }
      return h('div', { class: 'flex items-center gap-1 flex-wrap' }, badges)
    }
  },
  {
    id: 'actions',
    header: t('fileApp.actions'),
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
const editingApp = ref<FileApp | null>(null)
const submitting = ref(false)

const typeOptions = [
  { label: t('fileApp.typeBuiltin'), value: 'builtin' },
  { label: t('fileApp.typeIframe'), value: 'iframe' },
  { label: t('fileApp.typeWopi'), value: 'wopi' }
]

const formData = ref({
  name: '',
  app_key: '',
  type: 'builtin' as string,
  icon: '',
  description: '',
  is_enabled: true,
  is_restricted: false,
  iframe_url_template: '',
  wopi_discovery_url: '',
  wopi_editor_url_template: '',
  extensionsText: '',
  allowed_group_ids: [] as string[]
})

const isEditing = computed(() => !!editingApp.value)

const selectedGroups = computed({
  get: () => groupList.value.filter(g => formData.value.allowed_group_ids.includes(g.id)),
  set: (v: SimpleGroup[]) => { formData.value.allowed_group_ids = v.map(g => g.id) }
})

// When is_enabled is turned off, reset is_restricted and clear groups
watch(() => formData.value.is_enabled, (enabled) => {
  if (!enabled) {
    formData.value.is_restricted = false
    formData.value.allowed_group_ids = []
  }
})

// When is_restricted is turned off, clear groups
watch(() => formData.value.is_restricted, (restricted) => {
  if (!restricted) {
    formData.value.allowed_group_ids = []
  }
})

function resetForm() {
  formData.value = {
    name: '',
    app_key: '',
    type: 'builtin',
    icon: '',
    description: '',
    is_enabled: true,
    is_restricted: false,
    iframe_url_template: '',
    wopi_discovery_url: '',
    wopi_editor_url_template: '',
    extensionsText: '',
    allowed_group_ids: []
  }
}

function openCreateModal() {
  editingApp.value = null
  resetForm()
  discoveryResult.value = null
  fetchGroupList()
  formModalOpen.value = true
}

function openEditModal(app: FileApp) {
  editingApp.value = app
  discoveryResult.value = null
  fetchGroupList()
  formData.value = {
    name: app.name,
    app_key: app.app_key,
    type: app.type,
    icon: app.icon || '',
    description: app.description || '',
    is_enabled: app.is_enabled,
    is_restricted: app.is_restricted,
    iframe_url_template: app.iframe_url_template || '',
    wopi_discovery_url: app.wopi_discovery_url || '',
    wopi_editor_url_template: app.wopi_editor_url_template || '',
    extensionsText: app.extensions.join(', '),
    allowed_group_ids: [...app.allowed_group_ids]
  }
  formModalOpen.value = true
}

function parseExtensions(text: string): string[] {
  return text
    .split(',')
    .map(s => s.trim().toLowerCase().replace(/^\./, ''))
    .filter(Boolean)
}

async function submitForm() {
  if (!formData.value.name.trim() || !formData.value.app_key.trim()) return
  submitting.value = true

  const extensions = parseExtensions(formData.value.extensionsText)

  try {
    if (isEditing.value) {
      // Step 1: PATCH basic fields
      await api.patch(`/api/v1/admin/file-app/${editingApp.value!.id}`, {
        name: formData.value.name,
        app_key: formData.value.app_key,
        type: formData.value.type,
        icon: formData.value.icon || null,
        description: formData.value.description || null,
        is_enabled: formData.value.is_enabled,
        is_restricted: formData.value.is_restricted,
        iframe_url_template: formData.value.iframe_url_template || null,
        wopi_discovery_url: formData.value.wopi_discovery_url || null,
        wopi_editor_url_template: formData.value.wopi_editor_url_template || null
      })
      // Step 2: PUT extensions
      await api.put(`/api/v1/admin/file-app/${editingApp.value!.id}/extensions`, { extensions })
      // Step 3: PUT groups
      await api.put(`/api/v1/admin/file-app/${editingApp.value!.id}/groups`, { group_ids: formData.value.allowed_group_ids })
      toast.add({ title: t('fileApp.updateSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    } else {
      await api.post('/api/v1/admin/file-app/', {
        name: formData.value.name,
        app_key: formData.value.app_key,
        type: formData.value.type,
        icon: formData.value.icon || null,
        description: formData.value.description || null,
        is_enabled: formData.value.is_enabled,
        is_restricted: formData.value.is_restricted,
        iframe_url_template: formData.value.iframe_url_template || null,
        wopi_discovery_url: formData.value.wopi_discovery_url || null,
        wopi_editor_url_template: formData.value.wopi_editor_url_template || null,
        extensions,
        allowed_group_ids: formData.value.allowed_group_ids
      })
      toast.add({ title: t('fileApp.createSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    }
    formModalOpen.value = false
    fetchApps()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: isEditing.value ? t('fileApp.updateFailed') : t('fileApp.createFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

// WOPI Discovery
const discovering = ref(false)
const discoveryResult = ref<DiscoveryResult | null>(null)

async function discoverWopi() {
  if (!editingApp.value) return
  discovering.value = true
  discoveryResult.value = null
  try {
    const { data } = await api.post<DiscoveryResult>(`/api/v1/admin/file-app/${editingApp.value.id}/discover`)
    discoveryResult.value = data
    formData.value.extensionsText = data.discovered_extensions.map(e => e.extension).join(', ')
    toast.add({ title: t('fileApp.wopiDiscoverSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    fetchApps()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('fileApp.wopiDiscoverFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    discovering.value = false
  }
}

// Delete Modal
const deleteModalOpen = ref(false)
const deletingApp = ref<FileApp | null>(null)
const deleting = ref(false)

function openDeleteModal(app: FileApp) {
  deletingApp.value = app
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingApp.value) return
  deleting.value = true
  try {
    await api.delete(`/api/v1/admin/file-app/${deletingApp.value.id}`)
    toast.add({ title: t('fileApp.deleteSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    deleteModalOpen.value = false
    fetchApps()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('fileApp.deleteFailed'),
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
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        {{ t('fileApp.title') }}
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
          @click="fetchApps"
        />
        <UButton
          :label="t('fileApp.createApp')"
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
        :data="apps"
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
    :title="isEditing ? t('fileApp.editApp') : t('fileApp.createApp')"
    description=" "
    :ui="{ footer: 'justify-end', content: 'sm:max-w-2xl', description: 'hidden' }"
  >
    <template #body>
      <div class="space-y-6">
        <!-- Basic Info -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted">
            {{ t('fileApp.basicInfo') }}
          </h3>
          <div class="space-y-3">
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('fileApp.name') }}</label>
                <UInput
                  v-model="formData.name"
                  :placeholder="t('fileApp.namePlaceholder')"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('fileApp.appKey') }}</label>
                <UInput
                  v-model="formData.app_key"
                  :placeholder="t('fileApp.appKeyPlaceholder')"
                  class="w-full"
                />
              </div>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('fileApp.type') }}</label>
                <USelect
                  v-model="formData.type"
                  :items="typeOptions"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('fileApp.icon') }}</label>
                <UInput
                  v-model="formData.icon"
                  :placeholder="t('fileApp.iconPlaceholder')"
                  class="w-full"
                />
              </div>
            </div>
            <div>
              <label class="text-sm font-medium mb-1 block">{{ t('fileApp.description') }}</label>
              <UInput
                v-model="formData.description"
                :placeholder="t('fileApp.descriptionPlaceholder')"
                class="w-full"
              />
            </div>
          </div>
        </div>

        <USeparator />

        <!-- App Settings -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted">
            {{ t('fileApp.appSettings') }}
          </h3>
          <div class="space-y-4">
            <USwitch
              v-model="formData.is_enabled"
              :label="t('fileApp.isEnabled')"
              :description="t('fileApp.isEnabledDesc')"
            />
            <USwitch
              v-model="formData.is_restricted"
              :disabled="!formData.is_enabled"
              :label="t('fileApp.isRestricted')"
              :description="t('fileApp.isRestrictedDesc')"
            />
          </div>
        </div>

        <USeparator />

        <!-- Conditional Fields -->
        <div
          v-if="formData.type === 'iframe' || formData.type === 'wopi'"
          class="space-y-4"
        >
          <h3 class="text-sm font-semibold text-muted">
            {{ t('fileApp.typeSettings') }}
          </h3>
          <div class="space-y-3">
            <div v-if="formData.type === 'iframe'">
              <label class="text-sm font-medium mb-1 block">{{ t('fileApp.iframeUrlTemplate') }}</label>
              <UInput
                v-model="formData.iframe_url_template"
                :placeholder="t('fileApp.iframeUrlTemplatePlaceholder')"
                class="w-full"
              />
              <p class="text-xs text-muted mt-1">
                {{ t('fileApp.iframeUrlTemplateHint') }}
              </p>
            </div>
            <template v-if="formData.type === 'wopi'">
              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('fileApp.wopiDiscoveryUrl') }}</label>
                <div class="flex gap-2">
                  <UInput
                    v-model="formData.wopi_discovery_url"
                    :placeholder="t('fileApp.wopiDiscoveryUrlPlaceholder')"
                    class="flex-1"
                  />
                  <UTooltip
                    v-if="isEditing"
                    :text="!formData.wopi_discovery_url.trim() ? t('fileApp.wopiDiscoveryUrlPlaceholder') : t('fileApp.wopiDiscoverHint')"
                  >
                    <UButton
                      icon="i-lucide-radar"
                      :label="t('fileApp.wopiDiscover')"
                      color="neutral"
                      variant="outline"
                      :loading="discovering"
                      :disabled="!formData.wopi_discovery_url.trim()"
                      @click="discoverWopi"
                    />
                  </UTooltip>
                  <UButton
                    v-if="!isEditing && formData.wopi_discovery_url.trim()"
                    :label="t('fileApp.wopiDiscoverNeedSave')"
                    color="neutral"
                    variant="ghost"
                    size="xs"
                    disabled
                  />
                </div>
              </div>

              <!-- Discovery Result -->
              <div
                v-if="discoveryResult"
                class="rounded-lg border border-default bg-elevated/50 p-3 space-y-2"
              >
                <div class="flex items-center gap-2 text-sm font-medium text-success">
                  <UIcon
                    name="i-lucide-check-circle"
                    class="size-4"
                  />
                  {{ t('fileApp.wopiDiscoverSuccess') }}
                </div>
                <p
                  v-if="discoveryResult.app_names.length"
                  class="text-sm text-muted"
                >
                  {{ t('fileApp.wopiDiscoverApps', { names: discoveryResult.app_names.join(', ') }) }}
                </p>
                <p class="text-sm text-muted">
                  {{ t('fileApp.wopiDiscoverCount', { count: discoveryResult.applied_count }) }}
                </p>
              </div>

              <div>
                <label class="text-sm font-medium mb-1 block">{{ t('fileApp.wopiEditorUrlTemplate') }}</label>
                <UInput
                  v-model="formData.wopi_editor_url_template"
                  :placeholder="t('fileApp.wopiEditorUrlTemplatePlaceholder')"
                  class="w-full"
                />
                <p class="text-xs text-muted mt-1">
                  {{ t('fileApp.wopiEditorUrlTemplateHint') }}
                </p>
              </div>
            </template>
          </div>

          <USeparator />
        </div>

        <!-- Extensions -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-muted">
            {{ t('fileApp.extensions') }}
          </h3>
          <div>
            <UInput
              v-model="formData.extensionsText"
              :placeholder="t('fileApp.extensionsPlaceholder')"
              class="w-full"
            />
            <p class="text-xs text-muted mt-1">
              {{ t('fileApp.extensionsHint') }}
            </p>
          </div>
        </div>

        <!-- Group Restriction -->
        <template v-if="formData.is_restricted">
          <USeparator />

          <div class="space-y-4">
            <h3 class="text-sm font-semibold text-muted">
              {{ t('fileApp.groupRestriction') }}
            </h3>
            <div>
              <USelectMenu
                v-model="selectedGroups"
                :items="groupList"
                by="id"
                label-key="name"
                multiple
                :loading="groupsLoading"
                :placeholder="t('fileApp.selectGroups')"
                class="w-full"
              />
              <p class="text-xs text-muted mt-1">
                {{ t('fileApp.groupRestrictionHint') }}
              </p>
            </div>
          </div>
        </template>
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
        :disabled="!formData.name.trim() || !formData.app_key.trim()"
        @click="submitForm"
      />
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="deleteModalOpen"
    :title="t('fileApp.deleteApp')"
    description=" "
    :ui="{ footer: 'justify-end', description: 'hidden' }"
  >
    <template #body>
      <p class="text-sm">
        {{ t('fileApp.deleteConfirm', { name: deletingApp?.name }) }}
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
