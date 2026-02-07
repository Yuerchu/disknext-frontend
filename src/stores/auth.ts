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
  } catch { /* ignore invalid JSON */ }
  return { accessToken: '', refreshToken: '', accessExpires: '', refreshExpires: '', instanceId: '' }
}

function saveToStorage(state: AuthState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

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
      if (!this.refreshToken || this.isRefreshExpired) {
        this.logout()
        return false
      }
      try {
        const { data } = await axios.post('/api/v1/user/session/refresh', {
          refresh_token: this.refreshToken
        })
        this.setSession(data)
        return true
      } catch {
        this.logout()
        return false
      }
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
