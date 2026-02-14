<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { NavigationMenuItem } from '@nuxt/ui'
import { useAdminStore } from '../stores/admin'
import { useStorageStore } from '../stores/storage'

const admin = useAdminStore()
const storage = useStorageStore()
const { t } = useI18n()

onMounted(() => {
  storage.refresh()
})

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

const items = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: t('nav.myFiles'),
      icon: 'i-lucide-folder',
      to: '/home'
    },
    {
      label: t('nav.images'),
      icon: 'i-lucide-image'
    },
    {
      label: t('nav.videos'),
      icon: 'i-lucide-video'
    },
    {
      label: t('nav.music'),
      icon: 'i-lucide-music'
    },
    {
      label: t('nav.documents'),
      icon: 'i-lucide-file-text'
    },
    {
      label: t('nav.sharedWithMe'),
      icon: 'i-lucide-share-2'
    },
    {
      label: t('nav.trash'),
      icon: 'i-lucide-trash-2',
      to: '/trash'
    }
  ],
  [
    {
      label: t('nav.myShares'),
      icon: 'i-lucide-send',
      to: '/shares'
    },
    {
      label: t('nav.mountAndClient'),
      icon: 'i-lucide-hard-drive'
    },
    {
      label: t('nav.tasksAndDownloads'),
      icon: 'i-lucide-download'
    },
    {
      label: t('nav.shop'),
      icon: 'i-lucide-shopping-bag'
    }
  ]
])

const adminItems = computed<NavigationMenuItem[]>(() => [
  {
    label: t('user.adminPanel'),
    icon: 'i-lucide-shield',
    badge: t('user.admin'),
    to: '/admin'
  }
])

</script>

<template>
  <UDashboardSidebar
    collapsible
    resizable
  >
    <template #header="{ collapsed }">
      <RouterLink to="/home">
        <AppLogo
          v-if="!collapsed"
          class="h-auto w-full shrink-0 p-3"
        />
        <UIcon
          v-else
          name="i-lucide-hard-drive"
          class="size-5 text-primary mx-auto"
        />
      </RouterLink>
    </template>

    <template #default="{ collapsed }">
      <UNavigationMenu
        :collapsed="collapsed"
        :items="items[0]"
        orientation="vertical"
      />

      <UNavigationMenu
        :collapsed="collapsed"
        :items="items[1]"
        orientation="vertical"
      />

      <UNavigationMenu
        v-if="admin.isAdmin"
        :collapsed="collapsed"
        :items="adminItems"
        orientation="vertical"
      />
    </template>

    <template #footer="{ collapsed }">
      <div
        v-if="!collapsed && storage.info"
        class="w-full px-1 py-1 space-y-1.5"
      >
        <div class="flex items-center justify-between text-xs text-muted">
          <span>{{ t('nav.storage') }}</span>
          <ULink
            to="#"
            class="text-primary font-medium"
          >
            {{ t('nav.storageDetails') }}
          </ULink>
        </div>
        <UProgress
          :model-value="storage.percent"
          size="xs"
        />
        <p class="text-xs text-muted">
          {{ formatSize(storage.info.used) }} / {{ formatSize(storage.info.total) }}
        </p>
      </div>
      <UIcon
        v-else-if="collapsed"
        name="i-lucide-database"
        class="size-5 text-muted mx-auto"
      />
    </template>
  </UDashboardSidebar>
</template>
