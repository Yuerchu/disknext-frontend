<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AxiosError } from 'axios'
import api from '../../../utils/api'

type ApiErrorResponse = { detail?: string }

interface Setting {
  type: string
  name: string
  value: string
}

const { t } = useI18n()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)

const form = ref({
  // captcha type
  captcha_type: 'default',
  captcha_CaptchaLen: '6',
  captcha_width: '240',
  captcha_height: '60',
  captcha_mode: '3',
  captcha_IsShowHollowLine: '0',
  captcha_IsShowNoiseDot: '1',
  captcha_IsShowNoiseText: '0',
  captcha_IsShowSlimeLine: '1',
  captcha_IsShowSineLine: '0',
  captcha_ComplexOfNoiseText: '0',
  captcha_ComplexOfNoiseDot: '0',
  captcha_ReCaptchaKey: '',
  captcha_ReCaptchaSecret: '',
  captcha_CloudflareKey: '',
  captcha_CloudflareSecret: '',
  // login type
  login_captcha: '0',
  reg_captcha: '0',
  reg_email_captcha: '0',
})

const original = ref<Record<string, string>>({})

const settingTypeMap: Record<string, string> = {
  captcha_type: 'captcha',
  captcha_CaptchaLen: 'captcha',
  captcha_width: 'captcha',
  captcha_height: 'captcha',
  captcha_mode: 'captcha',
  captcha_IsShowHollowLine: 'captcha',
  captcha_IsShowNoiseDot: 'captcha',
  captcha_IsShowNoiseText: 'captcha',
  captcha_IsShowSlimeLine: 'captcha',
  captcha_IsShowSineLine: 'captcha',
  captcha_ComplexOfNoiseText: 'captcha',
  captcha_ComplexOfNoiseDot: 'captcha',
  captcha_ReCaptchaKey: 'captcha',
  captcha_ReCaptchaSecret: 'captcha',
  captcha_CloudflareKey: 'captcha',
  captcha_CloudflareSecret: 'captcha',
  login_captcha: 'login',
  reg_captcha: 'login',
  reg_email_captcha: 'login',
}

function boolField(key: keyof typeof form.value) {
  return computed({
    get: () => form.value[key] === '1',
    set: (v: boolean) => { form.value[key] = v ? '1' : '0' },
  })
}

const loginCaptcha = boolField('login_captcha')
const regCaptcha = boolField('reg_captcha')
const regEmailCaptcha = boolField('reg_email_captcha')
const showHollowLine = boolField('captcha_IsShowHollowLine')
const showNoiseDot = boolField('captcha_IsShowNoiseDot')
const showNoiseText = boolField('captcha_IsShowNoiseText')
const showSlimeLine = boolField('captcha_IsShowSlimeLine')
const showSineLine = boolField('captcha_IsShowSineLine')

const typeOptions = computed(() => [
  { label: t('adminCaptcha.typeDefault'), value: 'default' },
  { label: t('adminCaptcha.typeRecaptcha'), value: 'recaptcha' },
  { label: t('adminCaptcha.typeCloudflare'), value: 'cloudflare' },
])

const modeOptions = computed(() => [
  { label: '0 - ' + t('adminCaptcha.modeDigit'), value: '0' },
  { label: '1 - ' + t('adminCaptcha.modeLetter'), value: '1' },
  { label: '2 - ' + t('adminCaptcha.modeMixed'), value: '2' },
  { label: '3 - ' + t('adminCaptcha.modeArith'), value: '3' },
])

