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
  // auth
  auth_email_password_enabled: '0',
  auth_phone_sms_enabled: '0',
  auth_passkey_enabled: '0',
  auth_magic_link_enabled: '0',
  auth_password_required: '0',
  auth_email_binding_required: '0',
  auth_phone_binding_required: '0',
  // register
  require_active: '0',
  // oauth
  github_enabled: '0',
  github_client_id: '',
  github_client_secret: '',
  qq_enabled: '0',
  qq_client_id: '',
  qq_client_secret: '',
})

const original = ref<Record<string, string>>({})

const settingTypeMap: Record<string, string> = {
  auth_email_password_enabled: 'auth',
  auth_phone_sms_enabled: 'auth',
  auth_passkey_enabled: 'auth',
  auth_magic_link_enabled: 'auth',
  auth_password_required: 'auth',
  auth_email_binding_required: 'auth',
  auth_phone_binding_required: 'auth',
  require_active: 'register',
  github_enabled: 'oauth',
  github_client_id: 'oauth',
  github_client_secret: 'oauth',
  qq_enabled: 'oauth',
  qq_client_id: 'oauth',
  qq_client_secret: 'oauth',
}

function boolField(key: keyof typeof form.value) {
  return computed({
    get: () => form.value[key] === '1',
    set: (v: boolean) => { form.value[key] = v ? '1' : '0' },
  })
}

const emailPasswordEnabled = boolField('auth_email_password_enabled')
const phoneSmsEnabled = boolField('auth_phone_sms_enabled')
const passkeyEnabled = boolField('auth_passkey_enabled')
const magicLinkEnabled = boolField('auth_magic_link_enabled')
const passwordRequired = boolField('auth_password_required')
const emailBindingRequired = boolField('auth_email_binding_required')
const phoneBindingRequired = boolField('auth_phone_binding_required')
const requireActive = boolField('require_active')
const oauthProviders = [
  {
    key: 'github',
    name: 'GitHub',
    label: t('adminSession.githubEnabled'),
    description: t('adminSession.githubEnabledDesc'),
    icon: 'i-simple-icons-github',
    enabledField: 'github_enabled' as const,
    idField: 'github_client_id' as const,
    secretField: 'github_client_secret' as const,
    idLabel: t('adminSession.githubClientId'),
    secretLabel: t('adminSession.githubClientSecret'),
  },
  {
    key: 'qq',
    name: 'QQ',
    label: t('adminSession.qqEnabled'),
    description: t('adminSession.qqEnabledDesc'),
    icon: 'i-simple-icons-tencentqq',
    enabledField: 'qq_enabled' as const,
    idField: 'qq_client_id' as const,
    secretField: 'qq_client_secret' as const,
    idLabel: t('adminSession.qqClientId'),
    secretLabel: t('adminSession.qqClientSecret'),
  },
]

const oauthItems = oauthProviders.map(p => ({
  label: p.name,
  icon: p.icon,
  value: p.key,
}))

const oauthProviderMap = Object.fromEntries(
  oauthProviders.map(p => [p.key, p]),
)

async function fetchSettings() {
  loading.value = true
  try {
    const [auth, register, oauth] = await Promise.all([
      api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', { params: { type: 'auth' } }),
      api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', { params: { type: 'register' } }),
      api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', { params: { type: 'oauth' } }),
    ])
    const allSettings = [...auth.data.settings, ...register.data.settings, ...oauth.data.settings]
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
      title: t('adminSession.loadFailed'),
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
      title: t('adminSession.noChanges'),
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
      title: t('adminSession.saveSuccess'),
      icon: 'i-lucide-check-circle',
      color: 'success',
    })
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminSession.saveFailed'),
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
        {{ t('adminSession.title') }}
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
        <!-- Auth Methods -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminSession.authMethods') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UAlert
              color="warning"
              variant="subtle"
              icon="i-lucide-triangle-alert"
              :description="t('adminSession.authMethodsWarning')"
            />
            <UFormField
              :label="t('adminSession.emailPasswordEnabled')"
              :description="t('adminSession.emailPasswordEnabledDesc')"
            >
              <USwitch v-model="emailPasswordEnabled" />
            </UFormField>
            <UFormField
              :label="t('adminSession.phoneSmsEnabled')"
              :description="t('adminSession.phoneSmsEnabledDesc')"
            >
              <USwitch v-model="phoneSmsEnabled" />
            </UFormField>
            <UFormField
              :label="t('adminSession.passkeyEnabled')"
              :description="t('adminSession.passkeyEnabledDesc')"
            >
              <USwitch v-model="passkeyEnabled" />
            </UFormField>
            <UFormField
              :label="t('adminSession.magicLinkEnabled')"
              :description="t('adminSession.magicLinkEnabledDesc')"
            >
              <USwitch v-model="magicLinkEnabled" />
            </UFormField>
          </div>
        </UCard>

        <!-- Auth Requirements -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminSession.authRequirements') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField
              :label="t('adminSession.passwordRequired')"
              :description="t('adminSession.passwordRequiredDesc')"
            >
              <USwitch v-model="passwordRequired" />
            </UFormField>
            <UFormField
              :label="t('adminSession.emailBindingRequired')"
              :description="t('adminSession.emailBindingRequiredDesc')"
            >
              <USwitch v-model="emailBindingRequired" />
            </UFormField>
            <UFormField
              :label="t('adminSession.phoneBindingRequired')"
              :description="t('adminSession.phoneBindingRequiredDesc')"
            >
              <USwitch v-model="phoneBindingRequired" />
            </UFormField>
          </div>
        </UCard>

        <!-- Registration Settings -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminSession.registerSettings') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField
              :label="t('adminSession.requireActive')"
              :description="t('adminSession.requireActiveDesc')"
            >
              <USwitch v-model="requireActive" />
            </UFormField>
          </div>
        </UCard>

        <!-- Social Login -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminSession.oauthSettings') }}
            </h2>
          </template>
          <UAccordion
            type="multiple"
            :items="oauthItems"
            :ui="{ body: 'text-sm pb-3.5 ps-7' }"
          >
            <template #default="{ item }">
              <span class="me-2">{{ item.label }}</span>
              <UBadge
                :label="form[oauthProviderMap[item.value].enabledField] === '1' ? t('common.enabled') : t('common.disabled')"
                :color="form[oauthProviderMap[item.value].enabledField] === '1' ? 'success' : 'neutral'"
                variant="subtle"
                size="sm"
              />
            </template>
            <template #body="{ item }">
              <div class="space-y-4">
                <UFormField
                  :label="oauthProviderMap[item.value].label"
                  :description="oauthProviderMap[item.value].description"
                >
                  <USwitch
                    :model-value="form[oauthProviderMap[item.value].enabledField] === '1'"
                    @update:model-value="v => form[oauthProviderMap[item.value].enabledField] = v ? '1' : '0'"
                  />
                </UFormField>
                <template v-if="form[oauthProviderMap[item.value].enabledField] === '1'">
                  <UFormField :label="oauthProviderMap[item.value].idLabel">
                    <UInput
                      v-model="form[oauthProviderMap[item.value].idField]"
                      class="w-full"
                    />
                  </UFormField>
                  <UFormField :label="oauthProviderMap[item.value].secretLabel">
                    <UInput
                      v-model="form[oauthProviderMap[item.value].secretField]"
                      class="w-full"
                    />
                  </UFormField>
                </template>
              </div>
            </template>
          </UAccordion>
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
