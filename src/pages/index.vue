<script setup lang="ts">
import { h, computed, ref, watch, onMounted, resolveComponent } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import type { BreadcrumbItem, DropdownMenuItem, TableColumn, ContextMenuItem, TableRow } from '@nuxt/ui'
import { useAdminStore } from '../stores/admin'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'
import { useUploadStore } from '../stores/upload'
import type { UploadTask, UploadSession } from '../stores/upload'
import api from '../utils/api'

const UIcon = resolveComponent('UIcon')

const router = useRouter()
const toast = useToast()
const admin = useAdminStore()
const user = useUserStore()
const auth = useAuthStore()
const upload = useUploadStore()
const { t, locale } = useI18n()

import type { AxiosError } from 'axios'

type ApiErrorResponse = { detail?: string }

interface FileWithPath {
  file: File
  relativePath: string
}

function readEntriesRecursive(dirEntry: FileSystemDirectoryEntry, basePath: string): Promise<FileWithPath[]> {
  return new Promise((resolve, reject) => {
    const reader = dirEntry.createReader()
    const allEntries: FileSystemEntry[] = []

    function readBatch() {
      reader.readEntries((entries) => {
        if (entries.length === 0) {
          // All entries read, now process them
          const promises: Promise<FileWithPath[]>[] = []
          for (const entry of allEntries) {
            if (entry.isFile) {
              promises.push(new Promise((res, rej) => {
                (entry as FileSystemFileEntry).file(
                  (file) => res([{ file, relativePath: basePath + file.name }]),
                  rej
                )
              }))
            } else if (entry.isDirectory) {
              promises.push(readEntriesRecursive(entry as FileSystemDirectoryEntry, basePath + entry.name + '/'))
            }
          }
          Promise.all(promises).then((results) => resolve(results.flat()), reject)
        } else {
          allEntries.push(...entries)
          readBatch()
        }
      }, reject)
    }

    readBatch()
  })
}

async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<FileWithPath[]> {
  const items = dataTransfer.items
  if (!items) return []

  const promises: Promise<FileWithPath[]>[] = []
  for (let i = 0; i < items.length; i++) {
    const entry = items[i].webkitGetAsEntry?.()
    if (entry) {
      if (entry.isDirectory) {
        promises.push(readEntriesRecursive(entry as FileSystemDirectoryEntry, entry.name + '/'))
      } else if (entry.isFile) {
        promises.push(new Promise((res, rej) => {
          (entry as FileSystemFileEntry).file(
            (file) => res([{ file, relativePath: file.name }]),
            rej
          )
        }))
      }
    } else {
      // Fallback: browser doesn't support webkitGetAsEntry
      const file = items[i].getAsFile()
      if (file) {
        promises.push(Promise.resolve([{ file, relativePath: file.name }]))
      }
    }
  }

  const results = await Promise.all(promises)
  return results.flat()
}

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

const directory = ref<DirectoryResponse | null>(null)
const loading = ref(true)
const currentPath = ref('')

async function fetchDirectory(path: string = '') {
  loading.value = true
  try {
    const url = path ? `/api/v1/directory/${path}` : '/api/v1/directory/'
    const { data } = await api.get<DirectoryResponse>(url)
    directory.value = data
    currentPath.value = path
  } catch {
    directory.value = null
  } finally {
    loading.value = false
  }
}

function navigateToFolder(name: string) {
  const newPath = currentPath.value ? `${currentPath.value}/${name}` : name
  fetchDirectory(newPath)
}

const pathSegments = computed(() => currentPath.value ? currentPath.value.split('/') : [])

