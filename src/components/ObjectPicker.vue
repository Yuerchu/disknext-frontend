<script setup lang="ts">
import { h, ref, watch, computed, resolveComponent } from 'vue'
import { useI18n } from 'vue-i18n'
import type { TableColumn, BreadcrumbItem } from '@nuxt/ui'
import type { AxiosError } from 'axios'
import { getFileIcon } from '../composables/useFileOpen'
import api from '../utils/api'

const UIcon = resolveComponent('UIcon')

interface FileObject {
  id: string
  name: string
  type: 'file' | 'folder'
  size: number
  thumb: boolean
  created_at: string
  updated_at: string
  source_enabled: boolean
}

interface DirectoryResponse {
  id: string
  parent: string | null
  objects: FileObject[]
  policy: {
    id: string
    name: string
    type: string
    max_size: number
    file_type: string[] | null
  }
}

interface TreeNode {
  label: string
  icon: string
  _id: string
  _path: string
  _loaded: boolean
  children: TreeNode[]
  _placeholder?: boolean
  defaultExpanded?: boolean
}

const props = withDefaults(defineProps<{
  open: boolean
  title?: string
  type?: 'file' | 'folder'
  multiple?: boolean
  excludeIds?: string[]
}>(), {
  title: '',
  type: 'folder',
  multiple: false,
  excludeIds: () => []
})

const emit = defineEmits<{
  'update:open': [value: boolean]
  'confirm': [selected: { id: string, name: string, path: string }[]]
}>()

const { t, locale } = useI18n()
const toast = useToast()

// Tree state
const treeItems = ref<TreeNode[]>([])
const expandedKeys = ref<string[]>([])
const selectedTreeNode = ref<TreeNode | null>(null)

// Right panel state
const panelLoading = ref(false)
const panelObjects = ref<FileObject[]>([])
const panelDirId = ref('')
const panelPath = ref('')

// New folder inline
const creatingFolder = ref(false)
const newFolderName = ref('')

function createTreeNode(name: string, id: string, path: string): TreeNode {
  return {
    label: name,
    icon: 'i-lucide-folder',
    _id: id,
    _path: path,
    _loaded: false,
    children: [{ label: '...', icon: 'i-lucide-loader', _id: `${id}_placeholder`, _path: '', _loaded: true, _placeholder: true, children: [] }]
  }
}

async function loadRootDirectory() {
  try {
    const { data } = await api.get<DirectoryResponse>('/api/v1/directory/')
    const folders = data.objects.filter(o => o.type === 'folder')
    const rootNode: TreeNode = {
      label: t('objectPicker.myFiles'),
      icon: 'i-lucide-folder',
      _id: data.id,
      _path: '',
      _loaded: true,
      defaultExpanded: true,
      children: folders.map(f => createTreeNode(f.name, f.id, f.name))
    }
    treeItems.value = [rootNode]
    expandedKeys.value = [data.id]
    // Auto-select root
    selectedTreeNode.value = rootNode
    panelDirId.value = data.id
    panelPath.value = ''
    panelObjects.value = data.objects
  } catch {
    treeItems.value = []
  }
}

