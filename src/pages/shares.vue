<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import type { AxiosError } from 'axios'
import { useAdminStore } from '../stores/admin'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'
import api from '../utils/api'

const UBadge = resolveComponent('UBadge')
const UIcon = resolveComponent('UIcon')
const UTooltip = resolveComponent('UTooltip')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

const router = useRouter()
const toast = useToast()
const admin = useAdminStore()
const user = useUserStore()
const auth = useAuthStore()
const { t, locale } = useI18n()

interface ShareItem {
  id: string
  code: string
  object_id: string
  source_name: string | null
  views: number
  downloads: number
  remain_downloads: number | null
  expires: string | null
  preview_enabled: boolean
  score: number
  created_at: string
  is_expired: boolean
  has_password: boolean
}

interface ShareListResponse {
  count: number
  items: ShareItem[]
}

const shares = ref<ShareItem[]>([])
const total = ref(0)
const loading = ref(true)
const page = ref(1)
const pageSize = 20
const orderBy = ref('created_at')
const orderDesc = ref(true)
const searchQuery = ref('')
const debouncedSearch = ref('')
const filterExpired = ref('')

const deleteModalOpen = ref(false)
const deletingShare = ref<ShareItem | null>(null)
const deleting = ref(false)

let debounceTimer: ReturnType<typeof setTimeout> | null = null

watch(searchQuery, (val) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debouncedSearch.value = val
    page.value = 1
  }, 300)
})

watch([page, orderDesc, debouncedSearch, filterExpired], () => {
  fetchShares()
})

async function fetchShares() {
  loading.value = true
  try {
    const params: Record<string, unknown> = {
      offset: (page.value - 1) * pageSize,
      limit: pageSize,
      order: orderBy.value,
      desc: orderDesc.value,
    }
    if (debouncedSearch.value) params.keyword = debouncedSearch.value
    if (filterExpired.value) params.expired = filterExpired.value === 'true'
    const { data } = await api.get<ShareListResponse>('/api/v1/share/', { params })
    shares.value = data.items
    total.value = data.count
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    const message = err?.response?.data?.detail || t('myShares.loadFailed')
    toast.add({
      title: t('myShares.loadFailed'),
      description: message,
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
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

function copyLink(item: ShareItem) {
  const link = `${window.location.origin}/s/${item.code}`
  navigator.clipboard.writeText(link)
  toast.add({ title: t('myShares.copied'), icon: 'i-lucide-check-circle', color: 'success' })
}

function openDeleteModal(item: ShareItem) {
  deletingShare.value = item
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingShare.value) return
  deleting.value = true
  try {
    await api.delete(`/api/v1/share/${deletingShare.value.id}`)
    toast.add({ title: t('myShares.deleteSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    deleteModalOpen.value = false
    fetchShares()
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    toast.add({
      title: t('myShares.deleteFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

const expiredFilterItems = [
  { label: t('myShares.filterActive'), value: 'false' },
  { label: t('myShares.filterExpired'), value: 'true' },
]

const columns = computed<TableColumn<ShareItem>[]>(() => [
  {
    accessorKey: 'source_name',
    header: t('myShares.sourceName'),
    cell: ({ row }) => {
      const name = row.original.source_name || '-'
      return h(UTooltip, { text: name }, {
        default: () => h('span', { class: 'truncate max-w-48 inline-block align-bottom' }, name)
      })
    }
  },
  {
    accessorKey: 'is_expired',
    header: t('myShares.status'),
    cell: ({ row }) => {
      const badges = []
      badges.push(h(UBadge, {
        label: row.original.is_expired ? t('myShares.expired') : t('myShares.active'),
        color: row.original.is_expired ? 'error' : 'success',
        variant: 'subtle',
        size: 'sm'
      }))
      if (row.original.has_password) {
        badges.push(h(UIcon, { name: 'i-lucide-lock', class: 'size-4 text-muted ml-1' }))
      }
      return h('div', { class: 'flex items-center' }, badges)
    }
  },
  {
    accessorKey: 'views',
    header: t('myShares.viewsDownloads'),
    cell: ({ row }) => `${row.original.views} / ${row.original.downloads}`,
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'remain_downloads',
    header: t('myShares.downloadLimit'),
    cell: ({ row }) => row.original.remain_downloads != null
      ? String(row.original.remain_downloads)
      : t('myShares.unlimited'),
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'expires',
    header: t('myShares.expires'),
    cell: ({ row }) => row.original.expires
      ? formatDate(row.original.expires)
      : t('myShares.neverExpire'),
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'created_at',
    header: t('myShares.createdAt'),
    cell: ({ row }) => formatDate(row.original.created_at),
    meta: { class: { td: 'text-muted' } }
  },
  {
    id: 'actions',
    header: t('myShares.actions'),
    cell: ({ row }) => {
      const items: DropdownMenuItem[][] = [
        [
          {
            label: t('myShares.copyLink'),
            icon: 'i-lucide-copy',
            onSelect() { copyLink(row.original) }
          }
        ],
        [
          {
            label: t('myShares.deleteShare'),
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
  fetchShares()
})

const userMenuItems = computed<DropdownMenuItem[][]>(() => {
  const header: DropdownMenuItem[] = [
    {
      label: `${user.nickname}${admin.isAdmin ? ' ' + t('user.admin') : ''}`,
      description: user.email,
      type: 'label'
    }
  ]

  const actions: DropdownMenuItem[] = []
  if (admin.isAdmin) {
    actions.push({
      label: t('user.adminPanel'),
      icon: 'i-lucide-shield',
      onSelect() {
        router.push('/admin')
      }
    })
  }
  actions.push({
    label: t('user.settingsAndAbout'),
    icon: 'i-lucide-settings',
    onSelect() {
      router.push('/settings')
    }
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
            <span class="text-sm font-semibold">{{ t('myShares.title') }}</span>
          </template>

          <template #right>
            <UColorModeButton />
            <UDropdownMenu
              :items="userMenuItems"
              :content="{ align: 'end' }"
            >
              <UAvatar
                :alt="user.nickname"
                size="sm"
              />
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-6 space-y-6">
          <div class="flex items-center gap-3">
            <UInput
              v-model="searchQuery"
              :placeholder="t('myShares.searchPlaceholder')"
              icon="i-lucide-search"
              class="w-64"
            />
            <USelectMenu
              v-model="filterExpired"
              :items="expiredFilterItems"
              value-key="value"
              :placeholder="t('myShares.allStatus')"
              :search-input="false"
              clear
              class="w-36"
            />
            <div class="flex-1" />
            <UButton
              :icon="orderDesc ? 'i-lucide-arrow-down-wide-narrow' : 'i-lucide-arrow-up-wide-narrow'"
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
            v-else-if="shares.length === 0"
            class="text-center py-12 text-muted"
          >
            <UIcon
              name="i-lucide-share-2"
              class="size-12 mx-auto mb-4 opacity-50"
            />
            <p>{{ t('myShares.empty') }}</p>
          </div>

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
      </template>
    </UDashboardPanel>
    <UModal
      v-model:open="deleteModalOpen"
      :title="t('myShares.deleteShare')"
      description=" "
      :ui="{ footer: 'justify-end', description: 'hidden' }"
    >
      <template #body>
        <p class="text-sm">
          {{ t('myShares.deleteConfirm', { name: deletingShare?.source_name || deletingShare?.code }) }}
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
  </UDashboardGroup>
</template>
