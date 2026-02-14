<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import api from '../utils/api'
import { useAuthStore } from '../stores/auth'
import { useSiteConfigStore } from '../stores/siteConfig'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const siteConfig = useSiteConfigStore()
const { t, locale } = useI18n()
const toast = useToast()

const supportedLocales = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en', name: 'English' },
  { code: 'zh-TW', name: '繁體中文' },
]

function onLocaleChange(code: string) {
  setLocale(code)
}

// ---------- Agreement ----------
const showAgreement = computed(() => !!siteConfig.tosUrl || !!siteConfig.privacyUrl)

// ---------- Mode ----------
type AuthMode = 'login' | 'register' | 'magic-link'
const mode = ref<AuthMode>('login')

// ---------- Login Fields ----------
const loginFields = computed<AuthFormField[]>(() => [
  {
    name: 'email',
    type: 'text',
    label: t('session.email'),
    placeholder: t('session.emailPlaceholder'),
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

const loginSchema = computed(() => z.object({
  email: z.string({ message: t('session.emailRequired') }).min(1, t('session.emailRequired')).email(t('session.emailInvalid')),
  password: z.string({ message: t('session.passwordRequired') }).min(1, t('session.passwordRequired'))
}))

type LoginSchema = z.output<z.ZodObject<{ email: z.ZodString; password: z.ZodString }>>

// ---------- Register Fields ----------
const registerFields = computed<AuthFormField[]>(() => [
  {
    name: 'email',
    type: 'text',
    label: t('session.email'),
    placeholder: t('session.emailPlaceholder'),
    required: true
  },
  {
    name: 'password',
    label: t('session.password'),
    type: 'password',
    placeholder: t('session.passwordPlaceholder'),
    required: true
  },
  {
    name: 'confirmPassword',
    label: t('session.confirmPassword'),
    type: 'password',
    placeholder: t('session.confirmPasswordPlaceholder'),
    required: true
  },
  {
    name: 'nickname',
    type: 'text',
    label: t('session.nickname'),
    placeholder: t('session.nicknamePlaceholder')
  }
])

const registerSchema = computed(() => z.object({
  email: z.string({ message: t('session.emailRequired') }).min(1, t('session.emailRequired')).email(t('session.emailInvalid')),
  password: z.string({ message: t('session.passwordRequired') }).min(1, t('session.passwordRequired')).min(8, t('session.passwordMinLength')),
  confirmPassword: z.string({ message: t('session.confirmPasswordRequired') }).min(1, t('session.confirmPasswordRequired')),
  nickname: z.string().optional()
}).refine(data => data.password === data.confirmPassword, {
  message: t('session.passwordMismatch'),
  path: ['confirmPassword']
}))

type RegisterSchema = { email: string; password: string; confirmPassword: string; nickname?: string }

// ---------- Magic Link Fields ----------
const magicLinkFields = computed<AuthFormField[]>(() => [
  {
    name: 'email',
    type: 'text',
    label: t('session.email'),
    placeholder: t('session.emailPlaceholder'),
    required: true
  }
])

const magicLinkSchema = computed(() => z.object({
  email: z.string({ message: t('session.emailRequired') }).min(1, t('session.emailRequired')).email(t('session.emailInvalid'))
}))

type MagicLinkSchema = z.output<z.ZodObject<{ email: z.ZodString }>>

// ---------- Shared State ----------
const loading = ref(false)
const error = ref('')
const captchaCode = ref('')
const tfaRequired = ref(false)
const otpCode = ref<number[]>([])
const pendingCredentials = ref<{ email: string; password: string } | null>(null)
const captchaContainerRef = ref<HTMLDivElement>()
const captchaLoaded = ref(false)
const magicLinkSent = ref(false)
const magicLinkVerifying = ref(false)
let captchaWidgetId: number | string | null | undefined

// ---------- Captcha need ----------
const needCaptcha = computed(() => {
  if (mode.value === 'login') return siteConfig.loginCaptcha
  if (mode.value === 'register') return siteConfig.regCaptcha
  return false
})

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
  if (!needCaptcha.value || !siteConfig.captchaKey) return
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

// Re-render captcha when mode changes
watch(mode, () => {
  error.value = ''
  magicLinkSent.value = false
  if (needCaptcha.value && captchaLoaded.value) {
    nextTick(() => renderCaptchaWidget())
  }
})

onMounted(async () => {
  // Handle magic link callback
  const magicToken = route.query.magic_token as string | undefined
  if (magicToken) {
    magicLinkVerifying.value = true
    try {
      const { data } = await api.post('/api/v1/user/session', {
        provider: 'magic_link',
        identifier: magicToken
      })
      auth.setSession(data)
      router.push('/home')
      return
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } }; message?: string }
      error.value = err.response?.data?.detail || t('session.magicLinkLoginFailed')
    } finally {
      magicLinkVerifying.value = false
    }
  }

  watch(
    () => siteConfig.fetched,
    (fetched) => {
      if (fetched) initCaptcha()
    },
    { immediate: true }
  )
})

