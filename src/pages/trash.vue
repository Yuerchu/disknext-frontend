<script setup lang="ts">
import { h, resolveComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import type { DropdownMenuItem, TableColumn, ContextMenuItem, TableRow } from '@nuxt/ui'

type RowSelectionState = Record<string, boolean>
import type { AxiosError } from 'axios'
import { useAdminStore } from '../stores/admin'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'
import { useStorageStore } from '../stores/storage'
import { useAreaSelection } from '../composables/useAreaSelection'
import { getFileIcon } from '../composables/useFileOpen'
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
      const isFolder = row.original.type === 'folder'
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UIcon, { name: getFileIcon(row.original.name, isFolder), class: `size-5 shrink-0 ${isFolder ? 'text-primary' : 'text-muted'}` }),
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

// Context menu
const contextItems = ref<ContextMenuItem[][]>([])

function getEmptyAreaItems(): ContextMenuItem[][] {
  return [[
    { label: t('common.refresh'), icon: 'i-lucide-refresh-cw', onSelect() { fetchTrash() } }
  ]]
}

function getTrashItemMenu(item: TrashItem): ContextMenuItem[][] {
  return [
    [{ label: t('trash.restore'), icon: 'i-lucide-undo-2', onSelect() { restoreItems([item.id]) } }],
    [{ label: t('trash.permanentDelete'), icon: 'i-lucide-trash-2', color: 'error' as const, onSelect() { openDeleteConfirm([item.id]) } }]
  ]
}

function getBulkItems(): ContextMenuItem[][] {
  const ids = selectedItems.value.map(i => i.id)
  const count = ids.length
  return [
    [{ label: t('trash.restore'), icon: 'i-lucide-undo-2', onSelect() { restoreItems(ids) } }],
    [{
      label: t('trash.permanentDelete') + ` (${count})`,
      icon: 'i-lucide-trash-2',
      color: 'error' as const,
      onSelect() { openDeleteConfirm(ids) }
    }]
  ]
}

function resetContextMenu() {
  contextItems.value = getEmptyAreaItems()
}

function onRowContextMenu(_e: Event, row: TableRow<TrashItem>) {
  if (rowSelection.value[row.original.id] && selectedItems.value.length > 1) {
    contextItems.value = getBulkItems()
    return
  }
  if (selectedItems.value.length > 0) {
    clearSelection()
  }
  contextItems.value = getTrashItemMenu(row.original)
}

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
            ref="trashListContainerRef"
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
              @contextmenu="onRowContextMenu"
            />

            <!-- Empty state -->
            <div
              v-else
              class="flex items-center justify-center py-16 text-muted"
            >
              <div class="flex flex-col items-center gap-2">
                <!-- Animated trash SVG -->
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 240 240"
                  class="size-40"
                  role="img"
                  :aria-label="t('trash.empty')"
                >
                  <defs>
                    <path
                      id="star"
                      d="M 0 -12 Q 0 0 12 0 Q 0 0 0 12 Q 0 0 -12 0 Q 0 0 0 -12 Z"
                    />
                  </defs>
                  <!-- Shadow -->
                  <ellipse
                    class="trash-shadow"
                    cx="120"
                    cy="206"
                    rx="45"
                    ry="6"
                    fill="var(--ui-border)"
                  />
                  <!-- Body -->
                  <path
                    d="M 75 90 L 86 185 A 12 12 0 0 0 98 196 L 142 196 A 12 12 0 0 0 154 185 L 165 90 Z"
                    fill="var(--ui-bg)"
                    stroke="var(--ui-text-muted)"
                    stroke-width="8"
                    stroke-linejoin="round"
                  />
                  <!-- Stripes -->
                  <path
                    d="M 102 110 L 108 175 M 120 110 L 120 175 M 138 110 L 132 175"
                    fill="none"
                    stroke="var(--ui-border)"
                    stroke-width="6"
                    stroke-linecap="round"
                  />
                  <!-- Floating lid -->
                  <g class="trash-lid">
                    <path
                      d="M 100 78 V 64 A 6 6 0 0 1 106 58 H 134 A 6 6 0 0 1 140 64 V 78"
                      fill="none"
                      stroke="var(--ui-text-muted)"
                      stroke-width="8"
                      stroke-linecap="round"
                    />
                    <rect
                      x="65"
                      y="78"
                      width="110"
                      height="12"
                      rx="6"
                      fill="var(--ui-bg)"
                      stroke="var(--ui-text-muted)"
                      stroke-width="8"
                    />
                  </g>
                  <!-- Sparkles -->
                  <g transform="translate(50, 65)">
                    <use
                      href="#star"
                      class="sparkle sparkle-1"
                      fill="var(--ui-primary)"
                    />
                  </g>
                  <g transform="translate(195, 110) scale(0.7)">
                    <use
                      href="#star"
                      class="sparkle sparkle-2"
                      fill="var(--ui-text-muted)"
                    />
                  </g>
                  <g transform="translate(170, 170) scale(0.5)">
                    <use
                      href="#star"
                      class="sparkle sparkle-3"
                      fill="var(--ui-primary)"
                    />
                  </g>
                </svg>

                <div class="space-y-1.5 text-center">
                  <p class="text-lg font-medium text-default">
                    {{ t('trash.empty') }}
                  </p>
                  <p class="text-sm">
                    {{ t('trash.emptyHint') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </UContextMenu>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>

  <!-- Permanent delete confirmation -->
  <UModal
    v-model:open="deleteConfirmOpen"
    :title="t('trash.deleteConfirmTitle')"
    description=" "
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
    description=" "
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

<style scoped>
@keyframes floatLid {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(1.5deg); }
}
@keyframes shadowPulse {
  0%, 100% { transform: scaleX(1); opacity: 1; }
  50% { transform: scaleX(0.9); opacity: 0.6; }
}
@keyframes twinkle {
  0%, 100% { transform: scale(0.6); opacity: 0.2; }
  50% { transform: scale(1.1); opacity: 1; }
}
.trash-lid {
  animation: floatLid 4s ease-in-out infinite;
  transform-origin: 120px 70px;
}
.trash-shadow {
  animation: shadowPulse 4s ease-in-out infinite;
  transform-origin: 120px 206px;
}
.sparkle { transform-origin: 0 0; }
.sparkle-1 { animation: twinkle 3s ease-in-out infinite; }
.sparkle-2 { animation: twinkle 4s ease-in-out infinite 1.5s; }
.sparkle-3 { animation: twinkle 3.5s ease-in-out infinite 0.7s; }
</style>
