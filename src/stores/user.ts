import { defineStore } from 'pinia'
import api from '../utils/api'

interface UserState {
  nickname: string
  email: string
  fetched: boolean
}

export const useUserStore = defineStore('user', {
  state: (): UserState => ({
    nickname: '',
    email: '',
    fetched: false
  }),

  actions: {
    async fetchProfile() {
      try {
        const { data } = await api.get('/api/v1/user/me')
        this.nickname = data.nickname
        this.email = data.email
      } catch {
        // ignore
      }
      this.fetched = true
    },

    clear() {
      this.nickname = ''
      this.email = ''
      this.fetched = false
    }
  }
})
