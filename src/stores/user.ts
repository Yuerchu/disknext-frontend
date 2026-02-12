import { defineStore } from 'pinia'
import api from '../utils/api'

interface UserState {
  nickname: string
  email: string | null
  phone: string | null
  fetched: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    nickname: '',
    email: null,
    fetched: false,
    phone: null
  }),

  actions: {
    async fetchProfile() {
      try {
        const { data } = await api.get('/api/v1/user/me')
        this.nickname = data.nickname
        this.email = data.email ?? null
        this.phone = data.phone ?? null
      } catch {
        // ignore
      }
      this.fetched = true
    },

    clear() {
      this.nickname = ''
      this.email = null
      this.phone = null
      this.fetched = false
    }
  }
})
