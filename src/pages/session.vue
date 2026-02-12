<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import api from '../utils/api'
import { useAuthStore } from '../stores/auth'
import { useSiteConfigStore } from '../stores/siteConfig'

const router = useRouter()
const auth = useAuthStore()
const siteConfig = useSiteConfigStore()
const { t, locale } = useI18n()

const supportedLocales = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en', name: 'English' },
  { code: 'zh-TW', name: '繁體中文' },
]

function onLocaleChange(code: string) {
  setLocale(code)
}

const fields = computed<AuthFormField[]>(() => [
  {
    name: 'username',
    type: 'text',
    label: t('session.username'),
    placeholder: t('session.usernamePlaceholder'),
    required: true
  },
  {
    name: 'password',
    label: t('session.password'),
    type: 'password',
    placeholder: t('session.passwordPlaceholder'),
    required: true
  }
])

const schema = computed(() => z.object({
  username: z.string({ message: t('session.usernameRequired') }).min(1, t('session.usernameRequired')),
  password: z.string({ message: t('session.passwordRequired') }).min(1, t('session.passwordRequired'))
}))

type Schema = z.output<z.ZodObject<{ username: z.ZodString; password: z.ZodString }>>

const loading = ref(false)
const error = ref('')
const captchaCode = ref('')
const tfaRequired = ref(false)
const otpCode = ref<number[]>([])
const pendingCredentials = ref<{ username: string; password: string } | null>(null)
const captchaContainerRef = ref<HTMLDivElement>()
const captchaLoaded = ref(false)
let captchaWidgetId: number | string | null | undefined

// Load site config on mount
siteConfig.fetchConfig()

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
    document.head.appendChild(script)
  })
}

function renderCaptchaWidget() {
  const key = siteConfig.captchaKey
  if (!captchaContainerRef.value || !key) return

  captchaContainerRef.value.innerHTML = ''

  if (siteConfig.captchaType === 'gcaptcha') {
    captchaWidgetId = grecaptcha.render(captchaContainerRef.value, {
      sitekey: key,
      callback: (token: string) => { captchaCode.value = token },
      'expired-callback': () => { captchaCode.value = '' },
    })
  } else if (siteConfig.captchaType === 'cloudflare turnstile') {
    captchaWidgetId = turnstile.render(captchaContainerRef.value, {
      sitekey: key,
      callback: (token: string) => { captchaCode.value = token },
      'expired-callback': () => { captchaCode.value = '' },
    })
  }
}

function resetCaptcha() {
  captchaCode.value = ''
  if (captchaWidgetId === undefined) return

  if (siteConfig.captchaType === 'gcaptcha') {
    grecaptcha.reset(captchaWidgetId as number)
  } else if (siteConfig.captchaType === 'cloudflare turnstile') {
    turnstile.reset(captchaWidgetId as string)
  }
}

async function initCaptcha() {
  if (!siteConfig.loginCaptcha || !siteConfig.captchaKey) return
  if (siteConfig.captchaType === 'default') return

  try {
    if (siteConfig.captchaType === 'gcaptcha') {
      await loadScript('https://www.google.com/recaptcha/api.js?render=explicit')
      await new Promise<void>((resolve) => {
        if (typeof grecaptcha !== 'undefined') {
          resolve()
        } else {
          const check = setInterval(() => {
            if (typeof grecaptcha !== 'undefined') {
              clearInterval(check)
              resolve()
            }
          }, 100)
        }
      })
    } else if (siteConfig.captchaType === 'cloudflare turnstile') {
      await loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit')
      await new Promise<void>((resolve) => {
        if (typeof turnstile !== 'undefined') {
          resolve()
        } else {
          const check = setInterval(() => {
            if (typeof turnstile !== 'undefined') {
              clearInterval(check)
              resolve()
            }
          }, 100)
        }
      })
    }

    captchaLoaded.value = true
    nextTick(() => renderCaptchaWidget())
  } catch {
    // script load failed — allow login without captcha
  }
}

onMounted(() => {
  watch(
    () => siteConfig.fetched,
    (fetched) => {
      if (fetched) initCaptcha()
    },
    { immediate: true }
  )
})

