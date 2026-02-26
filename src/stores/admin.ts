import { defineStore } from 'pinia'
import api from '../utils/api'
import { getApiErrorMessage } from '../utils/apiErrors'

const ADMIN_CHECK_TTL_MS = 45_000
let checkInFlight: Promise<void> | null = null

export const useAdminStore = defineStore('admin', {
  state: () => ({
    isAdmin: false,
    checked: false,
    checkedAt: 0,
    lastError: ''
  }),

  actions: {
    reset() {
      this.isAdmin = false
      this.checked = false
      this.checkedAt = 0
      this.lastError = ''
    },

    async checkAdmin() {
      if (this.checked && Date.now() - this.checkedAt < ADMIN_CHECK_TTL_MS) {
        return
      }

      if (!checkInFlight) {
        checkInFlight = (async () => {
          this.lastError = ''
          try {
            const { status } = await api.get('/api/v1/admin/')
            this.isAdmin = status === 204
          } catch (error: unknown) {
            this.isAdmin = false
            const message = getApiErrorMessage(error, 'Admin check failed')
            const isForbidden = String(message).includes('Access') || message === 'Access denied'
            this.lastError = isForbidden ? '' : message
          } finally {
            this.checked = true
            this.checkedAt = Date.now()
            checkInFlight = null
          }
        })()
      }

      await checkInFlight
    }
  }
})
