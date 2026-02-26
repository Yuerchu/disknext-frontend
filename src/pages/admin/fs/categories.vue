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
const emptyItems: string[] = []

const form = ref<Record<string, string[]>>({
  image: [],
  video: [],
  audio: [],
  document: [],
})

const original = ref<Record<string, string>>({})

const settingTypeMap: Record<string, string> = {
  image: 'file_category',
  video: 'file_category',
  audio: 'file_category',
  document: 'file_category',
}

function csvToTags(csv: string): string[] {
  return csv.split(',').map(s => s.trim()).filter(Boolean)
}

function tagsToCsv(tags: string[]): string {
  return tags.join(',')
}

function onCreateTag(category: string, item: string) {
  const normalized = item.trim().toLowerCase().replace(/^\./, '')
  if (!normalized) return
  if (!form.value[category].includes(normalized)) {
    form.value[category].push(normalized)
  }
}

async function fetchSettings() {
  loading.value = true
  try {
    const { data } = await api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', {
      params: { type: 'file_category' },
    })
    const orig: Record<string, string> = {}
    for (const s of data.settings) {
      if (s.name in form.value) {
        form.value[s.name] = csvToTags(s.value)
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
  for (const [name, tags] of Object.entries(form.value)) {
    const value = tagsToCsv(tags)
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
              <UInputMenu
                v-model="form.image"
                multiple
                create-item="always"
                :items="emptyItems"
                :placeholder="t('adminFileCategory.tagPlaceholder')"
                class="w-full"
                @create="(item: string) => onCreateTag('image', item)"
              />
            </UFormField>
            <UFormField :label="t('adminFileCategory.videoExtensions')">
              <UInputMenu
                v-model="form.video"
                multiple
                create-item="always"
                :items="emptyItems"
                :placeholder="t('adminFileCategory.tagPlaceholder')"
                class="w-full"
                @create="(item: string) => onCreateTag('video', item)"
              />
            </UFormField>
            <UFormField :label="t('adminFileCategory.audioExtensions')">
              <UInputMenu
                v-model="form.audio"
                multiple
                create-item="always"
                :items="emptyItems"
                :placeholder="t('adminFileCategory.tagPlaceholder')"
                class="w-full"
                @create="(item: string) => onCreateTag('audio', item)"
              />
            </UFormField>
            <UFormField :label="t('adminFileCategory.documentExtensions')">
              <UInputMenu
                v-model="form.document"
                multiple
                create-item="always"
                :items="emptyItems"
                :placeholder="t('adminFileCategory.tagPlaceholder')"
                class="w-full"
                @create="(item: string) => onCreateTag('document', item)"
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
