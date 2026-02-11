<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <UError
    :error="{ statusCode: 404, statusMessage: t('notFound.title'), message: t('notFound.message') }"
    :clear="false"
  >
    <template #links>
      <UButton
        size="lg"
        :label="t('notFound.backHome')"
        @click="router.push('/home')"
      />
    </template>
  </UError>
</template>
