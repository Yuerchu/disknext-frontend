<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AxiosError } from 'axios'
import api from '../../../utils/api'

type ApiErrorResponse = { detail?: string }

interface Setting {
  type: string
  name: string
  value: string
}

const { t } = useI18n()
const toast = useToast()

const loading = ref(true)
const saving = ref(false)

const form = ref({
  image: '',
  video: '',
  audio: '',
  document: '',
})

const original = ref<Record<string, string>>({})

const settingTypeMap: Record<string, string> = {
  image: 'file_category',
  video: 'file_category',
  audio: 'file_category',
  document: 'file_category',
}

async function fetchSettings() {
  loading.value = true
  try {
    const { data } = await api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', {
      params: { type: 'file_category' },
    })
    const formVal = form.value as Record<string, string>
    const orig: Record<string, string> = {}
    for (const s of data.settings) {
      if (s.name in formVal) {
        formVal[s.name] = s.value
        orig[s.name] = s.value
      }
    }
    original.value = orig
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminFileCategory.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error',
    })
  } finally {
    loading.value = false
  }
}

async function saveSettings() {
  const changes: Setting[] = []
  const formVal = form.value as Record<string, string>
  for (const [name, value] of Object.entries(formVal)) {
    if (value !== (original.value[name] ?? '')) {
      changes.push({ type: settingTypeMap[name], name, value })
    }
  }
  if (changes.length === 0) return

  saving.value = true
  try {
    await api.patch('/api/v1/admin/settings', { settings: changes })
    for (const c of changes) {
      original.value[c.name] = c.value
    }
    toast.add({
      title: t('adminFileCategory.saveSuccess'),
      icon: 'i-lucide-check-circle',
      color: 'success',
    })
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminFileCategory.saveFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error',
    })
  } finally {
    saving.value = false
  }
}

onMounted(() => fetchSettings())
</script>

<template>
  <div class="p-6 space-y-6">
    <div>
      <h1 class="text-2xl font-semibold">
        {{ t('adminFileCategory.title') }}
      </h1>
      <p class="text-sm text-muted mt-1">
        {{ t('adminFileCategory.description') }}
      </p>
    </div>

    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <template v-else>
      <div class="space-y-6 max-w-3xl">
        <UCard>
          <div class="space-y-4">
            <UFormField :label="t('adminFileCategory.imageExtensions')">
              <UTextarea
                v-model="form.image"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('adminFileCategory.videoExtensions')">
              <UTextarea
                v-model="form.video"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('adminFileCategory.audioExtensions')">
              <UTextarea
                v-model="form.audio"
                :rows="3"
                class="w-full"
              />
            </UFormField>
            <UFormField :label="t('adminFileCategory.documentExtensions')">
              <UTextarea
                v-model="form.document"
                :rows="3"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <div class="flex justify-end">
          <UButton
            :label="t('common.save')"
            icon="i-lucide-save"
            :loading="saving"
            @click="saveSettings"
          />
        </div>
      </div>
    </template>
  </div>
</template>
