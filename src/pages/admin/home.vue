<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import api from '../../utils/api'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const { t } = useI18n()

interface AdminSummary {
  version: {
    version: string
    pro: boolean
    commit: string
  }
  license: {
    expired_at: string
    signed_at: string
  }
  site_urls: string[]
  metrics_summary: {
    file_total: number
    user_total: number
    share_total: number
    entities_total: number
    dates: string[]
    files: number[]
    users: number[]
    shares: number[]
    generated_at: string
  }
}

const summary = ref<AdminSummary | null>(null)
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    const { data } = await api.get<AdminSummary>('/api/v1/admin/summary')
    summary.value = data
  } catch {
    error.value = t('admin.loadError')
  } finally {
    loading.value = false
  }
})

const generatedAgo = computed(() => {
  if (!summary.value?.metrics_summary.generated_at) return ''
  const diff = Date.now() - new Date(summary.value.metrics_summary.generated_at).getTime()
  const minutes = Math.max(1, Math.floor(diff / 60000))
  if (minutes < 60) return t('admin.generatedAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('admin.generatedAgoHours', { n: hours })
  return t('admin.generatedAgoDays', { n: Math.floor(hours / 24) })
})

const chartData = computed(() => {
  if (!summary.value) return null
  const m = summary.value.metrics_summary
  return {
    labels: m.dates.map((d) => d.slice(5)),
    datasets: [
      {
        label: t('admin.users'),
        data: m.users,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: t('admin.files'),
        data: m.files,
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.3
      },
      {
        label: t('admin.shares'),
        data: m.shares,
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.3
      }
    ]
  }
})

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    intersect: false,
    mode: 'index' as const
  },
  plugins: {
    legend: {
      position: 'bottom' as const
    }
  },
  scales: {
    y: {
      beginAtZero: true
    }
  }
}

const statsItems = computed(() => {
  if (!summary.value) return []
  const m = summary.value.metrics_summary
  return [
    { icon: 'i-lucide-users', color: 'primary' as const, value: m.user_total, label: t('admin.users') },
    { icon: 'i-lucide-file', color: 'warning' as const, value: m.file_total, label: t('admin.files') },
    { icon: 'i-lucide-share-2', color: 'success' as const, value: m.share_total, label: t('admin.shares') },
    { icon: 'i-lucide-binary', color: 'error' as const, value: m.entities_total, label: t('admin.fileBlobs') }
  ]
})

function formatDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString()
}
</script>

<template>
  <div class="p-6 space-y-6">
    <h1 class="text-2xl font-semibold">
      {{ t('admin.siteSummary') }}
    </h1>

    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <div
      v-else-if="error"
      class="text-center py-12 text-red-500"
    >
      {{ error }}
    </div>

    <template v-else-if="summary">
      <!-- Trend chart + Stats summary (3:1) -->
      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <UCard class="lg:col-span-3">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-semibold">{{ t('admin.trend') }}</span>
              <span class="text-sm text-muted">{{ generatedAgo }}</span>
            </div>
          </template>
          <div
            v-if="chartData"
            class="h-72"
          >
            <Line
              :data="chartData"
              :options="chartOptions"
            />
          </div>
        </UCard>

        <UCard>
          <template #header>
            <span class="font-semibold">{{ t('admin.total') }}</span>
          </template>
          <div class="space-y-5">
            <div
              v-for="item in statsItems"
              :key="item.label"
              class="flex items-center gap-3"
            >
              <UAvatar
                :icon="item.icon"
                :color="item.color"
                size="lg"
              />
              <div>
                <p class="text-lg font-bold leading-tight">
                  {{ item.value.toLocaleString() }}
                </p>
                <p class="text-sm text-muted">
                  {{ item.label }}
                </p>
              </div>
            </div>
          </div>
        </UCard>
      </div>

      <!-- Info cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <UCard>
          <div class="space-y-1">
            <p class="text-sm text-muted">
              {{ t('admin.version') }}
            </p>
            <p class="font-medium">
              {{ summary.version.version }}
              <UBadge
                v-if="summary.version.pro"
                color="primary"
                variant="subtle"
                size="xs"
              >
                Pro
              </UBadge>
            </p>
            <p class="text-xs text-muted font-mono">
              {{ summary.version.commit }}
            </p>
          </div>
        </UCard>

        <UCard>
          <div class="space-y-1">
            <p class="text-sm text-muted">
              {{ t('admin.license') }}
            </p>
            <p class="text-sm">
              {{ t('admin.expiresAt', { date: formatDate(summary.license.expired_at) }) }}
            </p>
            <p class="text-xs text-muted">
              {{ t('admin.signedAt', { date: formatDate(summary.license.signed_at) }) }}
            </p>
          </div>
        </UCard>

        <UCard>
          <div class="space-y-1">
            <p class="text-sm text-muted">
              {{ t('admin.siteUrls') }}
            </p>
            <p
              v-for="url in summary.site_urls"
              :key="url"
              class="text-sm truncate"
            >
              {{ url }}
            </p>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>