async function loadChildren(node: TreeNode) {
  try {
    const url = node._path ? `/api/v1/directory/${node._path}` : '/api/v1/directory/'
    const { data } = await api.get<DirectoryResponse>(url)
    const folders = data.objects.filter(o => o.type === 'folder')
    node.children = folders.map(f =>
      createTreeNode(f.name, f.id, node._path ? `${node._path}/${f.name}` : f.name)
    )
    node._loaded = true
    return data
  } catch {
    toast.add({
      title: t('objectPicker.loading'),
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
    return null
  }
}

function onTreeToggle(e: { preventDefault: () => void }, item: unknown) {
  const node = item as TreeNode
  if (node._placeholder) return
  if (!node._loaded) {
    e.preventDefault()
    loadChildren(node).then(() => {
      expandedKeys.value = [...expandedKeys.value, node._id]
    })
  }
}

async function onTreeSelect(_e: unknown, item: unknown) {
  const node = item as TreeNode
  if (node._placeholder) return
  selectedTreeNode.value = node
  panelPath.value = node._path
  panelDirId.value = node._id

  // Load right panel content
  panelLoading.value = true
  try {
    const url = node._path ? `/api/v1/directory/${node._path}` : '/api/v1/directory/'
    const { data } = await api.get<DirectoryResponse>(url)
    panelDirId.value = data.id
    panelObjects.value = data.objects

    // Also update tree children if not loaded
    if (!node._loaded) {
      const folders = data.objects.filter(o => o.type === 'folder')
      node.children = folders.map(f =>
        createTreeNode(f.name, f.id, node._path ? `${node._path}/${f.name}` : f.name)
      )
      node._loaded = true
    }
  } catch {
    panelObjects.value = []
  } finally {
    panelLoading.value = false
  }

  // Expand if not already
  if (!expandedKeys.value.includes(node._id)) {
    expandedKeys.value = [...expandedKeys.value, node._id]
  }
}

// Right panel sorted objects
const sortedPanelObjects = computed(() => {
  const objs = [...panelObjects.value]
  objs.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return objs
})

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

const panelColumns = computed<TableColumn<FileObject>[]>(() => [
  {
    accessorKey: 'name',
    header: t('file.name'),
    cell: ({ row }) => {
      const isFolder = row.original.type === 'folder'
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UIcon, { name: getFileIcon(row.original.name, isFolder), class: `size-5 shrink-0 ${isFolder ? 'text-primary' : 'text-muted'}` }),
        h('span', { class: isFolder ? 'font-medium' : '' }, row.original.name)
      ])
    }
  },
  {
    accessorKey: 'size',
    header: t('file.size'),
    cell: ({ row }) => row.original.type === 'folder' ? '-' : formatSize(row.original.size),
    meta: { class: { td: 'text-muted' } }
  },
  {
    accessorKey: 'updated_at',
    header: t('file.modifiedAt'),
    cell: ({ row }) => formatDate(row.original.updated_at),
    meta: { class: { td: 'text-muted' } }
  }
])

// Breadcrumb
const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const segments = panelPath.value ? panelPath.value.split('/') : []
  const root: BreadcrumbItem = { label: t('objectPicker.myFiles'), icon: 'i-lucide-folder' }
  if (segments.length === 0) return [root]
  return [root, ...segments.map(s => ({ label: s }))]
})

function navigateToBreadcrumb(index: number) {
  const segments = panelPath.value ? panelPath.value.split('/') : []
  const targetPath = index === 0 ? '' : segments.slice(0, index).join('/')

  // Find the tree node for this path
  const node = findTreeNodeByPath(treeItems.value, targetPath)
  if (node) {
    onTreeSelect(null, node)
  }
}

function findTreeNodeByPath(nodes: TreeNode[], path: string): TreeNode | null {
  for (const node of nodes) {
    if (node._path === path && !node._placeholder) return node
    if (node.children) {
      const found = findTreeNodeByPath(node.children, path)
      if (found) return found
    }
  }
  return null
}

// Double-click folder in right panel to navigate
function onPanelRowSelect(_e: Event, row: { original: FileObject }) {
  if (row.original.type === 'folder') {
    const folderPath = panelPath.value ? `${panelPath.value}/${row.original.name}` : row.original.name
    // Find or create tree node
    let node = findTreeNodeByPath(treeItems.value, folderPath)
    if (!node) {
      // The tree node might not be loaded yet, navigate directly
      navigateToPath(folderPath, row.original.id)
      return
    }
    onTreeSelect(null, node)
  }
}

async function navigateToPath(path: string, dirId: string) {
  panelLoading.value = true
  panelPath.value = path
  panelDirId.value = dirId
  try {
    const { data } = await api.get<DirectoryResponse>(`/api/v1/directory/${path}`)
    panelDirId.value = data.id
    panelObjects.value = data.objects
    selectedTreeNode.value = { label: path.split('/').pop() || '', _id: data.id, _path: path, _loaded: false, children: [], icon: 'i-lucide-folder' }
  } catch {
    panelObjects.value = []
  } finally {
    panelLoading.value = false
  }
}

