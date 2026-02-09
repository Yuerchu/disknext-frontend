<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <div class="flex items-center justify-center h-full">
    <UEmpty
      icon="i-lucide-construction"
      :title="t('admin.comingSoon')"
      :description="t('admin.comingSoonDesc')"
    />
  </div>
</template>
