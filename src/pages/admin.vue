<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import type { NavigationMenuItem, DropdownMenuItem, CommandPaletteItem, CommandPaletteGroup } from '@nuxt/ui'
import { useUserStore } from '../stores/user'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const user = useUserStore()
const auth = useAuthStore()
const { t } = useI18n()

const searchGroups = computed<CommandPaletteGroup<CommandPaletteItem>[]>(() => [
  {
    id: 'settings',
    label: t('search.adminSettings'),
    items: [
      { label: t('admin.siteInfo'), icon: 'i-lucide-globe', onSelect() { router.push('/admin/settings/site') } },
      { label: t('admin.userSession'), icon: 'i-lucide-key', onSelect() { router.push('/admin/settings/session') } },
      { label: t('admin.captcha'), icon: 'i-lucide-shield-check', onSelect() { router.push('/admin/settings/captcha') } },
      { label: t('admin.media'), icon: 'i-lucide-image', onSelect() { router.push('/admin/settings/media') } },
      { label: t('admin.vas'), icon: 'i-lucide-gem', onSelect() { router.push('/admin/settings/vas') } },
      { label: t('admin.mail'), icon: 'i-lucide-mail', onSelect() { router.push('/admin/settings/mail') } },
      { label: t('admin.queue'), icon: 'i-lucide-list-ordered', onSelect() { router.push('/admin/settings/queue') } },
      { label: t('admin.appearance'), icon: 'i-lucide-palette', onSelect() { router.push('/admin/settings/appearance') } },
      { label: `${t('admin.events')} (${t('admin.settings')})`, icon: 'i-lucide-zap', onSelect() { router.push('/admin/settings/events') } },
      { label: t('admin.server'), icon: 'i-lucide-server', onSelect() { router.push('/admin/settings/server') } }
    ]
  },
  {
    id: 'filesystem',
    label: t('search.adminFilesystem'),
    items: [
      { label: t('admin.fsSettings'), icon: 'i-lucide-settings', onSelect() { router.push('/admin/fs/settings') } },
      { label: t('admin.fsIcons'), icon: 'i-lucide-image', onSelect() { router.push('/admin/fs/icons') } },
      { label: t('admin.fsViewers'), icon: 'i-lucide-eye', onSelect() { router.push('/admin/fs/viewers') } },
      { label: t('admin.fsProperties'), icon: 'i-lucide-list', onSelect() { router.push('/admin/fs/properties') } }
    ]
  },
  {
    id: 'management',
    label: t('search.adminManagement'),
    items: [
      { label: t('admin.policies'), icon: 'i-lucide-database', onSelect() { router.push('/admin/policies') } },
      { label: t('admin.nodes'), icon: 'i-lucide-server', onSelect() { router.push('/admin/nodes') } },
      { label: t('admin.groups'), icon: 'i-lucide-users', onSelect() { router.push('/admin/groups') } },
      { label: t('admin.users'), icon: 'i-lucide-user', onSelect() { router.push('/admin/users') } },
      { label: t('admin.files'), icon: 'i-lucide-file', onSelect() { router.push('/admin/files') } },
      { label: t('admin.fileBlobs'), icon: 'i-lucide-binary', onSelect() { router.push('/admin/blobs') } },
      { label: t('admin.shares'), icon: 'i-lucide-share-2', onSelect() { router.push('/admin/shares') } },
      { label: t('admin.tasks'), icon: 'i-lucide-list-checks', onSelect() { router.push('/admin/tasks') } },
      { label: t('admin.orders'), icon: 'i-lucide-receipt', onSelect() { router.push('/admin/orders') } },
      { label: t('admin.events'), icon: 'i-lucide-bell', onSelect() { router.push('/admin/events') } },
      { label: t('admin.reports'), icon: 'i-lucide-flag', onSelect() { router.push('/admin/reports') } },
      { label: t('admin.oauth'), icon: 'i-lucide-key', onSelect() { router.push('/admin/oauth') } }
    ]
  }
])

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: `${user.nickname} ${t('user.admin')}`,
      description: user.email ?? '',
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
      label: t('admin.tasks'),
      icon: 'i-lucide-list-checks',
      to: '/admin/tasks'
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
        <RouterLink
          to="/admin"
          class="flex items-center justify-center w-full"
        >
          <AppLogo
            v-if="!collapsed"
            class="h-8 w-auto max-w-full shrink-0"
          />
          <UIcon
            v-else
            name="i-lucide-shield"
            class="size-5 text-primary"
          />
        </RouterLink>
      </template>

      <template #default="{ collapsed }">
        <UDashboardSearchButton :collapsed="collapsed" />

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

    <UDashboardSearch
      :placeholder="t('search.settings')"
      :groups="searchGroups"
      :color-mode="false"
    />

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
                :src="user.avatarUrl(64)"
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
