<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import type { DropdownMenuItem, TableColumn, ContextMenuItem, TableRow } from '@nuxt/ui'

type RowSelectionState = Record<string, boolean>
import type { AxiosError } from 'axios'
import { useAdminStore } from '../stores/admin'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'
import { useAreaSelection } from '../composables/useAreaSelection'
import { getFileIcon } from '../composables/useFileOpen'
import api from '../utils/api'

const UIcon = resolveComponent('UIcon')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

const route = useRoute()
const router = useRouter()
const toast = useToast()
const admin = useAdminStore()
const user = useUserStore()
const auth = useAuthStore()
const { t, locale } = useI18n()

type ApiErrorResponse = { detail?: string }

interface CategoryItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size: number | null
  mime_type: string | null
  thumb: boolean
  created_at: string
  updated_at: string
  source_enabled: boolean
}

interface ListResponse {
  count: number
  items: CategoryItem[]
}

const items = ref<CategoryItem[]>([])
const totalCount = ref(0)
const loading = ref(true)
const currentPage = ref(1)
const pageSize = 50

const category = computed(() => (route.params.category as string) || 'image')
const categoryLabel = computed(() => {
  const key = `category.${category.value}` as const
  return t(key)
})

// Selection state
const rowSelection = ref<RowSelectionState>({})
const lastClickedIndex = ref<number | null>(null)

const selectedItems = computed(() =>
  items.value.filter(item => rowSelection.value[item.id])
)
const isSelectionMode = computed(() => selectedItems.value.length > 0)

function clearSelection() {
  rowSelection.value = {}
  lastClickedIndex.value = null
}

// Area selection (drag to select)
const listContainerRef = ref<HTMLElement | null>(null)
const areaSelectionEnabled = computed(() => !loading.value && items.value.length > 0)

function onAreaSelectionChange(indices: number[], ctrlKey: boolean, metaKey: boolean) {
  const isMac = navigator.userAgent.includes('Mac')
  const isAdditive = (ctrlKey && !isMac) || (metaKey && isMac)

  if (isAdditive) {
    const newSel = { ...rowSelection.value }
    indices.forEach(i => {
      const item = items.value[i]
      if (item) newSel[item.id] = true
    })
    rowSelection.value = newSel
  } else {
    const newSel: RowSelectionState = {}
    indices.forEach(i => {
      const item = items.value[i]
      if (item) newSel[item.id] = true
    })
    rowSelection.value = newSel
  }
}

const areaSelection = useAreaSelection(
  listContainerRef,
  computed(() => items.value.length),
  {
    enabled: areaSelectionEnabled,
    tbodySelector: '.category-list-tbody',
    onSelectionChange: onAreaSelectionChange
  }
)

