import axios from 'axios'
import { useAuthStore } from '../stores/auth'
import router from '../router'

const api = axios.create()

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

let refreshing: Promise<boolean> | null = null

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const auth = useAuthStore()
    const original = error.config

    if (error.response?.status === 401 && !original._retried) {
      original._retried = true

      if (!refreshing) {
        refreshing = auth.refresh().finally(() => { refreshing = null })
      }

      const ok = await refreshing
      if (ok) {
        original.headers.Authorization = `Bearer ${auth.accessToken}`
        return api(original)
      }

      auth.logout()
      router.push('/session')
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      auth.logout()
      router.push('/session')
    }

    return Promise.reject(error)
  }
)

export default api