// ---------- Login ----------
async function submitLogin(email: string, password: string, otp?: string) {
  loading.value = true
  error.value = ''

  try {
    const body: Record<string, string> = {
      provider: 'email_password',
      identifier: email,
      credential: password,
    }

    if (otp) {
      body.two_fa_code = otp
    }

    if (needCaptcha.value && captchaCode.value) {
      body.captcha = captchaCode.value
    }

    const { data } = await api.post('/api/v1/user/session', body)

    auth.setSession(data)
    router.push('/home')
  } catch (e: unknown) {
    const err = e as { response?: { status?: number; data?: { detail?: unknown } }; message?: string }

    if (err.response?.status === 428) {
      pendingCredentials.value = { email, password }
      tfaRequired.value = true
      otpCode.value = []
      error.value = ''
      return
    }

    const detail = err.response?.data?.detail
    if (err.response?.status === 403) {
      error.value = t('session.accountBanned')
    } else if (typeof detail === 'string') {
      error.value = detail
    } else if (Array.isArray(detail)) {
      error.value = detail[0]?.msg || t('errors.loginFailed')
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

async function onLoginSubmit(payload: FormSubmitEvent<LoginSchema>) {
  if (needCaptcha.value && siteConfig.captchaType !== 'default') {
    if (!captchaCode.value) {
      error.value = t('session.captchaRequired')
      return
    }
  }

  await submitLogin(payload.data.email, payload.data.password)
}

// ---------- Register ----------
async function onRegisterSubmit(payload: FormSubmitEvent<RegisterSchema>) {
  if (needCaptcha.value && siteConfig.captchaType !== 'default') {
    if (!captchaCode.value) {
      error.value = t('session.captchaRequired')
      return
    }
  }

  loading.value = true
  error.value = ''

  try {
    const body: Record<string, unknown> = {
      provider: 'email_password',
      identifier: payload.data.email,
      credential: payload.data.password
    }

    if (payload.data.nickname) {
      body.nickname = payload.data.nickname
    }

    if (needCaptcha.value && captchaCode.value) {
      body.captcha = captchaCode.value
    }

    await api.post('/api/v1/user', body)

    toast.add({ title: t('session.registerSuccess'), color: 'success' })

    // Auto-login after successful registration
    try {
      await submitLogin(payload.data.email, payload.data.password)
    } catch {
      mode.value = 'login'
    }
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: unknown } }; message?: string }
    const detail = err.response?.data?.detail
    if (typeof detail === 'string') {
      error.value = detail
    } else {
      error.value = t('session.registerFailed')
    }
    resetCaptcha()
  } finally {
    loading.value = false
  }
}

// ---------- Magic Link ----------
async function onMagicLinkSubmit(payload: FormSubmitEvent<MagicLinkSchema>) {
  loading.value = true
  error.value = ''

  try {
    await api.post('/api/v1/user/magic-link', {
      email: payload.data.email
    })
    magicLinkSent.value = true
  } catch (e: unknown) {
    const err = e as { response?: { data?: { detail?: string } }; message?: string }
    error.value = err.response?.data?.detail || t('errors.loginFailed')
  } finally {
    loading.value = false
  }
}

