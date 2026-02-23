import axios from 'axios'
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/auth'
import router from '../router'
import { clearSessionStores } from './session'

const api = axios.create()

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

let refreshing: Promise<boolean> | null = null
type RetriableRequestConfig = (AxiosRequestConfig & InternalAxiosRequestConfig) & { _retried?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const auth = useAuthStore()
    const original = error.config as RetriableRequestConfig | undefined
    if (!original) return Promise.reject(error)

    if (error.response?.status === 401 && !original._retried) {
      original._retried = true

      if (!refreshing) {
        refreshing = auth.refresh().finally(() => { refreshing = null })
      }

      const ok = await refreshing
      if (ok) {
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${auth.accessToken}`
        return api(original)
      }

      clearSessionStores()
      router.push('/session')
      return Promise.reject(error)
    }

    if (error.response?.status === 401) {
      clearSessionStores()
      router.push('/session')
    }

    return Promise.reject(error)
  }
)

export default api
