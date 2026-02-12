<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import type { TabsItem, DropdownMenuItem } from '@nuxt/ui'
import type { AxiosError } from 'axios'
import { useAdminStore } from '../stores/admin'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'
import api from '../utils/api'
import QRCode from 'qrcode'

const router = useRouter()
const toast = useToast()
const admin = useAdminStore()
const user = useUserStore()
const auth = useAuthStore()
const { t, locale } = useI18n()

interface UserSettings {
  id: string
  email: string
  nickname: string
  created_at: string
  group_name: string
  group_expires: string | null
  language: string
  timezone: number
  two_factor: boolean
}

const settings = ref<UserSettings | null>(null)
const loading = ref(true)

async function fetchSettings() {
  loading.value = true
  try {
    const { data } = await api.get<UserSettings>('/api/v1/user/settings/')
    settings.value = data
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    const message = err?.response?.data?.detail || t('settings.loadFailed')
    toast.add({
      title: t('settings.loadFailed'),
      description: message,
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

// 2FA setup state
const tfaSetupModalOpen = ref(false)
const tfaSetupLoading = ref(false)
const tfaSetupToken = ref('')
const tfaQrDataUrl = ref('')
const tfaSecret = ref('')
const tfaCode = ref<number[]>([])
const tfaEnabling = ref(false)

// 2FA disable state
const tfaDisableModalOpen = ref(false)
const tfaDisabling = ref(false)

const tfaCodeComplete = computed(() => tfaCode.value.length === 6 && tfaCode.value.every(c => c !== undefined && c !== null))

function extractSecretFromUri(uri: string): string {
  try {
    return new URL(uri).searchParams.get('secret') || ''
  } catch {
    return ''
  }
}

function onTwoFactorToggle() {
  if (!settings.value) return
  if (settings.value.two_factor) {
    tfaDisableModalOpen.value = true
  } else {
    openTfaSetup()
  }
}

async function openTfaSetup() {
  tfaSetupModalOpen.value = true
  tfaSetupLoading.value = true
  tfaSetupToken.value = ''
  tfaQrDataUrl.value = ''
  tfaSecret.value = ''
  tfaCode.value = []
  try {
    const { data } = await api.get<{ setup_token: string; uri: string }>('/api/v1/user/settings/2fa')
    tfaSetupToken.value = data.setup_token
    tfaSecret.value = extractSecretFromUri(data.uri)
    tfaQrDataUrl.value = await QRCode.toDataURL(data.uri, { width: 200, margin: 2 })
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    toast.add({
      title: t('settings.twoFactorSetupFailed'),
      description: err?.response?.data?.detail || t('settings.twoFactorSetupFailed'),
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
    tfaSetupModalOpen.value = false
  } finally {
    tfaSetupLoading.value = false
  }
}

async function copySecret() {
  try {
    await navigator.clipboard.writeText(tfaSecret.value)
    toast.add({
      title: t('settings.twoFactorSecretCopied'),
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch {
    // clipboard API not available
  }
}

async function confirmEnableTfa() {
  const code = tfaCode.value.join('')
  if (code.length !== 6) return
  tfaEnabling.value = true
  try {
    await api.post('/api/v1/user/settings/2fa', {
      setup_token: tfaSetupToken.value,
      code
    })
    if (settings.value) settings.value.two_factor = true
    tfaSetupModalOpen.value = false
    toast.add({
      title: t('settings.twoFactorEnableSuccess'),
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    toast.add({
      title: t('settings.twoFactorEnableFailed'),
      description: err?.response?.data?.detail || t('settings.twoFactorEnableFailed'),
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    tfaEnabling.value = false
  }
}

async function confirmDisableTfa() {
  tfaDisabling.value = true
  try {
    await api.delete('/api/v1/user/settings/2fa')
    if (settings.value) settings.value.two_factor = false
    tfaDisableModalOpen.value = false
    toast.add({
      title: t('settings.twoFactorDisableSuccess'),
      icon: 'i-lucide-check',
      color: 'success'
    })
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    toast.add({
      title: t('settings.twoFactorDisableFailed'),
      description: err?.response?.data?.detail || t('settings.twoFactorDisableFailed'),
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    tfaDisabling.value = false
  }
}

onMounted(() => {
  admin.checkAdmin()
  fetchSettings()
})

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function formatTimezone(offset: number): string {
  const sign = offset >= 0 ? '+' : '-'
  const abs = Math.abs(offset)
  return `UTC${sign}${abs}`
}

const languageMap: Record<string, string> = {
  'zh-CN': '简体中文',
  'en': 'English',
  'zh-TW': '繁體中文'
}

const tabItems: TabsItem[] = [
  {
    label: t('settings.profile'),
    icon: 'i-lucide-user',
    slot: 'profile' as const
  },
  {
    label: t('settings.preferences'),
    icon: 'i-lucide-sliders-horizontal',
    slot: 'preferences' as const
  }
]

const userMenuItems = computed<DropdownMenuItem[][]>(() => {
  const header: DropdownMenuItem[] = [
    {
      label: `${user.nickname}${admin.isAdmin ? ' ' + t('user.admin') : ''}`,
      description: user.email,
      type: 'label'
    }
  ]

  const actions: DropdownMenuItem[] = []
  if (admin.isAdmin) {
    actions.push({
      label: t('user.adminPanel'),
      icon: 'i-lucide-shield',
      onSelect() {
        router.push('/admin')
      }
    })
  }
  actions.push({
    label: t('user.settingsAndAbout'),
    icon: 'i-lucide-settings',
    onSelect() {
      router.push('/settings')
    }
  })
  actions.push({
    label: t('user.language'),
    icon: 'i-lucide-languages',
    children: [
      { label: '简体中文', onSelect() { setLocale('zh-CN') } },
      { label: 'English', onSelect() { setLocale('en') } },
      { label: '繁體中文', onSelect() { setLocale('zh-TW') } }
    ]
  })

  const logout: DropdownMenuItem[] = [
    {
      label: t('user.logout'),
      icon: 'i-lucide-log-out',
      color: 'error',
      onSelect() {
        auth.logout()
        user.clear()
        router.push('/session')
      }
    }
  ]

  return [header, actions, logout]
})
</script>

<template>
  <UDashboardGroup>
    <AppSidebar />

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <UDashboardSidebarCollapse />
            <span class="text-sm font-semibold">{{ t('settings.title') }}</span>
          </template>

          <template #right>
            <UColorModeButton />
            <UDropdownMenu
              :items="userMenuItems"
              :content="{ align: 'end' }"
            >
              <UAvatar
                :alt="user.nickname"
                size="sm"
              />
            </UDropdownMenu>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="p-6 max-w-2xl">
          <div v-if="loading">
            <div
              v-for="i in 6"
              :key="i"
              class="flex items-center gap-3 py-3"
            >
              <USkeleton class="h-4 w-24" />
              <USkeleton class="h-9 flex-1" />
            </div>
          </div>

          <UTabs
            v-else-if="settings"
            :items="tabItems"
            variant="link"
            class="w-full"
          >
            <template #profile>
              <div class="flex flex-col gap-4 pt-4">
                <UFormField :label="t('settings.email')">
                  <UInput
                    :model-value="settings.email"
                    disabled
                    class="w-full"
                  />
                </UFormField>

                <UFormField :label="t('settings.nickname')">
                  <UInput
                    :model-value="settings.nickname"
                    disabled
                    class="w-full"
                  />
                </UFormField>

                <USeparator />

                <dl class="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
                  <dt class="text-muted">
                    {{ t('settings.uid') }}
                  </dt>
                  <dd class="font-mono text-muted select-all">
                    {{ settings.id }}
                  </dd>

                  <dt class="text-muted">
                    {{ t('settings.createdAt') }}
                  </dt>
                  <dd>
                    {{ formatDate(settings.created_at) }}
                  </dd>

                  <dt class="text-muted">
                    {{ t('settings.group') }}
                  </dt>
                  <dd>
                    <UBadge
                      :label="settings.group_name"
                      variant="subtle"
                      size="sm"
                    />
                  </dd>

                  <dt class="text-muted">
                    {{ t('settings.groupExpires') }}
                  </dt>
                  <dd>
                    {{ settings.group_expires ? formatDate(settings.group_expires) : t('settings.noExpiry') }}
                  </dd>
                </dl>
              </div>
            </template>

            <template #preferences>
              <div class="flex flex-col gap-4 pt-4">
                <UFormField :label="t('settings.language')">
                  <UInput
                    :model-value="languageMap[settings.language] || settings.language"
                    disabled
                    class="w-full"
                  />
                </UFormField>

                <UFormField :label="t('settings.timezone')">
                  <UInput
                    :model-value="formatTimezone(settings.timezone)"
                    disabled
                    class="w-full"
                  />
                </UFormField>

                <UFormField :label="t('settings.twoFactor')">
                  <div class="flex items-center gap-2">
                    <USwitch
                      :model-value="settings.two_factor"
                      @update:model-value="onTwoFactorToggle"
                    />
                    <span class="text-sm text-muted">
                      {{ settings.two_factor ? t('settings.twoFactorEnabled') : t('settings.twoFactorDisabled') }}
                    </span>
                  </div>
                </UFormField>
              </div>
            </template>
          </UTabs>
        </div>
      </template>
    </UDashboardPanel>

    <!-- Enable 2FA Modal -->
    <UModal
      v-model:open="tfaSetupModalOpen"
      :title="t('settings.twoFactorSetupTitle')"
      :dismissible="!tfaEnabling"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <div
          v-if="tfaSetupLoading"
          class="flex items-center justify-center py-12"
        >
          <UIcon
            name="i-lucide-loader-circle"
            class="size-8 animate-spin text-muted"
          />
        </div>
        <div
          v-else
          class="flex flex-col gap-4"
        >
          <p class="text-sm text-muted">
            {{ t('settings.twoFactorSetupDesc') }}
          </p>

          <div class="flex justify-center">
            <img
              :src="tfaQrDataUrl"
              alt="QR Code"
              class="rounded-lg"
            >
          </div>

          <UFormField :label="t('settings.twoFactorSecret')">
            <div class="flex gap-2">
              <UInput
                :model-value="tfaSecret"
                readonly
                class="flex-1 font-mono"
              />
              <UButton
                icon="i-lucide-copy"
                color="neutral"
                variant="outline"
                @click="copySecret"
              />
            </div>
          </UFormField>

          <UFormField :label="t('settings.twoFactorCode')">
            <UPinInput
              v-model="tfaCode"
              :length="6"
              type="number"
              otp
              autofocus
              @complete="confirmEnableTfa"
            />
          </UFormField>
        </div>
      </template>

      <template #footer>
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="outline"
          :disabled="tfaEnabling"
          @click="tfaSetupModalOpen = false"
        />
        <UButton
          :label="t('settings.twoFactorEnable')"
          :disabled="!tfaCodeComplete || tfaSetupLoading"
          :loading="tfaEnabling"
          @click="confirmEnableTfa"
        />
      </template>
    </UModal>

    <!-- Disable 2FA Confirm Modal -->
    <UModal
      v-model:open="tfaDisableModalOpen"
      :title="t('settings.twoFactorDisableTitle')"
      :dismissible="!tfaDisabling"
      :ui="{ footer: 'justify-end' }"
    >
      <template #body>
        <p class="text-sm text-muted">
          {{ t('settings.twoFactorDisableConfirm') }}
        </p>
      </template>

      <template #footer>
        <UButton
          :label="t('common.cancel')"
          color="neutral"
          variant="outline"
          :disabled="tfaDisabling"
          @click="tfaDisableModalOpen = false"
        />
        <UButton
          :label="t('common.confirm')"
          color="error"
          :loading="tfaDisabling"
          @click="confirmDisableTfa"
        />
      </template>
    </UModal>
  </UDashboardGroup>
</template>
