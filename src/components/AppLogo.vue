<script setup lang="ts">
import { useSiteConfigStore } from '../stores/siteConfig'

defineOptions({ inheritAttrs: false })

const siteConfig = useSiteConfigStore()
siteConfig.fetchConfig()

const isDark = ref(document.documentElement.classList.contains('dark'))

let observer: MutationObserver | null = null
onMounted(() => {
  observer = new MutationObserver(() => {
    isDark.value = document.documentElement.classList.contains('dark')
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
})
onUnmounted(() => observer?.disconnect())

const logoUrl = computed(() => {
  const url = isDark.value ? siteConfig.logoDark : siteConfig.logoLight
  return url || siteConfig.logoLight || siteConfig.logoDark || ''
})
</script>

<template>
  <img
    v-if="logoUrl"
    :src="logoUrl"
    alt="Logo"
    v-bind="$attrs"
  >
  <USkeleton
    v-else
    v-bind="$attrs"
    class="w-full"
  />
</template>
