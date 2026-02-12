import { defineStore } from 'pinia'
import api from '../utils/api'

interface StorageInfo {
  used: number
  free: number
  total: number
}

interface StorageState {
  info: StorageInfo | null
}

export const useStorageStore = defineStore('storage', {
  state: (): StorageState => ({
    info: null
  }),

  getters: {
    percent: (state) => {
      if (!state.info || !state.info.total) return 0
      return Math.round((state.info.used / state.info.total) * 100)
    }
  },

  actions: {
    async refresh() {
      try {
        const { data } = await api.get<StorageInfo>('/api/v1/user/storage')
        this.info = data
      } catch {
        // silently ignore
      }
    }
  }
})
