<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import api from '../../utils/api'

const { t } = useI18n()

interface AdminSummary {
  instance_id: string
  version: string
  license: {
    type: string
    expires: string
  }
  metrics: {
    users: number
    files: number
    shares: number
    storage_used: number
    groups: number
    nodes: number
  }
}

const summary = ref<AdminSummary | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get('/api/v1/admin/summary')
    summary.value = data
  } catch {
    error.value = t('admin.loadError')
  } finally {
    loading.value = false
  }
})

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-semibold">{{ t('admin.siteSummary') }}</h1>

    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-muted" />
    </div>

    <div v-else-if="error" class="text-center py-12 text-red-500">
      {{ error }}
    </div>

    <template v-else-if="summary">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <UCard>
          <div class="space-y-1">
            <p class="text-sm text-muted">{{ t('admin.instanceId') }}</p>
            <p class="font-mono text-sm">{{ summary.instance_id }}</p>
          </div>
        </UCard>

        <UCard>
          <div class="space-y-1">
            <p class="text-sm text-muted">{{ t('admin.version') }}</p>
            <p class="font-medium">{{ summary.version }}</p>
          </div>
        </UCard>

        <UCard>
          <div class="space-y-1">
            <p class="text-sm text-muted">{{ t('admin.license') }}</p>
            <p class="font-medium">{{ summary.license.type }}</p>
            <p class="text-xs text-muted">{{ t('admin.expiresAt', { date: summary.license.expires }) }}</p>
          </div>
        </UCard>
      </div>

      <h2 class="text-lg font-semibold">{{ t('admin.metricsSummary') }}</h2>

      <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <UCard>
          <div class="text-center space-y-1">
            <UIcon name="i-lucide-users" class="size-6 text-primary mx-auto" />
            <p class="text-2xl font-bold">{{ summary.metrics.users }}</p>
            <p class="text-sm text-muted">{{ t('admin.users') }}</p>
          </div>
        </UCard>

        <UCard>
          <div class="text-center space-y-1">
            <UIcon name="i-lucide-file" class="size-6 text-primary mx-auto" />
            <p class="text-2xl font-bold">{{ summary.metrics.files }}</p>
            <p class="text-sm text-muted">{{ t('admin.files') }}</p>
          </div>
        </UCard>

        <UCard>
          <div class="text-center space-y-1">
            <UIcon name="i-lucide-share-2" class="size-6 text-primary mx-auto" />
            <p class="text-2xl font-bold">{{ summary.metrics.shares }}</p>
            <p class="text-sm text-muted">{{ t('admin.shares') }}</p>
          </div>
        </UCard>

        <UCard>
          <div class="text-center space-y-1">
            <UIcon name="i-lucide-hard-drive" class="size-6 text-primary mx-auto" />
            <p class="text-2xl font-bold">{{ formatBytes(summary.metrics.storage_used) }}</p>
            <p class="text-sm text-muted">{{ t('admin.storageUsed') }}</p>
          </div>
        </UCard>

        <UCard>
          <div class="text-center space-y-1">
            <UIcon name="i-lucide-users" class="size-6 text-primary mx-auto" />
            <p class="text-2xl font-bold">{{ summary.metrics.groups }}</p>
            <p class="text-sm text-muted">{{ t('admin.groups') }}</p>
          </div>
        </UCard>

        <UCard>
          <div class="text-center space-y-1">
            <UIcon name="i-lucide-server" class="size-6 text-primary mx-auto" />
            <p class="text-2xl font-bold">{{ summary.metrics.nodes }}</p>
            <p class="text-sm text-muted">{{ t('admin.nodes') }}</p>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
