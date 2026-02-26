import { defineStore } from 'pinia'
import api from '../utils/api'
import { getApiErrorMessage } from '../utils/apiErrors'

interface StorageInfo {
  used: number
  free: number
  total: number
}

interface StorageState {
  info: StorageInfo | null
  lastError: string
}

let refreshInFlight: Promise<void> | null = null

export const useStorageStore = defineStore('storage', {
  state: (): StorageState => ({
    info: null,
    lastError: ''
  }),

  getters: {
    percent: (state) => {
      if (!state.info || !state.info.total) return 0
      return Math.round((state.info.used / state.info.total) * 100)
    }
  },

  actions: {
    async refresh() {
      if (refreshInFlight) return refreshInFlight

      this.lastError = ''
      refreshInFlight = (async () => {
        try {
          const { data } = await api.get<StorageInfo>('/api/v1/user/storage')
          this.info = data
          this.lastError = ''
        } catch (error: unknown) {
          this.lastError = getApiErrorMessage(error, 'Failed to fetch storage info')
        }
      })()
      try {
        await refreshInFlight
      } finally {
        refreshInFlight = null
      }
    }
  }
})
