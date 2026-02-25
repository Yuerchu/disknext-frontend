<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import type { TabsItem, DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { AxiosError } from 'axios'
import { useAdminStore } from '../stores/admin'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'
import api from '../utils/api'

const UBadge = resolveComponent('UBadge')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

const router = useRouter()
const toast = useToast()
const admin = useAdminStore()
const user = useUserStore()
const auth = useAuthStore()
const { t, locale } = useI18n()

interface WebDAVAccount {
  id: number
  name: string
  root: string
  readonly: boolean
  use_proxy: boolean
  created_at: string
  updated_at: string
}

const accounts = ref<WebDAVAccount[]>([])
const loading = ref(true)

// Form modal
const formModalOpen = ref(false)
const editingAccount = ref<WebDAVAccount | null>(null)
const submitting = ref(false)
const formData = ref({
  name: '',
  password: '',
  root: '/',
  readonly: false,
  use_proxy: false,
})

const isEditing = computed(() => !!editingAccount.value)

// Folder picker
const folderPickerOpen = ref(false)

function onFolderSelected(selected: { id: string, name: string, path: string }[]) {
  if (!selected.length) return
  const path = selected[0].path
  formData.value.root = path ? '/' + path : '/'
  folderPickerOpen.value = false
}

// Delete modal
const deleteModalOpen = ref(false)
const deletingAccount = ref<WebDAVAccount | null>(null)
const deleting = ref(false)

async function fetchAccounts() {
  loading.value = true
  try {
    const { data } = await api.get<WebDAVAccount[]>('/api/v1/webdav/accounts')
    accounts.value = data
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    toast.add({
      title: t('mount.loadFailed'),
      description: err?.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function resetForm() {
  formData.value = {
    name: '',
    password: '',
    root: '/',
    readonly: false,
    use_proxy: false,
  }
}

function openCreateModal() {
  editingAccount.value = null
  resetForm()
  formModalOpen.value = true
}

function openEditModal(account: WebDAVAccount) {
  editingAccount.value = account
  formData.value = {
    name: account.name,
    password: '',
    root: account.root,
    readonly: account.readonly,
    use_proxy: account.use_proxy,
  }
  formModalOpen.value = true
}

async function submitForm() {
  submitting.value = true
  try {
    if (isEditing.value) {
      const body: Record<string, unknown> = {
        root: formData.value.root,
        readonly: formData.value.readonly,
        use_proxy: formData.value.use_proxy,
      }
      if (formData.value.password) {
        body.password = formData.value.password
      }
      await api.patch(`/api/v1/webdav/accounts/${editingAccount.value!.id}`, body)
      toast.add({ title: t('mount.updateSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    } else {
      await api.post('/api/v1/webdav/accounts', {
        name: formData.value.name,
        password: formData.value.password,
        root: formData.value.root,
        readonly: formData.value.readonly,
        use_proxy: formData.value.use_proxy,
      })
      toast.add({ title: t('mount.createSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    }
    formModalOpen.value = false
    fetchAccounts()
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    toast.add({
      title: isEditing.value ? t('mount.updateFailed') : t('mount.createFailed'),
      description: err?.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

function openDeleteModal(account: WebDAVAccount) {
  deletingAccount.value = account
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingAccount.value) return
  deleting.value = true
  try {
    await api.delete(`/api/v1/webdav/accounts/${deletingAccount.value.id}`)
    toast.add({ title: t('mount.deleteSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    deleteModalOpen.value = false
    fetchAccounts()
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    toast.add({
      title: t('mount.deleteFailed'),
      description: err?.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

const siteHost = computed(() => window.location.origin)
const embyEndpoint = computed(() => `${siteHost.value}/emby`)
const subsonicEndpoint = computed(() => `${siteHost.value}/subsonic`)

function copyText(text: string) {
  navigator.clipboard.writeText(text)
  toast.add({ title: t('mount.copied'), icon: 'i-lucide-check-circle', color: 'success' })
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

const tabItems: TabsItem[] = [
  { label: t('mount.clientTab'), icon: 'i-lucide-monitor-smartphone', slot: 'client' as const },
  { label: t('mount.webdavTab'), icon: 'i-lucide-hard-drive', slot: 'webdav' as const },
  { label: t('mount.cliTab'), icon: 'i-lucide-terminal', slot: 'cli' as const },
  { label: t('mount.embyTab'), icon: 'i-lucide-tv', slot: 'emby' as const },
  { label: t('mount.subsonicTab'), icon: 'i-lucide-music', slot: 'subsonic' as const },
]

const columns = computed<TableColumn<WebDAVAccount>[]>(() => [
  {
    accessorKey: 'name',
    header: t('mount.accountName'),
  },
  {
    accessorKey: 'root',
    header: t('mount.root'),
    cell: ({ row }) => h('span', { class: 'font-mono text-muted' }, row.original.root),
  },
  {
    accessorKey: 'readonly',
    header: t('mount.readonly'),
    cell: ({ row }) => h(UBadge, {
      label: row.original.readonly ? t('common.enabled') : t('common.disabled'),
      color: row.original.readonly ? 'warning' : 'neutral',
      variant: 'subtle',
      size: 'sm'
    }),
  },
  {
    accessorKey: 'use_proxy',
    header: t('mount.useProxy'),
    cell: ({ row }) => h(UBadge, {
      label: row.original.use_proxy ? t('common.enabled') : t('common.disabled'),
      color: row.original.use_proxy ? 'info' : 'neutral',
      variant: 'subtle',
      size: 'sm'
    }),
  },
  {
    accessorKey: 'created_at',
    header: t('mount.createdAt'),
    cell: ({ row }) => formatDate(row.original.created_at),
    meta: { class: { td: 'text-muted' } }
  },
  {
    id: 'actions',
    header: t('mount.actions'),
    cell: ({ row }) => {
      const items: DropdownMenuItem[][] = [
        [
          {
            label: t('mount.editAccount'),
            icon: 'i-lucide-pencil',
            onSelect() { openEditModal(row.original) }
          }
        ],
        [
          {
            label: t('mount.deleteAccount'),
            icon: 'i-lucide-trash-2',
            color: 'error' as const,
            onSelect() { openDeleteModal(row.original) }
          }
        ]
      ]
      return h(UDropdownMenu, { items }, {
        default: () => h(UButton, {
          icon: 'i-lucide-ellipsis-vertical',
          color: 'neutral',
          variant: 'ghost',
          size: 'xs'
        })
      })
    }
  }
])

onMounted(() => {
  admin.checkAdmin()
  fetchAccounts()
})

const userMenuItems = computed<DropdownMenuItem[][]>(() => {
  const header: DropdownMenuItem[] = [
    {
      label: `${user.nickname}${admin.isAdmin ? ' ' + t('user.admin') : ''}`,
      description: user.email ?? '',
      type: 'label'
    }
  ]

  const actions: DropdownMenuItem[] = []
  if (admin.isAdmin) {
    actions.push({
      label: t('user.adminPanel'),
      icon: 'i-lucide-shield',
      onSelect() { router.push('/admin') }
    })
  }
  actions.push({
    label: t('user.settingsAndAbout'),
    icon: 'i-lucide-settings',
    onSelect() { router.push('/settings') }
  })
  actions.push({
    label: t('user.language'),
    icon: 'i-lucide-languages',
    children: [
      { label: '简体中文', onSelect() { setLocale('zh-CN') } },
      { label: 'English', onSelect() { setLocale('en') } },
      { label: '繁體中文', onSelect() { setLocale('zh-TW') } }
    ]
  })

  const logout: DropdownMenuItem[] = [
    {
      label: t('user.logout'),
      icon: 'i-lucide-log-out',
      color: 'error',
      onSelect() {
        auth.logout()
        user.clear()
        router.push('/session')
      }
    }
  ]

  return [header, actions, logout]
})
</script>

<template>
  <UDashboardGroup>
    <AppSidebar />

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <UDashboardSidebarCollapse />
            <span class="text-sm font-semibold">{{ t('mount.title') }}</span>
          </template>

          <template #right>
            <UColorModeButton />
            <UDropdownMenu
              :items="userMenuItems"
              :content="{ align: 'end' }"
            >
              <UAvatar
                :src="user.avatarUrl(64)"
                :alt="user.nickname"
                size="sm"
              />
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-6 max-w-4xl">
          <UTabs
            :items="tabItems"
            variant="link"
            class="w-full"
          >
            <template #client>
              <div class="flex items-center justify-center py-24">
                <UEmpty
                  icon="i-lucide-construction"
                  :title="t('admin.comingSoon')"
                  :description="t('admin.comingSoonDesc')"
                />
              </div>
            </template>

            <template #webdav>
              <div class="space-y-4 pt-4">
                <div class="flex items-center justify-between">
                  <p class="text-sm text-muted">
                    {{ t('mount.webdavDesc') }}
                  </p>
                  <div class="flex items-center gap-2 shrink-0 ml-4">
                    <UButton
                      icon="i-lucide-refresh-cw"
                      color="neutral"
                      variant="ghost"
                      @click="fetchAccounts"
                    />
                    <UButton
                      :label="t('mount.createAccount')"
                      icon="i-lucide-plus"
                      @click="openCreateModal"
                    />
                  </div>
                </div>

                <div
                  v-if="loading"
                  class="flex justify-center py-12"
                >
                  <UIcon
                    name="i-lucide-loader-2"
                    class="size-8 animate-spin text-muted"
                  />
                </div>

                <div
                  v-else-if="accounts.length === 0"
                  class="text-center py-12 text-muted"
                >
                  <UIcon
                    name="i-lucide-hard-drive"
                    class="size-12 mx-auto mb-4 opacity-50"
                  />
                  <p>{{ t('mount.empty') }}</p>
                </div>

                <UTable
                  v-else
                  :data="accounts"
                  :columns="columns"
                />
              </div>
            </template>

            <template #cli>
              <div class="flex items-center justify-center py-24">
                <UEmpty
                  icon="i-lucide-construction"
                  :title="t('admin.comingSoon')"
                  :description="t('admin.comingSoonDesc')"
                />
              </div>
            </template>

            <template #emby>
              <div class="space-y-4 pt-4">
                <UAlert
                  color="warning"
                  variant="subtle"
                  icon="i-lucide-triangle-alert"
                  :description="t('mount.limitedWarning')"
                />

                <p class="text-sm text-muted">
                  {{ t('mount.embyDesc') }}
                </p>

                <div class="space-y-3">
                  <UFormField :label="t('mount.endpoint')">
                    <div class="flex gap-2 w-full">
                      <UInput
                        :model-value="embyEndpoint"
                        readonly
                        class="flex-1 font-mono"
                      />
                      <UButton
                        icon="i-lucide-copy"
                        color="neutral"
                        variant="outline"
                        @click="copyText(embyEndpoint)"
                      />
                    </div>
                  </UFormField>

                  <UFormField :label="t('mount.account')">
                    <div class="flex gap-2 w-full">
                      <UInput
                        :model-value="user.email ?? ''"
                        readonly
                        class="flex-1"
                      />
                      <UButton
                        icon="i-lucide-copy"
                        color="neutral"
                        variant="outline"
                        @click="copyText(user.email ?? '')"
                      />
                    </div>
                  </UFormField>
                </div>
              </div>
            </template>

            <template #subsonic>
              <div class="space-y-4 pt-4">
                <UAlert
                  color="warning"
                  variant="subtle"
                  icon="i-lucide-triangle-alert"
                  :description="t('mount.limitedWarning')"
                />

                <p class="text-sm text-muted">
                  {{ t('mount.subsonicDesc') }}
                </p>

                <div class="space-y-3">
                  <UFormField :label="t('mount.endpoint')">
                    <div class="flex gap-2 w-full">
                      <UInput
                        :model-value="subsonicEndpoint"
                        readonly
                        class="flex-1 font-mono"
                      />
                      <UButton
                        icon="i-lucide-copy"
                        color="neutral"
                        variant="outline"
                        @click="copyText(subsonicEndpoint)"
                      />
                    </div>
                  </UFormField>

                  <UFormField :label="t('mount.account')">
                    <div class="flex gap-2 w-full">
                      <UInput
                        :model-value="user.email ?? ''"
                        readonly
                        class="flex-1"
                      />
                      <UButton
                        icon="i-lucide-copy"
                        color="neutral"
                        variant="outline"
                        @click="copyText(user.email ?? '')"
                      />
                    </div>
                  </UFormField>
                </div>
              </div>
            </template>
          </UTabs>
        </div>
      </template>
    </UDashboardPanel>

    <!-- Create/Edit Modal -->
    <UModal
      v-model:open="formModalOpen"
      :title="isEditing ? t('mount.editAccount') : t('mount.createAccount')"
      description=" "
      :ui="{ footer: 'justify-end', description: 'hidden' }"
    >
      <template #body>
        <div class="flex flex-col gap-4">
          <UFormField :label="t('mount.accountName')">
            <UInput
              v-model="formData.name"
              :placeholder="t('mount.accountNamePlaceholder')"
              :disabled="isEditing"
              class="w-full"
            />
          </UFormField>

          <UFormField
            :label="t('mount.password')"
            :hint="isEditing ? t('mount.passwordEditHint') : undefined"
          >
            <UInput
              v-model="formData.password"
              type="password"
              :placeholder="t('mount.passwordPlaceholder')"
              class="w-full"
            />
          </UFormField>

          <UFormField :label="t('mount.root')">
            <div class="flex gap-2 w-full">
              <UInput
                v-model="formData.root"
                :placeholder="t('mount.rootPlaceholder')"
                class="flex-1 font-mono"
              />
              <UButton
                icon="i-lucide-folder-open"
                color="neutral"
                variant="outline"
                @click="folderPickerOpen = true"
              />
            </div>
          </UFormField>

          <UFormField :label="t('mount.readonly')">
            <div class="flex items-center gap-2">
              <USwitch v-model="formData.readonly" />
              <span class="text-sm text-muted">{{ t('mount.readonlyDesc') }}</span>
            </div>
          </UFormField>

          <UFormField :label="t('mount.useProxy')">
            <div class="flex items-center gap-2">
              <USwitch v-model="formData.use_proxy" />
              <span class="text-sm text-muted">{{ t('mount.useProxyDesc') }}</span>
            </div>
          </UFormField>
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
          :disabled="!formData.name.trim() || (!isEditing && !formData.password)"
          @click="submitForm"
        />
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal
      v-model:open="deleteModalOpen"
      :title="t('mount.deleteAccount')"
      description=" "
      :ui="{ footer: 'justify-end', description: 'hidden' }"
    >
      <template #body>
        <p class="text-sm">
          {{ t('mount.deleteConfirm', { name: deletingAccount?.name }) }}
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
    <!-- Folder Picker -->
    <ObjectPicker
      v-model:open="folderPickerOpen"
      :title="t('mount.root')"
      type="folder"
      @confirm="onFolderSelected"
    />
  </UDashboardGroup>
</template>