async function fetchSettings() {
  loading.value = true
  try {
    const [captcha, login] = await Promise.all([
      api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', { params: { type: 'captcha' } }),
      api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', { params: { type: 'login' } }),
    ])
    const allSettings = [...captcha.data.settings, ...login.data.settings]
    const formVal = form.value as Record<string, string>
    const orig: Record<string, string> = {}
    for (const s of allSettings) {
      if (s.name in formVal) {
        formVal[s.name] = s.value
        orig[s.name] = s.value
      }
    }
    original.value = orig
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminCaptcha.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  const changes: Setting[] = []
  const formVal = form.value as Record<string, string>
  for (const [name, value] of Object.entries(formVal)) {
    if (value !== (original.value[name] ?? '')) {
      changes.push({ type: settingTypeMap[name], name, value })
    }
  }
  if (changes.length === 0) {
    toast.add({
      title: t('adminCaptcha.noChanges'),
      icon: 'i-lucide-info',
      color: 'neutral',
    })
    return
  }

  saving.value = true
  try {
    await api.patch('/api/v1/admin/settings', { settings: changes })
    for (const c of changes) {
      original.value[c.name] = c.value
    }
    toast.add({
      title: t('adminCaptcha.saveSuccess'),
      icon: 'i-lucide-check-circle',
      color: 'success',
    })
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminCaptcha.saveFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => fetchSettings())
</script>

<template>
  <div class="p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        {{ t('adminCaptcha.title') }}
      </h1>
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <template v-else>
      <div class="space-y-6 max-w-3xl">
        <!-- Captcha Type -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminCaptcha.captchaType') }}
            </h2>
          </template>
          <UFormField
            :label="t('adminCaptcha.captchaType')"
            :description="t('adminCaptcha.captchaTypeDesc')"
          >
            <USelect
              v-model="form.captcha_type"
              :items="typeOptions"
              value-key="value"
              class="w-full"
            />
          </UFormField>
        </UCard>

        <!-- Enable Scenarios -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminCaptcha.enableScenarios') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField
              :label="t('adminCaptcha.loginCaptcha')"
              :description="t('adminCaptcha.loginCaptchaDesc')"
            >
              <USwitch v-model="loginCaptcha" />
            </UFormField>
            <UFormField
              :label="t('adminCaptcha.regCaptcha')"
              :description="t('adminCaptcha.regCaptchaDesc')"
            >
              <USwitch v-model="regCaptcha" />
            </UFormField>
            <UFormField
              :label="t('adminCaptcha.regEmailCaptcha')"
              :description="t('adminCaptcha.regEmailCaptchaDesc')"
            >
              <USwitch v-model="regEmailCaptcha" />
            </UFormField>
          </div>
        </UCard>

        <!-- Built-in Captcha Settings -->
        <UCard v-if="form.captcha_type === 'default'">
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminCaptcha.builtinSettings') }}
            </h2>
          </template>
          <div class="space-y-4">
            <!-- Dimensions -->
            <h3 class="text-sm font-medium text-muted">
              {{ t('adminCaptcha.dimensions') }}
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('adminCaptcha.captchaWidth')">
                <UInput
                  v-model="form.captcha_width"
                  type="number"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('adminCaptcha.captchaHeight')">
                <UInput
                  v-model="form.captcha_height"
                  type="number"
                  class="w-full"
                />
              </UFormField>
            </div>

            <!-- Characters -->
            <UFormField
              :label="t('adminCaptcha.captchaMode')"
              :description="t('adminCaptcha.captchaModeDesc')"
            >
              <USelect
                v-model="form.captcha_mode"
                :items="modeOptions"
                value-key="value"
                class="w-full"
              />
            </UFormField>
            <UFormField
              v-if="form.captcha_mode !== '3'"
              :label="t('adminCaptcha.captchaLen')"
              :description="t('adminCaptcha.captchaLenDesc')"
            >
              <UInput
                v-model="form.captcha_CaptchaLen"
                type="number"
                class="w-full"
              />
            </UFormField>

            <!-- Effects -->
            <h3 class="text-sm font-medium text-muted">
              {{ t('adminCaptcha.effects') }}
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('adminCaptcha.showHollowLine')">
                <USwitch v-model="showHollowLine" />
              </UFormField>
              <UFormField :label="t('adminCaptcha.showNoiseDot')">
                <USwitch v-model="showNoiseDot" />
              </UFormField>
              <UFormField :label="t('adminCaptcha.showNoiseText')">
                <USwitch v-model="showNoiseText" />
              </UFormField>
              <UFormField :label="t('adminCaptcha.showSlimeLine')">
                <USwitch v-model="showSlimeLine" />
              </UFormField>
              <UFormField :label="t('adminCaptcha.showSineLine')">
                <USwitch v-model="showSineLine" />
              </UFormField>
            </div>

            <!-- Noise Complexity -->
            <h3 class="text-sm font-medium text-muted">
              {{ t('adminCaptcha.noiseComplexity') }}
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('adminCaptcha.complexOfNoiseText')">
                <UInput
                  v-model="form.captcha_ComplexOfNoiseText"
                  type="number"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('adminCaptcha.complexOfNoiseDot')">
                <UInput
                  v-model="form.captcha_ComplexOfNoiseDot"
                  type="number"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </UCard>

        <!-- ReCaptcha Settings -->
        <UCard v-if="form.captcha_type === 'recaptcha'">
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminCaptcha.recaptchaSettings') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField :label="t('adminCaptcha.recaptchaKey')">
              <UInput
                v-model="form.captcha_ReCaptchaKey"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('adminCaptcha.recaptchaSecret')">
              <UInput
                v-model="form.captcha_ReCaptchaSecret"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- Cloudflare Turnstile Settings -->
        <UCard v-if="form.captcha_type === 'cloudflare'">
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminCaptcha.cloudflareSettings') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField :label="t('adminCaptcha.cloudflareKey')">
              <UInput
                v-model="form.captcha_CloudflareKey"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('adminCaptcha.cloudflareSecret')">
              <UInput
                v-model="form.captcha_CloudflareSecret"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <div class="flex justify-end">
          <UButton
            :label="t('common.save')"
            icon="i-lucide-save"
            :loading="saving"
            @click="saveSettings"
          />
        </div>
      </div>
    </template>
  </div>
</template>
