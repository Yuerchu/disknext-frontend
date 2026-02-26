import { defineStore } from 'pinia'
import i18n from '../i18n'
import api from '../utils/api'
import { getApiErrorMessage, RETRYABLE_STATUSES } from '../utils/apiErrors'

export interface UploadSession {
  id: string
  chunk_size: number
  total_chunks: number
  uploaded_chunks: number
}

export interface UploadTask {
  id: string
  fileName: string
  fileSize: number
  file: File
  sessionId: string
  chunkSize: number
  totalChunks: number
  uploadedChunks: number
  bytesUploaded: number
  speed: number // bytes per second (instantaneous)
  startTime: number
  lastSpeedUpdate: number
  lastBytesForSpeed: number
  status: 'queued' | 'uploading' | 'completed' | 'failed' | 'cancelled'
  error: string
  parentId: string
  policyId: string
}

type SpeedMode = 'instant' | 'average'
type SortOrder = 'newest' | 'oldest'
export type TaskFilter = 'all' | 'active' | 'completed' | 'failed'

interface UploadSettings {
  taskFilter: TaskFilter
  sortOrder: SortOrder
  speedMode: SpeedMode
  maxConcurrent: number
}

interface UploadState extends UploadSettings {
  tasks: UploadTask[]
  drawerOpen: boolean
}

const SETTINGS_KEY = 'disknext-upload-settings'

function loadSettings(): Partial<UploadSettings> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

function saveSettings(state: UploadState) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({
    taskFilter: state.taskFilter,
    sortOrder: state.sortOrder,
    speedMode: state.speedMode,
    maxConcurrent: state.maxConcurrent,
  }))
}

let taskCounter = 0
const MAX_CHUNK_RETRIES = 3

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isRetryableUploadError(error: unknown): boolean {
  const detail = (error as { response?: { status?: number } })
  const status = detail.response?.status
  const isNetwork = !status
  return isNetwork || (status !== undefined && RETRYABLE_STATUSES.has(status))
}