async function fetchFiles() {
  clearSelection()
  loading.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize
    const { data } = await api.get<ListResponse>(`/api/v1/category/${category.value}`, {
      params: { offset, limit: pageSize, desc: true, order: 'updated_at' }
    })
    items.value = data.items
    totalCount.value = data.count
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('category.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

const totalPages = computed(() => Math.ceil(totalCount.value / pageSize))

function onPageChange(page: number) {
  currentPage.value = page
  fetchFiles()
}

function formatSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return '-'
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

// Table meta for selected row styling
const tableMeta = computed(() => ({
  class: {
    tr: (row: { getIsSelected: () => boolean }) => {
      if (row.getIsSelected()) return 'bg-primary/10'
      return ''
    }
  }
}))

const columns = computed<TableColumn<CategoryItem>[]>(() => [
  {
    id: 'select',
    header: ({ table }) => h(UCheckbox, {
      'modelValue': table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
      'aria-label': t('selection.selectAll')
    }),
    cell: ({ row }) => h(UCheckbox, {
      'modelValue': row.getIsSelected(),
      'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
      'onClick': (e: Event) => e.stopPropagation(),
      'aria-label': t('selection.selectAll')
    }),
    enableSorting: false,
    enableHiding: false,
    meta: { class: { th: 'w-10', td: 'w-10' } }
  },
  {
    accessorKey: 'name',
    header: t('category.fileName'),
    cell: ({ row }) => {
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UIcon, { name: getFileIcon(row.original.name, false), class: 'size-5 shrink-0 text-muted' }),
        h('span', {}, row.original.name)
      ])
    }
  },
  {
    accessorKey: 'size',
    header: t('category.size'),
    cell: ({ row }) => formatSize(row.original.size),
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'updated_at',
    header: t('category.updatedAt'),
    cell: ({ row }) => formatDate(row.original.updated_at),
    meta: { class: { td: 'text-muted' } }
  },
  {
    id: 'actions',
    header: t('category.actions'),
    cell: ({ row }) => {
      const menuItems: DropdownMenuItem[][] = [
        [
          {
            label: t('common.download'),
            icon: 'i-lucide-download',
            onSelect() {
              window.open(`/api/v1/download/${row.original.id}`, '_blank')
            }
          }
        ]
      ]
      return h(UDropdownMenu, { items: menuItems }, {
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

// Context menu
const contextItems = ref<ContextMenuItem[][]>([])

function getEmptyAreaItems(): ContextMenuItem[][] {
  return [[
    { label: t('common.refresh'), icon: 'i-lucide-refresh-cw', onSelect() { fetchFiles() } }
  ]]
}

function getFileItemMenu(item: CategoryItem): ContextMenuItem[][] {
  return [
    [{
      label: t('common.download'),
      icon: 'i-lucide-download',
      onSelect() {
        window.open(`/api/v1/download/${item.id}`, '_blank')
      }
    }]
  ]
}

function resetContextMenu() {
  contextItems.value = getEmptyAreaItems()
}

function onRowContextMenu(_e: Event, row: TableRow<CategoryItem>) {
  if (rowSelection.value[row.original.id] && selectedItems.value.length > 1) {
    contextItems.value = getEmptyAreaItems()
    return
  }
  if (selectedItems.value.length > 0) {
    clearSelection()
  }
  contextItems.value = getFileItemMenu(row.original)
}

// Row select handler
function onRowSelect(e: Event, row: { original: CategoryItem; getIsSelected: () => boolean; toggleSelected: (v: boolean) => void }) {
  const mouseEvent = e as MouseEvent
  const isMac = navigator.userAgent.includes('Mac')
  const ctrlPressed = (mouseEvent.ctrlKey && !isMac) || (mouseEvent.metaKey && isMac)
  const shiftPressed = mouseEvent.shiftKey

  if (ctrlPressed) {
    row.toggleSelected(!row.getIsSelected())
    lastClickedIndex.value = items.value.findIndex(o => o.id === row.original.id)
    return
  }

  if (shiftPressed) {
    const currentIndex = items.value.findIndex(o => o.id === row.original.id)
    if (currentIndex >= 0 && lastClickedIndex.value !== null) {
      const start = Math.min(lastClickedIndex.value, currentIndex)
      const end = Math.max(lastClickedIndex.value, currentIndex)
      const newSel: RowSelectionState = {}
      for (let i = start; i <= end; i++) {
        newSel[items.value[i].id] = true
      }
      rowSelection.value = newSel
    } else if (currentIndex >= 0) {
      row.toggleSelected(!row.getIsSelected())
      lastClickedIndex.value = currentIndex
    }
    return
  }

  // Normal click: toggle selection
  if (isSelectionMode.value) {
    row.toggleSelected(!row.getIsSelected())
    lastClickedIndex.value = items.value.findIndex(o => o.id === row.original.id)
  }
}

// Keyboard shortcuts
function handleKeydown(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  if (e.key === 'Escape' && isSelectionMode.value) {
    clearSelection()
    e.preventDefault()
  }

  if ((e.ctrlKey || e.metaKey) && e.key === 'a' && items.value.length > 0) {
    e.preventDefault()
    const newSel: RowSelectionState = {}
    items.value.forEach(item => { newSel[item.id] = true })
    rowSelection.value = newSel
  }
}

// Category icon mapping
const categoryIcon = computed(() => {
  const icons: Record<string, string> = {
    image: 'i-lucide-image',
    video: 'i-lucide-video',
    audio: 'i-lucide-music',
    document: 'i-lucide-file-text'
  }
  return icons[category.value] || 'i-lucide-file'
})

// Watch for category changes
watch(category, () => {
  currentPage.value = 1
  fetchFiles()
})

onMounted(() => {
  admin.checkAdmin()
  fetchFiles()
  contextItems.value = getEmptyAreaItems()
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
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
            <span class="text-sm font-semibold">{{ categoryLabel }}</span>
          </template>

          <template #right>
            <span
              v-if="!loading && totalCount > 0"
              class="text-sm text-muted"
            >
              {{ t('category.totalCount', { n: totalCount }) }}
            </span>
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              @click="fetchFiles"
            />
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
        <UContextMenu :items="contextItems">
          <div
            ref="listContainerRef"
            class="flex flex-col h-full relative"
            @mousedown="areaSelection.onMouseDown"
            @contextmenu.capture="resetContextMenu"
          >
            <!-- Batch action toolbar -->
            <div
              v-if="isSelectionMode"
              class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2.5 bg-elevated border-b border-accented"
            >
              <div class="flex items-center gap-2">
                <UCheckbox
                  :model-value="selectedItems.length === items.length ? true : 'indeterminate'"
                  :aria-label="t('selection.selectAll')"
                  @update:model-value="(val: boolean | 'indeterminate') => {
                    if (val) {
                      const newSel: Record<string, boolean> = {}
                      items.forEach(item => { newSel[item.id] = true })
                      rowSelection = newSel
                    } else {
                      clearSelection()
                    }
                  }"
                />
                <span class="text-sm font-medium">
                  {{ t('selection.selectedCount', { n: selectedItems.length }) }}
                </span>
              </div>
              <div class="flex items-center gap-1">
                <UButton
                  icon="i-lucide-x"
                  color="neutral"
                  variant="ghost"
                  size="sm"
                  @click="clearSelection"
                />
              </div>
            </div>

            <!-- Loading skeleton -->
            <div
              v-if="loading"
              class="flex-1"
            >
              <div
                v-for="i in 8"
                :key="i"
                class="flex items-center gap-3 px-4 py-3 border-b border-accented"
              >
                <USkeleton class="size-5 rounded" />
                <USkeleton
                  class="h-4 flex-1"
                  :style="{ maxWidth: `${200 + (i % 3) * 80}px` }"
                />
                <USkeleton class="h-4 w-16 ml-auto" />
                <USkeleton class="h-4 w-28" />
              </div>
            </div>

            <!-- Table -->
            <UTable
              v-else-if="items.length > 0"
              v-model:row-selection="rowSelection"
              :data="items"
              :columns="columns"
              :get-row-id="(row: CategoryItem) => row.id"
              :meta="tableMeta"
              :ui="{ tbody: 'category-list-tbody' }"
              class="flex-1"
              @select="onRowSelect"
              @contextmenu="onRowContextMenu"
            />

            <!-- Empty state -->
            <div
              v-else
              class="flex items-center justify-center py-24 text-muted"
            >
              <div class="text-center space-y-2">
                <UIcon
                  :name="categoryIcon"
                  class="size-16 mx-auto opacity-50"
                />
                <p class="text-lg">
                  {{ t('category.empty', { category: categoryLabel }) }}
                </p>
                <p class="text-sm">
                  {{ t('category.emptyHint', { category: categoryLabel }) }}
                </p>
              </div>
            </div>

            <!-- Pagination -->
            <div
              v-if="!loading && totalPages > 1"
              class="flex justify-center py-4 border-t border-accented"
            >
              <UPagination
                :model-value="currentPage"
                :total="totalCount"
                :items-per-page="pageSize"
                @update:model-value="onPageChange"
              />
            </div>
          </div>
        </UContextMenu>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