async function submitLogin(username: string, password: string, otp?: string) {
  loading.value = true
  error.value = ''

  try {
    const params = new URLSearchParams()
    params.append('grant_type', 'password')
    params.append('username', username)
    params.append('password', password)

    if (siteConfig.loginCaptcha && captchaCode.value) {
      params.append('captcha_code', captchaCode.value)
    }

    if (otp) {
      params.append('otp_code', otp)
    }

    const { data } = await api.post('/api/v1/user/session', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    auth.setSession(data)
    router.push('/home')
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { detail?: unknown } }; message?: string }

    if (err.response?.status === 428) {
      pendingCredentials.value = { username, password }
      tfaRequired.value = true
      otpCode.value = []
      error.value = ''
      return
    }

    const detail = err.response?.data?.detail
    if (Array.isArray(detail)) {
      error.value = detail[0]?.msg || t('errors.loginFailed')
    } else if (typeof detail === 'string') {
      error.value = detail
    } else {
      error.value = err.message || t('errors.loginFailedCheck')
    }

    if (tfaRequired.value) {
      otpCode.value = []
    } else {
      resetCaptcha()
    }
  } finally {
    loading.value = false
  }
}

async function onSubmit(payload: FormSubmitEvent<Schema>) {
  if (siteConfig.loginCaptcha && siteConfig.captchaType !== 'default') {
    if (!captchaCode.value) {
      error.value = t('session.captchaRequired')
      return
    }
  }

  await submitLogin(payload.data.username, payload.data.password)
}

function onOtpComplete() {
  if (!pendingCredentials.value) return
  const code = otpCode.value.join('')
  if (code.length !== 6) return
  submitLogin(pendingCredentials.value.username, pendingCredentials.value.password, code)
}

function cancelTfa() {
  tfaRequired.value = false
  pendingCredentials.value = null
  otpCode.value = []
  error.value = ''
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-svh p-4">
    <UPageCard class="w-full max-w-md">
      <!-- 2FA OTP Input -->
      <div
        v-if="tfaRequired"
        class="flex flex-col items-center gap-6 p-6"
      >
        <UIcon
          name="i-lucide-shield-check"
          class="size-10 text-primary"
        />
        <div class="text-center">
          <h2 class="text-lg font-semibold">
            {{ t('session.twoFactorRequired') }}
          </h2>
          <p class="text-sm text-muted mt-1">
            {{ t('session.twoFactorHint') }}
          </p>
        </div>

        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-circle-x"
          :title="error"
          class="w-full"
        />

        <UPinInput
          v-model="otpCode"
          :length="6"
          type="number"
          otp
          autofocus
          :disabled="loading"
          @complete="onOtpComplete"
        />

        <div class="flex gap-2 w-full">
          <UButton
            :label="t('common.cancel')"
            color="neutral"
            variant="outline"
            block
            :disabled="loading"
            @click="cancelTfa"
          />
          <UButton
            :label="t('session.submit')"
            block
            :loading="loading"
            :disabled="otpCode.length !== 6 || otpCode.some(c => c === undefined || c === null)"
            @click="onOtpComplete"
          />
        </div>
      </div>

      <!-- Normal Login Form -->
      <UAuthForm
        v-else
        :schema="schema"
        :fields="fields"
        :loading="loading"
        :title="t('session.title')"
        :description="t('session.description')"
        icon="i-lucide-hard-drive"
        :submit="{ label: t('session.submit'), block: true }"
        @submit="onSubmit"
      >
        <template
          v-if="error"
          #validation
        >
          <UAlert
            color="error"
            icon="i-lucide-circle-x"
            :title="error"
          />
        </template>

        <template
          v-if="siteConfig.loginCaptcha && siteConfig.captchaType !== 'default'"
          #footer
        >
          <div class="flex justify-center">
            <div
              v-if="captchaLoaded"
              ref="captchaContainerRef"
            />
            <p
              v-else
              class="text-sm text-muted"
            >
              {{ t('session.captchaLoading') }}
            </p>
          </div>
        </template>
      </UAuthForm>

      <div class="flex justify-center mt-4">
        <div class="flex items-center gap-1">
          <UIcon
            name="i-lucide-languages"
            class="size-4 text-muted"
          />
          <UDropdownMenu
            :items="[[
              ...supportedLocales.map(l => ({
                label: l.name,
                active: locale === l.code,
                onSelect() { onLocaleChange(l.code) }
              }))
            ]]"
            :content="{ align: 'center' as const }"
          >
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              :label="supportedLocales.find(l => l.code === locale)?.name"
              trailing-icon="i-lucide-chevron-down"
            />
          </UDropdownMenu>
        </div>
      </div>
    </UPageCard>
  </div>
</template>
