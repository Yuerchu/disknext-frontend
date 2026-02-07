<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { zh_cn, en, zh_tw } from '@nuxt/ui/locale'

const { locale } = useI18n()

const uiLocaleMap: Record<string, typeof zh_cn> = { 'zh-CN': zh_cn, en, 'zh-TW': zh_tw }
const uiLocale = computed(() => uiLocaleMap[locale.value] || zh_cn)
</script>

<template>
  <UApp :locale="uiLocale">
    <RouterView />
  </UApp>
</template>