const breadcrumbItems = computed<BreadcrumbItem[]>(() => {
  const segments = pathSegments.value
  const root: BreadcrumbItem = { label: t('nav.myFiles'), icon: 'i-lucide-folder' }

  if (segments.length === 0) return [root]

  const all = [root, ...segments.map(s => ({ label: s }) as BreadcrumbItem)]

  // 4 items or fewer: show all (root + up to 3 segments)
  if (all.length <= 4) return all

  // Collapse middle items into a dropdown
  const middle = all.slice(1, -1)
  const collapsed: BreadcrumbItem = {
    slot: 'collapsed' as const,
    icon: 'i-lucide-ellipsis',
    children: middle.map((item, i) => ({
      label: item.label!,
      onSelect() {
        navigateToBreadcrumb(i + 1)
      }
    }))
  }
  return [root, collapsed, all[all.length - 1]]
})

function navigateToBreadcrumb(index: number) {
  if (index === 0) {
    fetchDirectory('')
  } else {
    const parts = pathSegments.value
    fetchDirectory(parts.slice(0, index).join('/'))
  }
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

const sortedObjects = computed(() => {
  if (!directory.value) return []
  const objs = [...directory.value.objects]
  objs.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
    return a.name.localeCompare(b.name)
  })
  return objs
})

