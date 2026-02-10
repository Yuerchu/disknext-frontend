import { defineStore } from 'pinia'
import axios from 'axios'

interface SiteConfig {
  title: string
  loginCaptcha: boolean
  captchaType: 'default' | 'gcaptcha' | 'cloudflare turnstile'
  captchaKey: string | null
  registerEnabled: boolean
}

export const useSiteConfigStore = defineStore('siteConfig', {
  state: (): SiteConfig & { fetched: boolean } => ({
    title: '',
    loginCaptcha: false,
    captchaType: 'default',
    captchaKey: null,
    registerEnabled: false,
    fetched: false,
  }),

  actions: {
    async fetchConfig() {
      if (this.fetched) return
      try {
        const { data } = await axios.get('/api/v1/site/config')
        this.title = data.title ?? ''
        this.loginCaptcha = data.login_captcha ?? false
        this.captchaType = data.captcha_type ?? 'default'
        this.captchaKey = data.captcha_key ?? null
        this.registerEnabled = data.register_enabled ?? false
        this.fetched = true
      } catch {
        // silently fail — login page will work without captcha
      }
    },
  },
})
