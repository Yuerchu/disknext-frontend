<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAdminStore } from './stores/admin'
import { zh_cn, en, zh_tw } from '@nuxt/ui/locale'
import { useUserStore } from './stores/user'
import { useStorageStore } from './stores/storage'
import { useSiteConfigStore } from './stores/siteConfig'
import { useTheme } from './composables/useTheme'

const { locale } = useI18n()
const toast = useToast()
const { t } = useI18n()

const uiLocaleMap: Record<string, typeof zh_cn> = { 'zh-CN': zh_cn, en, 'zh-TW': zh_tw }
const uiLocale = computed(() => uiLocaleMap[locale.value] || zh_cn)

const theme = useTheme()
theme.init()

const user = useUserStore()
const storage = useStorageStore()
const siteConfig = useSiteConfigStore()
const admin = useAdminStore()

function showGlobalStoreError(message: string) {
  toast.add({
    title: t('errors.fetchFailed'),
    description: message,
    icon: 'i-lucide-circle-x',
    color: 'error',
  })
}

watch(
  () => user.lastError,
  (msg) => {
    if (!msg) return
    showGlobalStoreError(msg)
    user.lastError = ''
  }
)

watch(
  () => storage.lastError,
  (msg) => {
    if (!msg) return
    showGlobalStoreError(msg)
    storage.lastError = ''
  }
)

watch(
  () => siteConfig.lastError,
  (msg) => {
    if (!msg) return
    showGlobalStoreError(msg)
    siteConfig.lastError = ''
  }
)

watch(
  () => admin.lastError,
  (msg) => {
    if (!msg) return
    showGlobalStoreError(msg)
    admin.lastError = ''
  }
)
</script>

<template>
  <UApp :locale="uiLocale">
    <RouterView />
  </UApp>
</template>