export const useUploadStore = defineStore('upload', {
  state: (): UploadState => {
    const saved = loadSettings()
    return {
      tasks: [],
      drawerOpen: false,
      taskFilter: saved.taskFilter ?? 'all',
      sortOrder: saved.sortOrder ?? 'oldest',
      speedMode: saved.speedMode ?? 'instant',
      maxConcurrent: saved.maxConcurrent ?? 3,
    }
  },

  getters: {
    activeTasks: (state) => state.tasks.filter(t => t.status === 'uploading' || t.status === 'queued'),
    hasActiveTasks(): boolean {
      return this.activeTasks.length > 0
    },
    failedTasks: (state) => state.tasks.filter(t => t.status === 'failed'),
    hasFailedTasks(): boolean {
      return this.failedTasks.length > 0
    },
    displayTasks(state): UploadTask[] {
      let list = state.tasks
      switch (state.taskFilter) {
        case 'active':
          list = list.filter(t => t.status === 'uploading' || t.status === 'queued')
          break
        case 'completed':
          list = list.filter(t => t.status === 'completed')
          break
        case 'failed':
          list = list.filter(t => t.status === 'failed')
          break
      }
      if (state.sortOrder === 'newest') {
        return [...list].reverse()
      }
      return list
    },
  },

  actions: {
    addTask(file: File, session: UploadSession, parentId: string, policyId: string) {
      const now = Date.now()
      const task: UploadTask = {
        id: `upload-${++taskCounter}`,
        fileName: file.name,
        fileSize: file.size,
        file,
        sessionId: session.id,
        chunkSize: session.chunk_size,
        totalChunks: session.total_chunks,
        uploadedChunks: session.uploaded_chunks,
        bytesUploaded: Math.min(session.uploaded_chunks * session.chunk_size, file.size),
        speed: 0,
        startTime: now,
        lastSpeedUpdate: now,
        lastBytesForSpeed: 0,
        status: 'queued',
        error: '',
        parentId,
        policyId,
      }
      this.tasks.push(task)
      this.drawerOpen = true
      this.tryProcessNext()
    },

    tryProcessNext() {
      const uploadingCount = this.tasks.filter(t => t.status === 'uploading').length
      const queued = this.tasks.filter(t => t.status === 'queued')
      const slots = this.maxConcurrent - uploadingCount

      for (let i = 0; i < Math.min(slots, queued.length); i++) {
        const task = queued[i]
        task.status = 'uploading'
        const now = Date.now()
        task.startTime = now
        task.lastSpeedUpdate = now
        task.lastBytesForSpeed = 0
        this.processChunks(task.id)
      }
    },

    async processChunks(taskId: string) {
      const task = this.tasks.find(t => t.id === taskId)
      if (!task) return

      try {
        for (let i = task.uploadedChunks; i < task.totalChunks; i++) {
          if (task.status === 'cancelled') return

          const start = i * task.chunkSize
          const end = Math.min(start + task.chunkSize, task.fileSize)
          const chunk = task.file.slice(start, end)

          const formData = new FormData()
          formData.append('file', chunk)

          let attempt = 0
          let result: { uploaded_chunks: number; is_complete?: boolean } | null = null

          while (attempt < MAX_CHUNK_RETRIES) {
            try {
              const { data: uploadResult } = await api.post<{ uploaded_chunks: number; is_complete?: boolean }>(
                `/api/v1/file/upload/${task.sessionId}/${i}`,
                formData
              )
              const normalizedUploadedChunks = Math.min(
                Math.max(uploadResult.uploaded_chunks, task.uploadedChunks),
                task.totalChunks
              )
              result = uploadResult
              task.uploadedChunks = normalizedUploadedChunks
              task.bytesUploaded = Math.min(task.uploadedChunks * task.chunkSize, task.fileSize)

              // 保护：如果服务端已确认更多分片上传成功，则直接跳过已确认分片
              if (task.uploadedChunks > i + 1) {
                i = task.uploadedChunks - 1
              }

              break
            } catch (error) {
              attempt++
              if (attempt >= MAX_CHUNK_RETRIES || !isRetryableUploadError(error)) {
                throw error
              }
              const backoff = Math.min(1000 * attempt, 4000)
              await sleep(backoff)
            }
          }

          if (!result) return

          const now = Date.now()
          const elapsed = now - task.lastSpeedUpdate
          if (elapsed >= 500) {
            const bytesDelta = task.bytesUploaded - task.lastBytesForSpeed
            task.speed = Math.round(bytesDelta / (elapsed / 1000))
            task.lastSpeedUpdate = now
            task.lastBytesForSpeed = task.bytesUploaded
          }

          if (result.is_complete) {
            task.status = 'completed'
            return
          }
        }

        task.status = 'completed'
      } catch (e: unknown) {
        if (task.status !== 'cancelled') {
          task.status = 'failed'
          task.error = getApiErrorMessage(
            e,
            i18n.global.t('upload.failed'),
            { 409: i18n.global.t('errors.conflict') }
          )
        }
      } finally {
        this.tryProcessNext()
      }
    },

    async cancelTask(taskId: string) {
      const task = this.tasks.find(t => t.id === taskId)
      if (!task) return

      task.status = 'cancelled'

      if (task.sessionId) {
        try {
          await api.delete(`/api/v1/file/upload/${task.sessionId}`)
        } catch {
          // ignore cleanup errors
        }
      }

      this.tryProcessNext()
    },

    async retryTask(taskId: string) {
      const task = this.tasks.find(t => t.id === taskId)
      if (!task || task.status !== 'failed') return

      try {
        if (task.uploadedChunks > 0 && task.sessionId) {
          // Prefer resuming the original upload session to avoid duplicate uploads
          task.bytesUploaded = task.uploadedChunks * task.chunkSize
        } else {
          const { data: session } = await api.put<UploadSession>('/api/v1/file/upload/', {
            file_name: task.fileName,
            file_size: task.fileSize,
            parent_id: task.parentId,
            policy_id: task.policyId,
          })

          task.sessionId = session.id
          task.chunkSize = session.chunk_size
          task.totalChunks = session.total_chunks
          task.uploadedChunks = session.uploaded_chunks
          task.bytesUploaded = 0
        }
        task.speed = 0
        task.error = ''
        task.status = 'queued'

        const now = Date.now()
        task.startTime = now
        task.lastSpeedUpdate = now
        task.lastBytesForSpeed = 0

        this.tryProcessNext()
      } catch (e: unknown) {
        task.error = getApiErrorMessage(e, i18n.global.t('upload.retryFailed'), {
          409: i18n.global.t('errors.conflict')
        })
      }
    },

    async retryAllFailed() {
      const failedIds = this.tasks
        .filter(t => t.status === 'failed')
        .map(t => t.id)

      for (const id of failedIds) {
        await this.retryTask(id)
      }
    },

    clearAll() {
      this.tasks = this.tasks.filter(t => t.status === 'uploading' || t.status === 'queued')
      if (this.tasks.length === 0) {
        this.drawerOpen = false
      }
    },

    removeTask(taskId: string) {
      this.tasks = this.tasks.filter(t => t.id !== taskId)
      if (this.tasks.length === 0) {
        this.drawerOpen = false
      }
    },

    setTaskFilter(val: TaskFilter) {
      this.taskFilter = val
      saveSettings(this.$state)
    },
    setSortOrder(val: SortOrder) {
      this.sortOrder = val
      saveSettings(this.$state)
    },
    setSpeedMode(val: SpeedMode) {
      this.speedMode = val
      saveSettings(this.$state)
    },
    setMaxConcurrent(n: number) {
      this.maxConcurrent = Math.max(1, Math.min(20, n))
      saveSettings(this.$state)
      this.tryProcessNext()
    },
  }
})