// New folder
async function confirmNewFolder() {
  const name = newFolderName.value.trim()
  if (!name) return
  try {
    await api.post('/api/v1/directory/', {
      parent_id: panelDirId.value,
      name
    })
    creatingFolder.value = false
    newFolderName.value = ''
    // Refresh current panel and tree node
    if (selectedTreeNode.value) {
      await onTreeSelect(null, selectedTreeNode.value)
    }
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    const detail = err.response?.data?.detail
    toast.add({
      title: t('objectPicker.createFolderFailed'),
      description: typeof detail === 'string' ? detail : undefined,
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  }
}

// Confirm selection
const canConfirm = computed(() => {
  if (props.type === 'folder') {
    return selectedTreeNode.value != null && !props.excludeIds.includes(selectedTreeNode.value._id)
  }
  return false
})

function onConfirm() {
  if (!canConfirm.value) return
  if (props.type === 'folder' && selectedTreeNode.value) {
    emit('confirm', [{
      id: selectedTreeNode.value._id,
      name: selectedTreeNode.value.label || '',
      path: selectedTreeNode.value._path
    }])
  }
}

function onClose() {
  emit('update:open', false)
}

// Load root when opened
watch(() => props.open, (val) => {
  if (val) {
    loadRootDirectory()
    creatingFolder.value = false
    newFolderName.value = ''
  }
})
</script>

<template>
  <UModal
    :open="open"
    :title="title"
    :ui="{
      footer: 'justify-end',
      content: 'sm:max-w-4xl sm:w-full',
      body: 'overflow-y-hidden'
    }"
    @update:open="emit('update:open', $event)"
  >
    <template #body>
      <div class="flex h-[28rem] gap-0 border border-default rounded-lg overflow-hidden">
        <!-- Left: Tree -->
        <div class="w-56 shrink-0 border-r border-default overflow-y-auto p-2 bg-elevated/50">
          <UTree
            v-model:expanded="expandedKeys"
            :items="(treeItems as any[])"
            :get-key="(item: any) => item._id"
            color="primary"
            size="sm"
            @toggle="onTreeToggle"
            @select="onTreeSelect"
          />
        </div>

        <!-- Right: Content panel -->
        <div class="flex-1 flex flex-col min-w-0">
          <!-- Breadcrumb -->
          <div class="px-3 py-2 border-b border-default shrink-0">
            <UBreadcrumb :items="breadcrumbItems">
              <template #item="{ item, index }">
                <button
                  v-if="index < breadcrumbItems.length - 1"
                  class="text-sm text-muted hover:text-default transition-colors cursor-pointer flex items-center gap-1"
                  @click="navigateToBreadcrumb(index)"
                >
                  <UIcon
                    v-if="item.icon"
                    :name="item.icon"
                    class="shrink-0 size-4"
                  />
                  <span class="truncate">{{ item.label }}</span>
                </button>
                <span
                  v-else
                  class="text-sm text-primary font-medium flex items-center gap-1"
                >
                  <UIcon
                    v-if="item.icon"
                    :name="item.icon"
                    class="shrink-0 size-4"
                  />
                  <span class="truncate">{{ item.label }}</span>
                </span>
              </template>
            </UBreadcrumb>
          </div>

          <!-- Table -->
          <div class="flex-1 overflow-y-auto">
            <div
              v-if="panelLoading"
              class="flex items-center justify-center h-full text-muted"
            >
              <UIcon
                name="i-lucide-loader"
                class="size-5 animate-spin"
              />
              <span class="ml-2 text-sm">{{ t('objectPicker.loading') }}</span>
            </div>
            <UTable
              v-else
              :data="sortedPanelObjects"
              :columns="panelColumns"
              class="flex-1"
              @select="onPanelRowSelect"
            >
              <template #empty>
                <div class="flex items-center justify-center py-8 text-muted">
                  <div class="text-center space-y-1">
                    <UIcon
                      name="i-lucide-folder-open"
                      class="size-10 mx-auto"
                    />
                    <p class="text-sm">
                      {{ t('objectPicker.emptyFolder') }}
                    </p>
                  </div>
                </div>
              </template>
            </UTable>
          </div>

          <!-- New folder -->
          <div class="px-3 py-2 border-t border-default shrink-0">
            <div
              v-if="creatingFolder"
              class="flex items-center gap-2"
            >
              <UInput
                v-model="newFolderName"
                autofocus
                size="sm"
                class="flex-1"
                :placeholder="t('objectPicker.newFolderPlaceholder')"
                @keydown.enter="confirmNewFolder"
                @keydown.escape="creatingFolder = false"
              />
              <UButton
                icon="i-lucide-check"
                size="sm"
                :disabled="!newFolderName.trim()"
                @click="confirmNewFolder"
              />
              <UButton
                icon="i-lucide-x"
                size="sm"
                color="neutral"
                variant="ghost"
                @click="creatingFolder = false"
              />
            </div>
            <UButton
              v-else
              :label="t('objectPicker.newFolder')"
              icon="i-lucide-folder-plus"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="creatingFolder = true; newFolderName = ''"
            />
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('objectPicker.cancel')"
        color="neutral"
        variant="outline"
        @click="onClose"
      />
      <UButton
        :label="t('objectPicker.confirm')"
        :disabled="!canConfirm"
        @click="onConfirm"
      />
    </template>
  </UModal>
</template>
