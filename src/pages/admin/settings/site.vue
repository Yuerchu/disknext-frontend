<script setup lang="ts">
import { ref, onMounted } from 'vue'
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
  siteName: '',
  siteDes: '',
  siteURL: '',
  logo_light: '',
  logo_dark: '',
  footer_code: '',
  site_notice: '',
  tos_url: '',
  privacy_url: '',
  pwa_small_icon: '',
  pwa_medium_icon: '',
  pwa_large_icon: '',
})

const original = ref<Record<string, string>>({})

const settingTypeMap: Record<string, string> = {
  siteName: 'basic',
  siteDes: 'basic',
  siteURL: 'basic',
  logo_light: 'basic',
  logo_dark: 'basic',
  footer_code: 'basic',
  site_notice: 'basic',
  tos_url: 'basic',
  privacy_url: 'basic',
  pwa_small_icon: 'pwa',
  pwa_medium_icon: 'pwa',
  pwa_large_icon: 'pwa',
}

async function fetchSettings() {
  loading.value = true
  try {
    const [basic, pwa] = await Promise.all([
      api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', { params: { type: 'basic' } }),
      api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', { params: { type: 'pwa' } }),
    ])
    const allSettings = [...basic.data.settings, ...pwa.data.settings]
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
      title: t('adminSite.loadFailed'),
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
      title: t('adminSite.noChanges'),
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
      title: t('adminSite.saveSuccess'),
      icon: 'i-lucide-check-circle',
      color: 'success',
    })
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminSite.saveFailed'),
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
        {{ t('adminSite.title') }}
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
        <!-- Basic Info -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminSite.basicInfo') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField
              :label="t('adminSite.siteName')"
              :description="t('adminSite.siteNameDesc')"
            >
              <UInput
                v-model="form.siteName"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="t('adminSite.siteDes')"
              :description="t('adminSite.siteDesDesc')"
            >
              <UInput
                v-model="form.siteDes"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="t('adminSite.siteURL')"
              :description="t('adminSite.siteURLDesc')"
            >
              <UInput
                v-model="form.siteURL"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- Logo -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminSite.logo') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField
              :label="t('adminSite.logoLight')"
              :description="t('adminSite.logoLightDesc')"
            >
              <UInput
                v-model="form.logo_light"
                placeholder="https://example.com/logo-light.svg"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="t('adminSite.logoDark')"
              :description="t('adminSite.logoDarkDesc')"
            >
              <UInput
                v-model="form.logo_dark"
                placeholder="https://example.com/logo-dark.svg"
                class="w-full"
              />
            </UFormField>
            <div
              v-if="form.logo_light || form.logo_dark"
              class="flex items-center gap-6"
            >
              <div
                v-if="form.logo_light"
                class="flex flex-col items-center gap-1"
              >
                <div class="bg-white rounded-lg p-3 border border-default">
                  <img
                    :src="form.logo_light"
                    alt="Light logo preview"
                    class="h-8 w-auto object-contain"
                  >
                </div>
                <span class="text-xs text-muted">{{ t('adminSite.previewLight') }}</span>
              </div>
              <div
                v-if="form.logo_dark"
                class="flex flex-col items-center gap-1"
              >
                <div class="bg-neutral-900 rounded-lg p-3 border border-default">
                  <img
                    :src="form.logo_dark"
                    alt="Dark logo preview"
                    class="h-8 w-auto object-contain"
                  >
                </div>
                <span class="text-xs text-muted">{{ t('adminSite.previewDark') }}</span>
              </div>
            </div>
          </div>
        </UCard>

        <!-- Announcement & Footer -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminSite.announcementAndFooter') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField
              :label="t('adminSite.footerCode')"
              :description="t('adminSite.footerCodeDesc')"
            >
              <UTextarea
                v-model="form.footer_code"
                :rows="4"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="t('adminSite.siteNotice')"
              :description="t('adminSite.siteNoticeDesc')"
            >
              <UTextarea
                v-model="form.site_notice"
                :rows="6"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- Links -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminSite.links') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField
              :label="t('adminSite.tosUrl')"
              :description="t('adminSite.tosUrlDesc')"
            >
              <UInput
                v-model="form.tos_url"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="t('adminSite.privacyUrl')"
              :description="t('adminSite.privacyUrlDesc')"
            >
              <UInput
                v-model="form.privacy_url"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- Icons -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminSite.icons') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField
              :label="t('adminSite.smallIcon')"
              :description="t('adminSite.smallIconDesc')"
            >
              <UInput
                v-model="form.pwa_small_icon"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="t('adminSite.mediumIcon')"
              :description="t('adminSite.mediumIconDesc')"
            >
              <UInput
                v-model="form.pwa_medium_icon"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="t('adminSite.largeIcon')"
              :description="t('adminSite.largeIconDesc')"
            >
              <UInput
                v-model="form.pwa_large_icon"
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