// ---------- 2FA ----------
function onOtpComplete() {
  if (!pendingCredentials.value) return
  const code = otpCode.value.join('')
  if (code.length !== 6) return
  submitLogin(pendingCredentials.value.email, pendingCredentials.value.password, code)
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
      <!-- Magic Link Verifying -->
      <div
        v-if="magicLinkVerifying"
        class="flex flex-col items-center gap-4 p-6"
      >
        <UIcon
          name="i-lucide-loader-circle"
          class="size-10 text-primary animate-spin"
        />
        <p class="text-sm text-muted">
          {{ t('session.magicLinkVerifying') }}
        </p>
        <UAlert
          v-if="error"
          color="error"
          icon="i-lucide-circle-x"
          :title="error"
          class="w-full"
        />
      </div>

      <!-- 2FA OTP Input -->
      <div
        v-else-if="tfaRequired"
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

      <!-- Magic Link Sent -->
      <div
        v-else-if="magicLinkSent"
        class="flex flex-col items-center gap-4 p-6"
      >
        <UIcon
          name="i-lucide-mail-check"
          class="size-10 text-primary"
        />
        <div class="text-center">
          <h2 class="text-lg font-semibold">
            {{ t('session.magicLinkSent') }}
          </h2>
          <p class="text-sm text-muted mt-2">
            {{ t('session.magicLinkSentHint') }}
          </p>
        </div>
        <UButton
          :label="t('session.backToLogin')"
          color="neutral"
          variant="outline"
          @click="magicLinkSent = false; mode = 'login'"
        />
      </div>

      <!-- Login Form -->
      <UAuthForm
        v-else-if="mode === 'login'"
        :schema="loginSchema"
        :fields="loginFields"
        :loading="loading"
        :title="t('session.loginTitle')"
        :description="t('session.description')"
        icon="i-lucide-hard-drive"
        :submit="{ label: t('session.submit'), block: true }"
        :providers="[]"
        @submit="onLoginSubmit"
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

        <template #description>
          <p class="text-sm text-muted">
            {{ t('session.description') }}
          </p>
          <p
            v-if="siteConfig.registerEnabled && siteConfig.isProviderEnabled('email_password')"
            class="text-sm mt-1"
          >
            {{ t('session.noAccount') }}
            <UButton
              variant="link"
              :label="t('session.registerLink')"
              class="p-0"
              @click="mode = 'register'"
            />
          </p>
        </template>

        <template #footer>
          <div class="flex flex-col gap-3">
            <div
              v-if="needCaptcha && siteConfig.captchaType !== 'default'"
              class="flex justify-center"
            >
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
            <div
              v-if="siteConfig.isProviderEnabled('magic_link')"
              class="text-center"
            >
              <UButton
                variant="link"
                :label="t('session.useMagicLink')"
                @click="mode = 'magic-link'"
              />
            </div>
            <p
              v-if="showAgreement"
              class="text-xs text-center text-muted"
            >
              {{ t('session.agreementText') }}
              <ULink
                v-if="siteConfig.tosUrl"
                :to="siteConfig.tosUrl"
                target="_blank"
                class="text-primary font-medium"
              >
                {{ t('session.termsOfService') }}
              </ULink>
              <template v-if="siteConfig.tosUrl && siteConfig.privacyUrl">
                {{ t('session.and') }}
              </template>
              <ULink
                v-if="siteConfig.privacyUrl"
                :to="siteConfig.privacyUrl"
                target="_blank"
                class="text-primary font-medium"
              >
                {{ t('session.privacyPolicy') }}
              </ULink>
            </p>
          </div>
        </template>
      </UAuthForm>

      <!-- Register Form -->
      <UAuthForm
        v-else-if="mode === 'register'"
        :schema="registerSchema"
        :fields="registerFields"
        :loading="loading"
        :title="t('session.registerTitle')"
        icon="i-lucide-hard-drive"
        :submit="{ label: t('session.registerSubmit'), block: true }"
        @submit="onRegisterSubmit"
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

        <template #description>
          <p class="text-sm">
            {{ t('session.hasAccount') }}
            <UButton
              variant="link"
              :label="t('session.loginLink')"
              class="p-0"
              @click="mode = 'login'"
            />
          </p>
        </template>

        <template #footer>
          <div class="flex flex-col gap-3">
            <div
              v-if="needCaptcha && siteConfig.captchaType !== 'default'"
              class="flex justify-center"
            >
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
            <p
              v-if="showAgreement"
              class="text-xs text-center text-muted"
            >
              {{ t('session.agreementText') }}
              <ULink
                v-if="siteConfig.tosUrl"
                :to="siteConfig.tosUrl"
                target="_blank"
                class="text-primary font-medium"
              >
                {{ t('session.termsOfService') }}
              </ULink>
              <template v-if="siteConfig.tosUrl && siteConfig.privacyUrl">
                {{ t('session.and') }}
              </template>
              <ULink
                v-if="siteConfig.privacyUrl"
                :to="siteConfig.privacyUrl"
                target="_blank"
                class="text-primary font-medium"
              >
                {{ t('session.privacyPolicy') }}
              </ULink>
            </p>
          </div>
        </template>
      </UAuthForm>

      <!-- Magic Link Form -->
      <UAuthForm
        v-else-if="mode === 'magic-link'"
        :schema="magicLinkSchema"
        :fields="magicLinkFields"
        :loading="loading"
        :title="t('session.magicLinkTitle')"
        :description="t('session.magicLinkDesc')"
        icon="i-lucide-mail"
        :submit="{ label: t('session.sendMagicLink'), block: true }"
        @submit="onMagicLinkSubmit"
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

        <template #description>
          <p class="text-sm text-muted">
            {{ t('session.magicLinkDesc') }}
          </p>
          <p class="text-sm mt-1">
            <UButton
              variant="link"
              :label="t('session.backToLogin')"
              class="p-0"
              @click="mode = 'login'"
            />
          </p>
        </template>

        <template
          v-if="showAgreement"
          #footer
        >
          <p class="text-xs text-center text-muted">
            {{ t('session.agreementText') }}
            <ULink
              v-if="siteConfig.tosUrl"
              :to="siteConfig.tosUrl"
              target="_blank"
              class="text-primary font-medium"
            >
              {{ t('session.termsOfService') }}
            </ULink>
            <template v-if="siteConfig.tosUrl && siteConfig.privacyUrl">
              {{ t('session.and') }}
            </template>
            <ULink
              v-if="siteConfig.privacyUrl"
              :to="siteConfig.privacyUrl"
              target="_blank"
              class="text-primary font-medium"
            >
              {{ t('session.privacyPolicy') }}
            </ULink>
          </p>
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
