<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'

type RowSelectionState = Record<string, boolean>
import type { AxiosError } from 'axios'
import { useAdminStore } from '../stores/admin'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'
import { useStorageStore } from '../stores/storage'
import { useAreaSelection } from '../composables/useAreaSelection'
import api from '../utils/api'

const UIcon = resolveComponent('UIcon')
const UCheckbox = resolveComponent('UCheckbox')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')

const router = useRouter()
const toast = useToast()
const admin = useAdminStore()
const user = useUserStore()
const auth = useAuthStore()
const storageStore = useStorageStore()
const { t, locale } = useI18n()

type ApiErrorResponse = { detail?: string }

interface TrashItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size: number
  deleted_at: string
}

const items = ref<TrashItem[]>([])
const loading = ref(true)

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
const trashListContainerRef = ref<HTMLElement | null>(null)
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
  trashListContainerRef,
  computed(() => items.value.length),
  {
    enabled: areaSelectionEnabled,
    tbodySelector: '.trash-list-tbody',
    onSelectionChange: onAreaSelectionChange
  }
)

async function fetchTrash() {
  clearSelection()
  loading.value = true
  try {
    const { data } = await api.get<TrashItem[]>('/api/v1/trash/')
    items.value = data
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('trash.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

function showApiError(e: AxiosError<ApiErrorResponse>, fallback: string) {
  const detail = e.response?.data?.detail
  const message = typeof detail === 'string' ? detail : fallback
  toast.add({
    title: fallback,
    description: message,
    icon: 'i-lucide-circle-x',
    color: 'error'
  })
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '-'
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

const columns = computed<TableColumn<TrashItem>[]>(() => [
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
    header: t('trash.fileName'),
    cell: ({ row }) => {
      const icon = row.original.type === 'folder' ? 'i-lucide-folder' : 'i-lucide-file'
      const color = row.original.type === 'folder' ? 'text-primary' : 'text-muted'
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UIcon, { name: icon, class: `size-5 shrink-0 ${color}` }),
        h('span', {}, row.original.name)
      ])
    }
  },
  {
    accessorKey: 'size',
    header: t('trash.size'),
    cell: ({ row }) => row.original.type === 'folder' ? '-' : formatSize(row.original.size),
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'deleted_at',
    header: t('trash.deletedAt'),
    cell: ({ row }) => formatDate(row.original.deleted_at),
    meta: { class: { td: 'text-muted' } }
  },
  {
    id: 'actions',
    header: t('trash.actions'),
    cell: ({ row }) => {
      const menuItems: DropdownMenuItem[][] = [
        [
          {
            label: t('trash.restore'),
            icon: 'i-lucide-undo-2',
            onSelect() { restoreItems([row.original.id]) }
          }
        ],
        [
          {
            label: t('trash.permanentDelete'),
            icon: 'i-lucide-trash-2',
            color: 'error' as const,
            onSelect() { openDeleteConfirm([row.original.id]) }
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

// Row select handler
function onRowSelect(e: Event, row: { original: TrashItem; getIsSelected: () => boolean; toggleSelected: (v: boolean) => void }) {
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

// Restore
async function restoreItems(ids: string[]) {
  try {
    await api.patch('/api/v1/trash/restore', { ids })
    toast.add({ title: t('trash.restoreSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    fetchTrash()
    storageStore.refresh()
  } catch (e: unknown) {
    showApiError(e as AxiosError<ApiErrorResponse>, t('trash.restoreFailed'))
  }
}

// Permanent delete confirmation
const deleteConfirmOpen = ref(false)
const deleteConfirmIds = ref<string[]>([])

function openDeleteConfirm(ids: string[]) {
  deleteConfirmIds.value = ids
  deleteConfirmOpen.value = true
}

async function confirmPermanentDelete() {
  try {
    await api.delete('/api/v1/trash/', { data: { ids: deleteConfirmIds.value } })
    toast.add({ title: t('trash.deleteSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    deleteConfirmOpen.value = false
    fetchTrash()
    storageStore.refresh()
  } catch (e: unknown) {
    showApiError(e as AxiosError<ApiErrorResponse>, t('trash.deleteFailed'))
  }
}

// Empty trash confirmation
const emptyTrashOpen = ref(false)

async function confirmEmptyTrash() {
  try {
    await api.delete('/api/v1/trash/empty')
    toast.add({ title: t('trash.emptySuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    emptyTrashOpen.value = false
    fetchTrash()
    storageStore.refresh()
  } catch (e: unknown) {
    showApiError(e as AxiosError<ApiErrorResponse>, t('trash.emptyFailed'))
  }
}

onMounted(() => {
  admin.checkAdmin()
  fetchTrash()
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
            <span class="text-sm font-semibold">{{ t('trash.title') }}</span>
          </template>

          <template #right>
            <UButton
              :label="t('trash.emptyTrash')"
              icon="i-lucide-trash-2"
              color="error"
              variant="ghost"
              size="sm"
              :disabled="items.length === 0"
              @click="emptyTrashOpen = true"
            />
            <UButton
              icon="i-lucide-refresh-cw"
              color="neutral"
              variant="ghost"
              @click="fetchTrash"
            />
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
        <div
          ref="trashListContainerRef"
          class="flex flex-col h-full relative"
          @mousedown="areaSelection.onMouseDown"
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
                :label="t('trash.restore')"
                icon="i-lucide-undo-2"
                color="neutral"
                variant="ghost"
                size="sm"
                @click="restoreItems(selectedItems.map(i => i.id))"
              />
              <UButton
                :label="t('trash.permanentDelete')"
                icon="i-lucide-trash-2"
                color="error"
                variant="ghost"
                size="sm"
                @click="openDeleteConfirm(selectedItems.map(i => i.id))"
              />
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
            :get-row-id="(row: TrashItem) => row.id"
            :meta="tableMeta"
            :ui="{ tbody: 'trash-list-tbody' }"
            class="flex-1"
            @select="onRowSelect"
          />

          <!-- Empty state -->
          <div
            v-else
            class="flex items-center justify-center py-24 text-muted"
          >
            <div class="text-center space-y-2">
              <UIcon
                name="i-lucide-trash-2"
                class="size-16 mx-auto opacity-50"
              />
              <p class="text-lg">
                {{ t('trash.empty') }}
              </p>
              <p class="text-sm">
                {{ t('trash.emptyHint') }}
              </p>
            </div>
          </div>
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>

  <!-- Permanent delete confirmation -->
  <UModal
    v-model:open="deleteConfirmOpen"
    :title="t('trash.deleteConfirmTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-2">
        <p class="text-sm">
          {{ t('trash.deleteConfirmMessage') }}
        </p>
        <p class="text-sm text-muted">
          {{ t('trash.deleteConfirmHint') }}
        </p>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="deleteConfirmOpen = false"
      />
      <UButton
        :label="t('trash.permanentDelete')"
        color="error"
        @click="confirmPermanentDelete"
      />
    </template>
  </UModal>

  <!-- Empty trash confirmation -->
  <UModal
    v-model:open="emptyTrashOpen"
    :title="t('trash.emptyTrashTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-2">
        <p class="text-sm">
          {{ t('trash.emptyTrashMessage') }}
        </p>
        <p class="text-sm text-muted">
          {{ t('trash.emptyTrashHint') }}
        </p>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="emptyTrashOpen = false"
      />
      <UButton
        :label="t('trash.emptyTrash')"
        color="error"
        @click="confirmEmptyTrash"
      />
    </template>
  </UModal>
</template>
