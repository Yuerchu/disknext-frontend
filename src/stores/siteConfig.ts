import { defineStore } from 'pinia'
import axios from 'axios'

interface AuthMethod {
  provider: string
  isEnabled: boolean
}

interface SiteConfig {
  title: string
  loginCaptcha: boolean
  regCaptcha: boolean
  captchaType: 'default' | 'gcaptcha' | 'cloudflare turnstile'
  captchaKey: string | null
  registerEnabled: boolean
  authMethods: AuthMethod[]
  passwordRequired: boolean
  emailBindingRequired: boolean
  phoneBindingRequired: boolean
  tosUrl: string
  privacyUrl: string
}

export const useSiteConfigStore = defineStore('siteConfig', {
  state: (): SiteConfig & { fetched: boolean } => ({
    title: '',
    loginCaptcha: false,
    regCaptcha: false,
    captchaType: 'default',
    captchaKey: null,
    registerEnabled: false,
    authMethods: [],
    passwordRequired: false,
    emailBindingRequired: false,
    phoneBindingRequired: false,
    tosUrl: '',
    privacyUrl: '',
    fetched: false,
  }),

  getters: {
    enabledAuthMethods: (state) => state.authMethods.filter(m => m.isEnabled),
    isProviderEnabled: (state) => (provider: string) =>
      state.authMethods.some(m => m.provider === provider && m.isEnabled),
  },

  actions: {
    async fetchConfig() {
      if (this.fetched) return
      try {
        const { data } = await axios.get('/api/v1/site/config')
        this.title = data.title ?? ''
        this.loginCaptcha = data.login_captcha ?? false
        this.regCaptcha = data.reg_captcha ?? false
        this.captchaType = data.captcha_type ?? 'default'
        this.captchaKey = data.captcha_key ?? null
        this.registerEnabled = data.register_enabled ?? false
        this.authMethods = (data.auth_methods ?? []).map((m: { provider: string; is_enabled: boolean }) => ({
          provider: m.provider,
          isEnabled: m.is_enabled,
        }))
        this.passwordRequired = data.password_required ?? false
        this.emailBindingRequired = data.email_binding_required ?? false
        this.phoneBindingRequired = data.phone_binding_required ?? false
        this.tosUrl = data.tos_url ?? ''
        this.privacyUrl = data.privacy_url ?? ''
        this.fetched = true
      } catch {
        // silently fail — login page will work without captcha
      }
    },
  },
})
