import { defineStore } from 'pinia'
import axios from 'axios'

interface AuthState {
  accessToken: string
  refreshToken: string
  accessExpires: string
  refreshExpires: string
  instanceId: string
}

const STORAGE_KEY = 'auth'

function loadFromStorage(): AuthState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    console.error('[auth] failed to parse cached session info')
    clearStorage()
  }
  return { accessToken: '', refreshToken: '', accessExpires: '', refreshExpires: '', instanceId: '' }
}

function saveToStorage(state: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

let refreshInProgress: Promise<boolean> | null = null

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => loadFromStorage(),

  getters: {
    isAuthenticated: (state) => !!state.accessToken,
    isAccessExpired: (state) => !state.accessExpires || new Date(state.accessExpires) <= new Date(),
    isRefreshExpired: (state) => !state.refreshExpires || new Date(state.refreshExpires) <= new Date()
  },

  actions: {
    setSession(data: {
      access_token: string
      refresh_token: string
      access_expires: string
      refresh_expires: string
      instance_id: string
    }) {
      this.accessToken = data.access_token
      this.refreshToken = data.refresh_token
      this.accessExpires = data.access_expires
      this.refreshExpires = data.refresh_expires
      this.instanceId = data.instance_id
      saveToStorage(this.$state)
    },

    async refresh(): Promise<boolean> {
      if (refreshInProgress) return refreshInProgress

      if (!this.refreshToken || this.isRefreshExpired) {
        this.logout()
        return false
      }

      refreshInProgress = axios.post('/api/v1/user/session/refresh', {
        refresh_token: this.refreshToken
      })
        .then((response) => {
          this.setSession(response.data)
          return true
        })
        .catch((error) => {
          console.error('[auth] session refresh failed', error)
          this.logout()
          return false
        })
        .finally(() => {
          refreshInProgress = null
        })

      return refreshInProgress
    },

    async ensureAuthenticated(): Promise<boolean> {
      if (!this.isAuthenticated) {
        return false
      }

      if (!this.isAccessExpired) {
        return true
      }

      if (this.isRefreshExpired) {
        this.logout()
        return false
      }

      return this.refresh()
    },

    logout() {
      this.accessToken = ''
      this.refreshToken = ''
      this.accessExpires = ''
      this.refreshExpires = ''
      this.instanceId = ''
      clearStorage()
    }
  }
})
