import { defineStore } from 'pinia'
import api from '../utils/api'

export const useAdminStore = defineStore('admin', {
  state: () => ({
    isAdmin: false,
    checked: false
  }),

  actions: {
    async checkAdmin() {
      try {
        const { status } = await api.get('/api/v1/admin/')
        this.isAdmin = status === 204
      } catch {
        this.isAdmin = false
      }
      this.checked = true
    }
  }
})
