import './assets/css/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ui from '@nuxt/ui/vue-plugin'

import App from './App.vue'
import router from './router'
import i18n from './i18n'
import { useAuthStore } from './stores/auth'
import { useAdminStore } from './stores/admin'
import { useUserStore } from './stores/user'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(i18n)
app.use(ui)

const auth = useAuthStore()
const admin = useAdminStore()
const user = useUserStore()

router.beforeEach(async (to) => {
  if (to.meta.guest) return true

  if (!auth.isAuthenticated) {
    return '/session'
  }

  if (auth.isAccessExpired) {
    if (auth.isRefreshExpired) {
      auth.logout()
      return '/session'
    }
    // access token 过期但 refresh token 有效，交给 axios 拦截器处理刷新
  }

  if (!user.fetched) {
    await user.fetchProfile()
  }

  if (!admin.checked) {
    await admin.checkAdmin()
  }

  if (to.meta.admin && !admin.isAdmin) {
    return '/home'
  }

  return true
})

app.mount('#app')
