<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import type { NavigationMenuItem, DropdownMenuItem } from '@nuxt/ui'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const user = useUserStore()
const auth = useAuthStore()
const { t } = useI18n()

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: `${user.nickname} ${t('user.admin')}`,
      description: user.email,
      type: 'label'
    }
  ],
  [
    {
      label: t('user.adminPanel'),
      icon: 'i-lucide-shield',
      onSelect() {
        router.push('/admin')
      }
    },
    {
      label: t('user.settingsAndAbout'),
      icon: 'i-lucide-settings',
      onSelect() {
        router.push('/settings')
      }
    },
    {
      label: t('user.language'),
      icon: 'i-lucide-languages',
      children: [
        { label: '简体中文', onSelect() { setLocale('zh-CN') } },
        { label: 'English', onSelect() { setLocale('en') } },
        { label: '繁體中文', onSelect() { setLocale('zh-TW') } }
      ]
    }
  ],
  [
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
])

const items = computed<NavigationMenuItem[][]>(() => [
  [
    {
      label: t('admin.home'),
      icon: 'i-lucide-home',
      to: '/admin/home'
    }
  ],
  [
    {
      label: t('admin.settings'),
      icon: 'i-lucide-settings',
      defaultOpen: false,
      children: [
        { label: t('admin.siteInfo'), to: '/admin/settings/site' },
        { label: t('admin.userSession'), to: '/admin/settings/session' },
        { label: t('admin.captcha'), to: '/admin/settings/captcha' },
        { label: t('admin.media'), to: '/admin/settings/media' },
        { label: t('admin.vas'), to: '/admin/settings/vas' },
        { label: t('admin.mail'), to: '/admin/settings/mail' },
        { label: t('admin.queue'), to: '/admin/settings/queue' },
        { label: t('admin.appearance'), to: '/admin/settings/appearance' },
        { label: t('admin.events'), to: '/admin/settings/events' },
        { label: t('admin.server'), to: '/admin/settings/server' }
      ]
    },
    {
      label: t('admin.filesystem'),
      icon: 'i-lucide-folder-cog',
      defaultOpen: false,
      children: [
        { label: t('admin.fsSettings'), to: '/admin/fs/settings' },
        { label: t('admin.fsIcons'), to: '/admin/fs/icons' },
        { label: t('admin.fsViewers'), to: '/admin/fs/viewers' },
        { label: t('admin.fsProperties'), to: '/admin/fs/properties' }
      ]
    },
    {
      label: t('admin.policies'),
      icon: 'i-lucide-database',
      to: '/admin/policies'
    },
    {
      label: t('admin.nodes'),
      icon: 'i-lucide-server',
      to: '/admin/nodes'
    },
    {
      label: t('admin.groups'),
      icon: 'i-lucide-users',
      to: '/admin/groups'
    },
    {
      label: t('admin.users'),
      icon: 'i-lucide-user',
      to: '/admin/users'
    },
    {
      label: t('admin.files'),
      icon: 'i-lucide-file',
      to: '/admin/files'
    },
    {
      label: t('admin.fileBlobs'),
      icon: 'i-lucide-binary',
      to: '/admin/blobs'
    },
    {
      label: t('admin.shares'),
      icon: 'i-lucide-share-2',
      to: '/admin/shares'
    },
    {
      label: t('admin.orders'),
      icon: 'i-lucide-receipt',
      to: '/admin/orders'
    },
    {
      label: t('admin.events'),
      icon: 'i-lucide-bell',
      to: '/admin/events'
    },
    {
      label: t('admin.reports'),
      icon: 'i-lucide-flag',
      to: '/admin/reports'
    },
    {
      label: t('admin.oauth'),
      icon: 'i-lucide-key',
      to: '/admin/oauth'
    }
  ],
  [
    {
      label: t('admin.backToHome'),
      icon: 'i-lucide-arrow-left',
      onSelect() {
        router.push('/home')
      }
    }
  ]
])
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar
      collapsible
      resizable
    >
      <template #header="{ collapsed }">
        <RouterLink to="/admin">
          <AppLogo
            v-if="!collapsed"
            class="h-5 w-auto shrink-0"
          />
          <UIcon
            v-else
            name="i-lucide-shield"
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
          :collapsed="collapsed"
          :items="items[2]"
          orientation="vertical"
        />
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar
          :title="t('admin.panel')"
          icon="i-lucide-shield"
        >
          <template #leading>
            <UDashboardSidebarCollapse />
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
        <RouterView />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
