<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import { useAuthStore } from '../stores/auth'
import type { ButtonProps, PageFeatureProps } from '@nuxt/ui'

const router = useRouter()
const auth = useAuthStore()
const { t, locale } = useI18n()

if (auth.isAuthenticated) {
  router.replace('/home')
}

const supportedLocales = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en', name: 'English' },
  { code: 'zh-TW', name: '繁體中文' },
]

function onLocaleChange(code: string) {
  setLocale(code)
}

const heroLinks = computed<ButtonProps[]>(() => [
  {
    label: t('landing.getStarted'),
    icon: 'i-lucide-arrow-right',
    trailing: true,
    to: '/session',
  },
  {
    label: t('landing.learnMore'),
    color: 'neutral' as const,
    variant: 'subtle' as const,
    icon: 'i-lucide-chevron-down',
    trailing: true,
    to: '#features',
  },
])

const features = computed<PageFeatureProps[]>(() => [
  {
    title: t('landing.featureFileManage'),
    description: t('landing.featureFileManageDesc'),
    icon: 'i-lucide-folder-open',
  },
  {
    title: t('landing.featureMultiDevice'),
    description: t('landing.featureMultiDeviceDesc'),
    icon: 'i-lucide-monitor-smartphone',
  },
  {
    title: t('landing.featureShare'),
    description: t('landing.featureShareDesc'),
    icon: 'i-lucide-share-2',
  },
  {
    title: t('landing.featureSecurity'),
    description: t('landing.featureSecurityDesc'),
    icon: 'i-lucide-shield-check',
  },
  {
    title: t('landing.featureStorage'),
    description: t('landing.featureStorageDesc'),
    icon: 'i-lucide-database',
  },
  {
    title: t('landing.featureWebDAV'),
    description: t('landing.featureWebDAVDesc'),
    icon: 'i-lucide-globe',
  },
])

const securityFeatures = computed<PageFeatureProps[]>(() => [
  {
    title: t('landing.securityFeature1'),
    description: t('landing.securityFeature1Desc'),
    icon: 'i-lucide-server',
  },
  {
    title: t('landing.securityFeature2'),
    description: t('landing.securityFeature2Desc'),
    icon: 'i-lucide-lock',
  },
  {
    title: t('landing.securityFeature3'),
    description: t('landing.securityFeature3Desc'),
    icon: 'i-lucide-key-round',
  },
])

const storageFeatures = computed<PageFeatureProps[]>(() => [
  {
    title: t('landing.storageFeature1'),
    description: t('landing.storageFeature1Desc'),
    icon: 'i-lucide-hard-drive',
  },
  {
    title: t('landing.storageFeature2'),
    description: t('landing.storageFeature2Desc'),
    icon: 'i-lucide-cloud',
  },
  {
    title: t('landing.storageFeature3'),
    description: t('landing.storageFeature3Desc'),
    icon: 'i-lucide-network',
  },
])

const ctaLinks = computed<ButtonProps[]>(() => [
  {
    label: t('landing.getStarted'),
    icon: 'i-lucide-arrow-right',
    trailing: true,
    to: '/session',
  },
])
</script>

<template>
  <div class="min-h-svh flex flex-col">
    <UHeader
      title="DiskNext"
      to="/"
    >
      <template #title>
        <AppLogo class="h-5 w-auto" />
      </template>

      <template #right>
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
            :content="{ align: 'end' as const }"
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
        <UColorModeButton />
        <UButton
          :label="t('landing.login')"
          icon="i-lucide-log-in"
          color="primary"
          to="/session"
        />
      </template>
    </UHeader>

    <UMain>
      <UPageHero
        :headline="t('landing.heroHeadline')"
        :title="t('landing.heroTitle')"
        :description="t('landing.heroDescription')"
        :links="heroLinks"
      >
        <div class="w-full max-w-2xl mx-auto rounded-xl border border-default bg-elevated/50 shadow-xl p-8 flex items-center justify-center gap-6">
          <div class="flex flex-col items-center gap-3">
            <div class="size-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <UIcon
                name="i-lucide-folder-open"
                class="size-8 text-primary"
              />
            </div>
            <div class="size-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <UIcon
                name="i-lucide-upload"
                class="size-8 text-primary"
              />
            </div>
          </div>
          <div class="size-24 rounded-2xl bg-primary/15 flex items-center justify-center">
            <UIcon
              name="i-lucide-hard-drive"
              class="size-12 text-primary"
            />
          </div>
          <div class="flex flex-col items-center gap-3">
            <div class="size-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <UIcon
                name="i-lucide-shield-check"
                class="size-8 text-primary"
              />
            </div>
            <div class="size-16 rounded-xl bg-primary/10 flex items-center justify-center">
              <UIcon
                name="i-lucide-share-2"
                class="size-8 text-primary"
              />
            </div>
          </div>
        </div>
      </UPageHero>

      <UPageSection
        id="features"
        :headline="t('landing.featuresHeadline')"
        :title="t('landing.featuresTitle')"
        :description="t('landing.featuresDescription')"
        :features="features"
      />

      <UPageSection
        :headline="t('landing.securityHeadline')"
        :title="t('landing.securityTitle')"
        :description="t('landing.securityDescription')"
        :features="securityFeatures"
        icon="i-lucide-lock"
        orientation="horizontal"
      >
        <div class="flex items-center justify-center p-8">
          <div class="size-32 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon
              name="i-lucide-shield-check"
              class="size-16 text-primary"
            />
          </div>
        </div>
      </UPageSection>

      <UPageSection
        :headline="t('landing.storageHeadline')"
        :title="t('landing.storageTitle')"
        :description="t('landing.storageDescription')"
        :features="storageFeatures"
        icon="i-lucide-hard-drive"
        orientation="horizontal"
        reverse
      >
        <div class="flex items-center justify-center p-8">
          <div class="size-32 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon
              name="i-lucide-database"
              class="size-16 text-primary"
            />
          </div>
        </div>
      </UPageSection>

      <UPageSection :ui="{ container: 'px-0' }">
        <UPageCTA
          :title="t('landing.ctaTitle')"
          :description="t('landing.ctaDescription')"
          :links="ctaLinks"
          variant="subtle"
          class="rounded-none sm:rounded-xl"
        />
      </UPageSection>
    </UMain>

    <UFooter>
      <template #left>
        <p class="text-muted text-sm">
          &copy; {{ new Date().getFullYear() }} {{ t('landing.copyright') }}
        </p>
      </template>

      <template #right>
        <UButton
          icon="i-simple-icons-github"
          color="neutral"
          variant="ghost"
          to="https://github.com"
          target="_blank"
          aria-label="GitHub"
        />
      </template>
    </UFooter>
  </div>
</template>
