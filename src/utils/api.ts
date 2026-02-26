import axios from 'axios'
import type { AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../stores/auth'
import router from '../router'
import { clearSessionStores } from './session'

const api = axios.create()

const SESSION_REDIRECT_THROTTLE_MS = 1200
let sessionRedirectAt = 0

function redirectToSession() {
  const now = Date.now()
  if (now - sessionRedirectAt < SESSION_REDIRECT_THROTTLE_MS) {
    return
  }
  sessionRedirectAt = now
  clearSessionStores()
  router.push('/session')
}

api.interceptors.request.use((config) => {
  const auth = useAuthStore()
  if (auth.accessToken) {
    config.headers.Authorization = `Bearer ${auth.accessToken}`
  }
  return config
})

type RetriableRequestConfig = (AxiosRequestConfig & InternalAxiosRequestConfig) & { _retried?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const auth = useAuthStore()
    const original = error.config as RetriableRequestConfig | undefined
    if (!original) return Promise.reject(error)
    const isAuthEndpoint = typeof original.url === 'string'
      ? original.url.startsWith('/api/v1/user/session')
      : false

    if (error.response?.status === 401 && !original._retried && !isAuthEndpoint) {
      original._retried = true
      const ok = await auth.refresh()
      if (ok) {
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${auth.accessToken}`
        return api(original)
      }

      redirectToSession()
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !isAuthEndpoint) {
      redirectToSession()
    }

    return Promise.reject(error)
  }
)

export default api
