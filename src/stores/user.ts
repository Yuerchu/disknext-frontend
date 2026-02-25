import { defineStore } from 'pinia'
import api from '../utils/api'

interface UserState {
  id: string
  nickname: string
  email: string | null
  phone: string | null
  avatar: string
  avatarVersion: number
  fetched: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    id: '',
    nickname: '',
    email: null,
    phone: null,
    avatar: 'default',
    avatarVersion: Date.now(),
    fetched: false
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
      try {
        const { data } = await api.get('/api/v1/user/me')
        this.id = data.id
        this.nickname = data.nickname
        this.email = data.email ?? null
        this.phone = data.phone ?? null
        this.avatar = data.avatar ?? 'default'
      } catch {
        // ignore
      }
      this.fetched = true
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
    }
  }
})
