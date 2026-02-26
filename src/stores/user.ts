import { defineStore } from 'pinia'
import api from '../utils/api'
import { getApiErrorMessage } from '../utils/apiErrors'

interface UserState {
  id: string
  nickname: string
  email: string | null
  phone: string | null
  avatar: string
  avatarVersion: number
  fetched: boolean
  lastError: string
}

let fetchProfileInFlight: Promise<void> | null = null

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    id: '',
    nickname: '',
    email: null,
    phone: null,
    avatar: 'default',
    avatarVersion: Date.now(),
    fetched: false,
    lastError: ''
  }),

  getters: {
    avatarUrl(): (size?: number) => string {
      return (size: number = 64) => {
        if (!this.id) return ''
        return `/api/v1/user/avatar/${this.id}/${size}?t=${this.avatarVersion}`
      }
    }
  },

  actions: {
    async fetchProfile() {
      if (this.fetched) {
        return
      }

      if (fetchProfileInFlight) return fetchProfileInFlight

      this.lastError = ''
      fetchProfileInFlight = (async () => {
        try {
          const { data } = await api.get('/api/v1/user/me')
          this.id = data.id
          this.nickname = data.nickname
          this.email = data.email ?? null
          this.phone = data.phone ?? null
          this.avatar = data.avatar ?? 'default'
          this.fetched = true
          this.lastError = ''
        } catch (error: unknown) {
          this.lastError = getApiErrorMessage(error, 'Failed to fetch profile')
          this.fetched = false
        }
      })()
      try {
        await fetchProfileInFlight
      } finally {
        fetchProfileInFlight = null
      }
    },

    refreshAvatar() {
      this.avatarVersion = Date.now()
    },

    clear() {
      this.id = ''
      this.nickname = ''
      this.email = null
      this.phone = null
      this.avatar = 'default'
      this.avatarVersion = Date.now()
      this.fetched = false
      this.lastError = ''
    }
  }
})
