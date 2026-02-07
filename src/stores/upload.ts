import { defineStore } from 'pinia'
import i18n from '../i18n'
import api from '../utils/api'

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
  speed: number // bytes per second
  startTime: number
  lastSpeedUpdate: number
  lastBytesForSpeed: number
  status: 'uploading' | 'completed' | 'failed' | 'cancelled'
  error: string
}

interface UploadState {
  tasks: UploadTask[]
  drawerOpen: boolean
}

let taskCounter = 0

export const useUploadStore = defineStore('upload', {
  state: (): UploadState => ({
    tasks: [],
    drawerOpen: false
  }),

  getters: {
    activeTasks: (state) => state.tasks.filter(t => t.status === 'uploading'),
    hasActiveTasks(): boolean {
      return this.activeTasks.length > 0
    }
  },

  actions: {
    addTask(file: File, session: UploadSession) {
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
        bytesUploaded: 0,
        speed: 0,
        startTime: now,
        lastSpeedUpdate: now,
        lastBytesForSpeed: 0,
        status: 'uploading',
        error: ''
      }
      this.tasks.push(task)
      this.drawerOpen = true
      this.processChunks(task.id)
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

          const { data: result } = await api.post(
            `/api/v1/file/upload/${task.sessionId}/${i}`,
            formData
          )

          task.uploadedChunks = result.uploaded_chunks
          task.bytesUploaded = Math.min(task.uploadedChunks * task.chunkSize, task.fileSize)

          // Update speed (recalculate every 500ms to smooth out fluctuations)
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
      } catch (e: any) {
        if (task.status !== 'cancelled') {
          task.status = 'failed'
          task.error = e?.response?.data?.detail || i18n.global.t('upload.failed')
        }
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
    },

    clearAll() {
      this.tasks = this.tasks.filter(t => t.status === 'uploading')
      if (this.tasks.length === 0) {
        this.drawerOpen = false
      }
    },

    removeTask(taskId: string) {
      this.tasks = this.tasks.filter(t => t.id !== taskId)
      if (this.tasks.length === 0) {
        this.drawerOpen = false
      }
    }
  }
})