const columns = computed<TableColumn<FileObject>[]>(() => [
  {
    accessorKey: 'name',
    header: t('file.name'),
    cell: ({ row }) => {
      const icon = row.original.type === 'folder' ? 'i-lucide-folder' : 'i-lucide-file'
      const color = row.original.type === 'folder' ? 'text-primary' : 'text-muted'
      return h('div', { class: 'flex items-center gap-2' }, [
        h(UIcon, { name: icon, class: `size-5 shrink-0 ${color}` }),
        h('span', { class: row.original.type === 'folder' ? 'font-medium' : '' }, row.original.name)
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

// Context menu
const contextItems = ref<ContextMenuItem[][]>([])

function getEmptyAreaItems(): ContextMenuItem[][] {
  return [
    [
      { label: t('contextMenu.uploadFile'), icon: 'i-lucide-upload', onSelect() { triggerFileUpload() } },
      { label: t('contextMenu.uploadFolder'), icon: 'i-lucide-folder-up', onSelect() { triggerFolderUpload() } },
      { label: t('contextMenu.offlineDownload'), icon: 'i-lucide-cloud-download' }
    ],
    [
      {
        label: t('contextMenu.createFolder'),
        icon: 'i-lucide-folder-plus',
        onSelect() {
          openCreateModal('folder')
        }
      },
      {
        label: t('contextMenu.createFile'),
        icon: 'i-lucide-file-plus',
        onSelect() {
          openCreateModal('file')
        }
      }
    ],
    [
      {
        label: t('common.refresh'),
        icon: 'i-lucide-refresh-cw',
        onSelect() {
          fetchDirectory(currentPath.value)
        }
      }
    ]
  ]
}

function getFolderItems(obj: FileObject): ContextMenuItem[][] {
  return [
    [
      {
        label: t('common.open'),
        icon: 'i-lucide-folder-open',
        onSelect() {
          navigateToFolder(obj.name)
        }
      },
      { label: t('common.download'), icon: 'i-lucide-download' }
    ],
    [
      { label: t('common.share'), icon: 'i-lucide-share-2', onSelect() { openShareModal(obj) } },
      {
        label: t('common.rename'),
        icon: 'i-lucide-pencil',
        onSelect() {
          renameObject(obj)
        }
      },
      { label: t('contextMenu.copyDuplicate'), icon: 'i-lucide-copy' },
      { label: t('contextMenu.copyTo'), icon: 'i-lucide-clipboard-copy' },
      { label: t('contextMenu.moveTo'), icon: 'i-lucide-move' }
    ],
    [
      { label: t('common.details'), icon: 'i-lucide-info' }
    ],
    [
      {
        label: t('common.delete'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect() {
          deleteObjects([obj.id], obj.name)
        }
      }
    ]
  ]
}

function getFileItems(obj: FileObject): ContextMenuItem[][] {
  return [
    [
      { label: t('common.open'), icon: 'i-lucide-external-link' },
      {
        label: t('contextMenu.openWith'),
        icon: 'i-lucide-app-window',
        children: [
          { label: t('contextMenu.defaultApp') }
        ]
      }
    ],
    [
      { label: t('common.share'), icon: 'i-lucide-share-2', onSelect() { openShareModal(obj) } },
      {
        label: t('common.rename'),
        icon: 'i-lucide-pencil',
        onSelect() {
          renameObject(obj)
        }
      },
      { label: t('contextMenu.copyDuplicate'), icon: 'i-lucide-copy' },
      { label: t('contextMenu.copyTo'), icon: 'i-lucide-clipboard-copy' },
      { label: t('contextMenu.moveTo'), icon: 'i-lucide-move' },
      { label: t('contextMenu.getDirectLink'), icon: 'i-lucide-link' }
    ],
    [
      { label: t('common.details'), icon: 'i-lucide-info' }
    ],
    [
      {
        label: t('common.delete'),
        icon: 'i-lucide-trash-2',
        color: 'error' as const,
        onSelect() {
          deleteObjects([obj.id], obj.name)
        }
      }
    ]
  ]
}

function resetContextMenu() {
  contextItems.value = getEmptyAreaItems()
}

function onRowContextMenu(_e: Event, row: TableRow<FileObject>) {
  if (row.original.type === 'folder') {
    contextItems.value = getFolderItems(row.original)
  } else {
    contextItems.value = getFileItems(row.original)
  }
}

// Error toast
function showApiError(e: AxiosError<ApiErrorResponse>, fallback: string) {
  const status = e.response!.status
  const detail = e.response!.data!.detail
  const errorMessages: Record<number, string> = {
    400: t('errors.invalidParams'),
    404: t('errors.notFound'),
    409: t('errors.conflict')
  }
  const message = typeof detail === 'string'
    ? detail
    : errorMessages[status] || fallback
  toast.add({
    title: fallback,
    description: message,
    icon: 'i-lucide-circle-x',
    color: 'error'
  })
}

// Delete confirmation modal
const deleteModalOpen = ref(false)
const deleteTargetIds = ref<string[]>([])
const deleteTargetName = ref('')
const deletePermanent = ref(false)

function deleteObjects(ids: string[], name?: string) {
  deleteTargetIds.value = ids
  deleteTargetName.value = name || `${ids.length} 个项目`
  deletePermanent.value = false
  deleteModalOpen.value = true
}

async function confirmDelete() {
  try {
    await api.delete('/api/v1/object/', {
      data: { ids: deleteTargetIds.value, permanent: deletePermanent.value }
    })
    deleteModalOpen.value = false
    fetchDirectory(currentPath.value)
  } catch (e: unknown) {
    showApiError(e as AxiosError<ApiErrorResponse>, t('errors.deleteFailed'))
  }
}

// Rename modal
const renameModalOpen = ref(false)
const renameTargetId = ref('')
const renameNewName = ref('')

function renameObject(obj: FileObject) {
  renameTargetId.value = obj.id
  renameNewName.value = obj.name
  renameModalOpen.value = true
}

async function confirmRename() {
  const name = renameNewName.value.trim()
  if (!name) return
  try {
    await api.post('/api/v1/object/rename', { id: renameTargetId.value, new_name: name })
    renameModalOpen.value = false
    fetchDirectory(currentPath.value)
  } catch (e: unknown) {
    showApiError(e as AxiosError<ApiErrorResponse>, t('errors.renameFailed'))
  }
}

// Create modal
const createModalOpen = ref(false)
const createType = ref<'folder' | 'file'>('folder')
const createName = ref('')

function openCreateModal(type: 'folder' | 'file') {
  createType.value = type
  createName.value = ''
  createModalOpen.value = true
}

async function confirmCreate() {
  const name = createName.value.trim()
  if (!name) return
  try {
    if (createType.value === 'folder') {
      await api.post('/api/v1/directory/', {
        parent_id: directory.value?.id,
        name
      })
    } else {
      await api.post('/api/v1/object/', {
        parent_id: directory.value?.id,
        name
      })
    }
    createModalOpen.value = false
    fetchDirectory(currentPath.value)
  } catch (e: unknown) {
    showApiError(e as AxiosError<ApiErrorResponse>, t('errors.createFailed'))
  }
}

// Share modal
const shareModalOpen = ref(false)
const shareTargetId = ref('')
const shareTargetName = ref('')
const shareCreating = ref(false)
const shareResult = ref<{ instanceId: string; shareId: string } | null>(null)

const shareHasExpiry = ref(false)
const shareExpiresDateTime = ref('')

const shareForm = ref({
  password: '',
  remain_downloads: null as number | null,
  preview_enabled: true,
  score: 0,
})

function openShareModal(obj: FileObject) {
  shareTargetId.value = obj.id
  shareTargetName.value = obj.name
  shareHasExpiry.value = false
  shareExpiresDateTime.value = ''
  shareForm.value = {
    password: '',
    remain_downloads: null,
    preview_enabled: true,
    score: 0,
  }
  shareResult.value = null
  shareCreating.value = false
  shareModalOpen.value = true
}

function getShareLink(shareId: string): string {
  return `${window.location.origin}/s/${shareId}`
}

async function confirmShare() {
  shareCreating.value = true
  try {
    const body: Record<string, unknown> = {
      object_id: shareTargetId.value,
      preview_enabled: shareForm.value.preview_enabled,
      score: shareForm.value.score,
    }
    if (shareForm.value.password) body.password = shareForm.value.password
    if (shareHasExpiry.value && shareExpiresDateTime.value) {
      body.expires = new Date(shareExpiresDateTime.value).toISOString()
    }
    if (shareForm.value.remain_downloads != null) body.remain_downloads = shareForm.value.remain_downloads
    const { data } = await api.post<{ instance_id: string; share_id: string }>('/api/v1/share/', body)
    shareResult.value = { instanceId: data.instance_id, shareId: data.share_id }
  } catch (e: unknown) {
    showApiError(e as AxiosError<ApiErrorResponse>, t('shareModal.failed'))
  } finally {
    shareCreating.value = false
  }
}

function copyShareLink() {
  if (!shareResult.value) return
  navigator.clipboard.writeText(getShareLink(shareResult.value.shareId))
  toast.add({ title: t('shareModal.copied'), icon: 'i-lucide-check-circle', color: 'success' })
}

// File upload
const fileInputRef = ref<HTMLInputElement | null>(null)
const dragging = ref(false)
let dragCounter = 0

function onDragEnter() {
  dragCounter++
  dragging.value = true
}

function onDragLeave() {
  dragCounter--
  if (dragCounter <= 0) {
    dragCounter = 0
    dragging.value = false
  }
}

async function createUploadSession(file: File, parentId?: string): Promise<UploadSession | null> {
  if (!directory.value) return null
  try {
    const { data } = await api.put<UploadSession>('/api/v1/file/upload/', {
      file_name: file.name,
      file_size: file.size,
      parent_id: parentId || directory.value.id,
      policy_id: directory.value.policy.id
    })
    return data
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    const status = err?.response?.status
    const detail = err?.response?.data?.detail
    const uploadErrorMessages: Record<number, string> = {
      400: t('upload.invalidFileName'),
      402: t('upload.insufficientSpace'),
      404: t('upload.parentNotFound'),
      409: t('upload.fileExists'),
      413: t('upload.fileTooLarge')
    }
    const message = typeof detail === 'string'
      ? detail
      : uploadErrorMessages[status ?? 0] || (status && status >= 500 ? t('upload.serverError') : t('upload.failed'))
    toast.add({
      title: t('upload.uploadFailedFor', { name: file.name }),
      description: message,
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
    return null
  }
}

async function startUpload(files: FileList | File[]) {
  for (const file of Array.from(files)) {
    const session = await createUploadSession(file)
    if (session) {
      upload.addTask(file, session)
    }
  }
}

async function uploadDirectoryTree(filesWithPaths: FileWithPath[]) {
  if (!directory.value) return

  // Extract all unique directory paths
  const dirPaths = new Set<string>()
  for (const f of filesWithPaths) {
    const parts = f.relativePath.split('/')
    for (let i = 1; i < parts.length; i++) {
      dirPaths.add(parts.slice(0, i).join('/'))
    }
  }

  // Sort by depth (parent first)
  const sortedDirs = [...dirPaths].sort((a, b) => a.split('/').length - b.split('/').length)

  // Map directory path to its ID
  const dirIdMap = new Map<string, string>()
  dirIdMap.set('', directory.value.id)

  const failedDirs = new Set<string>()

  // Create directories sequentially
  for (const dirPath of sortedDirs) {
    const parentPath = dirPath.includes('/') ? dirPath.slice(0, dirPath.lastIndexOf('/')) : ''
    const name = dirPath.includes('/') ? dirPath.slice(dirPath.lastIndexOf('/') + 1) : dirPath

    // Skip if parent failed
    if (failedDirs.has(parentPath)) {
      failedDirs.add(dirPath)
      continue
    }

    const parentId = dirIdMap.get(parentPath)
    if (!parentId) {
      failedDirs.add(dirPath)
      continue
    }

    try {
      await api.post('/api/v1/directory/', { parent_id: parentId, name })
    } catch (e: unknown) {
      const err = e as AxiosError<ApiErrorResponse>
      if (err.response?.status !== 409) {
        failedDirs.add(dirPath)
        toast.add({
          title: t('upload.folderCreateFailed', { name }),
          icon: 'i-lucide-circle-x',
          color: 'error'
        })
        continue
      }
      // 409 = already exists, proceed to fetch its ID below
    }

    // Fetch the directory to get its ID reliably
    try {
      const fullPath = currentPath.value ? `${currentPath.value}/${dirPath}` : dirPath
      const { data } = await api.get<DirectoryResponse>(`/api/v1/directory/${fullPath}`)
      dirIdMap.set(dirPath, data.id)
    } catch {
      failedDirs.add(dirPath)
      toast.add({
        title: t('upload.folderCreateFailed', { name }),
        icon: 'i-lucide-circle-x',
        color: 'error'
      })
    }
  }

  // Upload files
  for (const f of filesWithPaths) {
    const parentPath = f.relativePath.includes('/')
      ? f.relativePath.slice(0, f.relativePath.lastIndexOf('/'))
      : ''

    // Skip if parent directory failed
    if (failedDirs.has(parentPath)) continue

    const parentId = dirIdMap.get(parentPath)
    if (!parentId) continue

    const session = await createUploadSession(f.file, parentId)
    if (session) {
      upload.addTask(f.file, session)
    }
  }
}

const folderInputRef = ref<HTMLInputElement | null>(null)

function triggerFileUpload() {
  fileInputRef.value?.click()
}

function triggerFolderUpload() {
  folderInputRef.value?.click()
}

async function onFolderSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (!input.files?.length || !directory.value) return
  const filesWithPaths: FileWithPath[] = Array.from(input.files).map(file => ({
    file,
    relativePath: file.webkitRelativePath || file.name
  }))
  await uploadDirectoryTree(filesWithPaths)
  fetchDirectory(currentPath.value)
  input.value = ''
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  if (input.files?.length && directory.value) {
    startUpload(input.files)
    input.value = ''
  }
}

async function onDrop(event: DragEvent) {
  dragCounter = 0
  dragging.value = false
  if (!event.dataTransfer || !directory.value) return

  // Check if any dropped item is a directory
  let hasDirectory = false
  const items = event.dataTransfer.items
  if (items) {
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.()
      if (entry?.isDirectory) { hasDirectory = true; break }
    }
  }

  if (hasDirectory) {
    const collected = await collectDroppedFiles(event.dataTransfer)
    if (collected.length > 0) {
      await uploadDirectoryTree(collected)
      fetchDirectory(currentPath.value)
    }
  } else if (event.dataTransfer.files.length) {
    startUpload(event.dataTransfer.files)
  }
}

function taskIcon(task: UploadTask): string {
  switch (task.status) {
    case 'uploading': return 'i-lucide-upload'
    case 'completed': return 'i-lucide-check-circle'
    case 'failed': return 'i-lucide-circle-x'
    case 'cancelled': return 'i-lucide-ban'
  }
}

function taskIconColor(task: UploadTask): string {
  switch (task.status) {
    case 'uploading': return 'text-primary'
    case 'completed': return 'text-success'
    case 'failed': return 'text-error'
    case 'cancelled': return 'text-muted'
  }
}

function taskPercent(task: UploadTask): number {
  if (!task.totalChunks) return 0
  return Math.round(task.uploadedChunks / task.totalChunks * 100)
}

function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond <= 0) return t('upload.calculating')
  if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(1)} KB/s`
  return `${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`
}

// Watch for completed uploads to refresh directory
watch(
  () => upload.tasks.map(t => t.status),
  (newStatuses, oldStatuses) => {
    if (!oldStatuses) return
    for (let i = 0; i < newStatuses.length; i++) {
      if (newStatuses[i] === 'completed' && oldStatuses[i] !== 'completed') {
        fetchDirectory(currentPath.value)
        return
      }
    }
  }
)

onMounted(() => {
  admin.checkAdmin()
  fetchDirectory()
  contextItems.value = getEmptyAreaItems()
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

const uploadChipColor = computed<'warning' | 'success' | 'error'>(() => {
  if (upload.tasks.some(t => t.status === 'failed')) return 'error'
  if (upload.tasks.some(t => t.status === 'uploading')) return 'warning'
  return 'success'
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
            <UBreadcrumb :items="breadcrumbItems">
              <template #item="{ item, index }">
                <button
                  v-if="index < breadcrumbItems.length - 1"
                  class="group relative flex items-center gap-1.5 text-sm text-muted font-medium hover:text-default transition-colors cursor-pointer"
                  @click="navigateToBreadcrumb(index)"
                >
                  <UIcon
                    v-if="item.icon"
                    :name="item.icon"
                    class="shrink-0 size-5"
                  />
                  <span class="truncate">{{ item.label }}</span>
                </button>
                <span
                  v-else
                  class="flex items-center gap-1.5 text-sm text-primary font-semibold"
                >
                  <UIcon
                    v-if="item.icon"
                    :name="item.icon"
                    class="shrink-0 size-5"
                  />
                  <span class="truncate">{{ item.label }}</span>
                </span>
              </template>
              <template #collapsed="{ item }: { item: BreadcrumbItem }">
                <UDropdownMenu :items="item.children">
                  <UButton
                    :icon="item.icon"
                    color="neutral"
                    variant="link"
                    class="p-0.5"
                  />
                </UDropdownMenu>
              </template>
            </UBreadcrumb>
          </template>

          <template #right>
            <UColorModeButton />
            <UChip
              :color="uploadChipColor"
              :show="upload.tasks.length > 0"
              inset
            >
              <UButton
                icon="i-lucide-upload"
                color="neutral"
                variant="ghost"
                @click="upload.drawerOpen = !upload.drawerOpen"
              />
            </UChip>
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
        <UContextMenu :items="contextItems">
          <div
            class="flex flex-col h-full relative"
            @contextmenu.capture="resetContextMenu"
            @dragenter.prevent="onDragEnter"
            @dragover.prevent
            @dragleave="onDragLeave"
            @drop.prevent="onDrop"
          >
            <div
              v-if="dragging"
              class="absolute inset-0 z-10 bg-primary/5 border-2 border-dashed border-primary rounded-lg flex items-center justify-center pointer-events-none"
            >
              <div class="text-center">
                <UIcon
                  name="i-lucide-upload"
                  class="size-12 text-primary mx-auto"
                />
                <p class="text-primary font-medium mt-2">
                  {{ t('file.releaseToUpload') }}
                </p>
              </div>
            </div>
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
            <UTable
              v-else
              :data="sortedObjects"
              :columns="columns"
              class="flex-1"
              @select="(_e: Event, row: TableRow<FileObject>) => {
                if (row.original.type === 'folder') {
                  navigateToFolder(row.original.name)
                }
              }"
              @contextmenu="onRowContextMenu"
            >
              <template #empty>
                <div class="flex items-center justify-center py-12 text-muted">
                  <div class="text-center space-y-2">
                    <UIcon
                      name="i-lucide-folder-open"
                      class="size-16 mx-auto"
                    />
                    <p class="text-lg">
                      {{ t('file.emptyFolder') }}
                    </p>
                    <p class="text-sm">
                      {{ t('file.dropToUpload') }}
                    </p>
                  </div>
                </div>
              </template>
            </UTable>
          </div>
        </UContextMenu>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>

  <UModal
    v-model:open="deleteModalOpen"
    :title="t('deleteModal.title')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <div class="space-y-4">
        <p class="text-sm">
          {{ t('deleteModal.message', { name: deleteTargetName }) }}
        </p>
        <p class="text-sm text-muted">
          {{ t('deleteModal.hint') }}
        </p>
        <UCheckbox
          v-model="deletePermanent"
          color="error"
          :label="t('deleteModal.permanent')"
          :description="t('deleteModal.permanentHint')"
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
        :label="deletePermanent ? t('deleteModal.permanentDelete') : t('deleteModal.moveToTrash')"
        :color="deletePermanent ? 'error' : 'primary'"
        @click="confirmDelete"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="createModalOpen"
    :title="createType === 'folder' ? t('createModal.folderTitle') : t('createModal.fileTitle')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UInput
        v-model="createName"
        autofocus
        class="w-full"
        :placeholder="createType === 'folder' ? t('createModal.folderPlaceholder') : t('createModal.filePlaceholder')"
        @keydown.enter="confirmCreate"
      />
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="createModalOpen = false"
      />
      <UButton
        :label="t('common.create')"
        :disabled="!createName.trim()"
        @click="confirmCreate"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="renameModalOpen"
    :title="t('renameModal.title')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <UInput
        v-model="renameNewName"
        autofocus
        class="w-full"
        :placeholder="t('renameModal.placeholder')"
        @keydown.enter="confirmRename"
      />
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="renameModalOpen = false"
      />
      <UButton
        :label="t('common.confirm')"
        :disabled="!renameNewName.trim()"
        @click="confirmRename"
      />
    </template>
  </UModal>

  <UModal
    v-model:open="shareModalOpen"
    :title="t('shareModal.title')"
    :ui="{ footer: 'justify-end' }"
  >
    <template #body>
      <!-- Result state -->
      <div
        v-if="shareResult"
        class="space-y-4"
      >
        <p class="text-sm text-muted">
          {{ t('shareModal.success') }}
        </p>
        <div class="flex items-center gap-2">
          <UInput
            :model-value="getShareLink(shareResult.shareId)"
            readonly
            class="flex-1"
          />
          <UButton
            icon="i-lucide-copy"
            color="neutral"
            variant="outline"
            @click="copyShareLink"
          />
        </div>
      </div>
      <!-- Form state -->
      <div
        v-else
        class="space-y-4"
      >
        <p class="text-sm">
          {{ t('shareModal.sharing') }}
        </p>
        <UTooltip :text="shareTargetName">
          <p class="text-sm font-medium truncate max-w-full">
            {{ shareTargetName }}
          </p>
        </UTooltip>
        <UFormField :label="t('shareModal.password')">
          <UInput
            v-model="shareForm.password"
            type="password"
            :placeholder="t('shareModal.passwordPlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UFormField :label="t('shareModal.expires')">
          <div class="flex items-center gap-2">
            <UInput
              v-if="shareHasExpiry"
              v-model="shareExpiresDateTime"
              type="datetime-local"
              class="flex-1"
            />
            <span
              v-else
              class="text-sm text-muted"
            >{{ t('shareModal.neverExpire') }}</span>
            <UButton
              :icon="shareHasExpiry ? 'i-lucide-infinity' : 'i-lucide-calendar-clock'"
              color="neutral"
              variant="outline"
              @click="shareHasExpiry = !shareHasExpiry"
            />
          </div>
        </UFormField>
        <UFormField
          :label="t('shareModal.remainDownloads')"
          :description="t('shareModal.remainDownloadsDesc')"
        >
          <UInputNumber
            v-model="shareForm.remain_downloads"
            :min="1"
            :placeholder="t('shareModal.remainDownloadsPlaceholder')"
            class="w-full"
          />
        </UFormField>
        <UCheckbox
          v-model="shareForm.preview_enabled"
          :label="t('shareModal.previewEnabled')"
          :description="t('shareModal.previewEnabledDesc')"
        />
        <UFormField
          :label="t('shareModal.score')"
          :description="t('shareModal.scoreDesc')"
        >
          <UInputNumber
            v-model="shareForm.score"
            :min="0"
            class="w-full"
          />
        </UFormField>
      </div>
    </template>
    <template #footer>
      <template v-if="shareResult">
        <UButton
          :label="t('common.confirm')"
          @click="shareModalOpen = false"
        />
      </template>
      <template v-else>
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="outline"
          @click="shareModalOpen = false"
        />
        <UButton
          :label="t('shareModal.create')"
          :loading="shareCreating"
          @click="confirmShare"
        />
      </template>
    </template>
  </UModal>

  <input
    ref="fileInputRef"
    type="file"
    multiple
    class="hidden"
    @change="onFilesSelected"
  >
  <input
    ref="folderInputRef"
    type="file"
    webkitdirectory
    class="hidden"
    @change="onFolderSelected"
  >

  <UDrawer
    v-model:open="upload.drawerOpen"
    direction="right"
    :inset="true"
    :modal="false"
    :handle="false"
    :title="t('upload.tasks')"
    :ui="{ content: 'min-w-96 w-[28rem]' }"
  >
    <template #header>
      <div class="flex items-center justify-between w-full">
        <span class="font-semibold text-sm">{{ t('upload.tasks') }}</span>
        <UButton
          icon="i-lucide-x"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="upload.drawerOpen = false"
        />
      </div>
    </template>
    <template #body>
      <div class="space-y-3 max-h-64 overflow-y-auto">
        <div
          v-for="task in upload.tasks"
          :key="task.id"
          class="space-y-1"
        >
          <div class="flex items-center gap-2">
            <UIcon
              :name="taskIcon(task)"
              :class="taskIconColor(task)"
              class="size-4 shrink-0"
            />
            <span class="text-sm truncate flex-1">{{ task.fileName }}</span>
            <UButton
              v-if="task.status === 'uploading'"
              icon="i-lucide-x"
              color="neutral"
              variant="ghost"
              size="xs"
              @click="upload.cancelTask(task.id)"
            />
          </div>
          <template v-if="task.status === 'uploading'">
            <UProgress
              :value="taskPercent(task)"
              size="xs"
            />
            <div class="flex items-center justify-between text-xs text-muted">
              <span>{{ formatSize(task.bytesUploaded) }} / {{ formatSize(task.fileSize) }}</span>
              <span>{{ taskPercent(task) }}% · {{ formatSpeed(task.speed) }}</span>
            </div>
          </template>
          <div
            v-else-if="task.status === 'completed'"
            class="text-xs text-success"
          >
            {{ t('upload.completed') }} · {{ formatSize(task.fileSize) }}
          </div>
          <div
            v-else-if="task.status === 'failed'"
            class="text-xs text-error"
          >
            {{ task.error }}
          </div>
          <div
            v-else-if="task.status === 'cancelled'"
            class="text-xs text-muted"
          >
            {{ t('upload.cancelled') }}
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="flex items-center justify-between">
        <span class="text-xs text-muted">
          {{ t('upload.tasksInProgress', { n: upload.activeTasks.length }) }}
        </span>
        <UButton
          v-if="!upload.hasActiveTasks"
          :label="t('upload.clearCompleted')"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="upload.clearAll()"
        />
      </div>
    </template>
  </UDrawer>
</template>
