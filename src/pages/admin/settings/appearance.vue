<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AxiosError } from 'axios'
import { chromaticColors, neutralColors, semanticColorKeys, defaultThemeColors, colorHex } from '../../../constants/colors'
import type { ThemeColors, ThemePreset } from '../../../constants/colors'
import api from '../../../utils/api'

type ApiErrorResponse = { detail?: string }

const { t } = useI18n()
const toast = useToast()

const loading = ref(true)
const presets = ref<ThemePreset[]>([])

async function fetchPresets() {
  loading.value = true
  try {
    const { data } = await api.get<{ themes: ThemePreset[] }>('/api/v1/admin/theme/')
    presets.value = data.themes
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('theme.admin.loadFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchPresets())

// Create/Edit Modal
const formModalOpen = ref(false)
const editingPreset = ref<ThemePreset | null>(null)
const submitting = ref(false)

const formData = ref({
  name: '',
  colors: { ...defaultThemeColors }
})

const isEditing = computed(() => !!editingPreset.value)

function resetForm() {
  formData.value = {
    name: '',
    colors: { ...defaultThemeColors }
  }
}

function openCreateModal() {
  editingPreset.value = null
  resetForm()
  formModalOpen.value = true
}

function openEditModal(preset: ThemePreset) {
  editingPreset.value = preset
  formData.value = {
    name: preset.name,
    colors: { ...preset.colors }
  }
  formModalOpen.value = true
}

async function submitForm() {
  if (!formData.value.name.trim()) return
  submitting.value = true
  try {
    if (isEditing.value) {
      await api.patch(`/api/v1/admin/theme/${editingPreset.value!.id}`, {
        name: formData.value.name,
        colors: formData.value.colors
      })
      toast.add({ title: t('theme.admin.updateSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    } else {
      await api.post('/api/v1/admin/theme/', {
        name: formData.value.name,
        colors: formData.value.colors
      })
      toast.add({ title: t('theme.admin.createSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    }
    formModalOpen.value = false
    fetchPresets()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: isEditing.value ? t('theme.admin.updateFailed') : t('theme.admin.createFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    submitting.value = false
  }
}

// Delete Modal
const deleteModalOpen = ref(false)
const deletingPreset = ref<ThemePreset | null>(null)
const deleting = ref(false)

function openDeleteModal(preset: ThemePreset) {
  deletingPreset.value = preset
  deleteModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingPreset.value) return
  deleting.value = true
  try {
    await api.delete(`/api/v1/admin/theme/${deletingPreset.value.id}`)
    toast.add({ title: t('theme.admin.deleteSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    deleteModalOpen.value = false
    fetchPresets()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('theme.admin.deleteFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  } finally {
    deleting.value = false
  }
}

async function setDefault(preset: ThemePreset) {
  try {
    await api.patch(`/api/v1/admin/theme/${preset.id}/default`)
    toast.add({ title: t('theme.admin.setDefaultSuccess'), icon: 'i-lucide-check-circle', color: 'success' })
    fetchPresets()
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('theme.admin.setDefaultFailed'),
      description: err.response?.data?.detail || '',
      icon: 'i-lucide-circle-x',
      color: 'error'
    })
  }
}

function getColorsForKey(key: keyof ThemeColors): readonly string[] {
  return key === 'neutral' ? neutralColors : chromaticColors
}
</script>

<template>
  <div class="p-6 space-y-6">
    <!-- Header -->
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        {{ t('admin.appearance') }}
      </h1>
      <div class="flex items-center gap-2">
        <UButton
          icon="i-lucide-refresh-cw"
          color="neutral"
          variant="ghost"
          @click="fetchPresets"
        />
        <UButton
          :label="t('theme.admin.createPreset')"
          icon="i-lucide-plus"
          @click="openCreateModal"
        />
      </div>
    </div>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex items-center justify-center py-12"
    >
      <UIcon
        name="i-lucide-loader-2"
        class="size-8 animate-spin text-muted"
      />
    </div>

    <!-- Preset List -->
    <template v-else>
      <div
        v-if="presets.length === 0"
        class="text-center py-12 text-muted"
      >
        {{ t('theme.admin.empty') }}
      </div>

      <div
        v-else
        class="space-y-3"
      >
        <div
          v-for="preset in presets"
          :key="preset.id"
          class="flex items-center gap-4 p-4 rounded-lg border border-[var(--ui-border)]"
        >
          <!-- Color preview -->
          <div class="flex gap-1 shrink-0">
            <span
              v-for="ck in semanticColorKeys"
              :key="ck"
              class="size-5 rounded-full"
              :style="{ background: colorHex[preset.colors[ck]] }"
              :title="t(`theme.color.${ck}`)"
            />
          </div>

          <!-- Name -->
          <div class="flex-1 min-w-0">
            <span class="font-medium">{{ preset.name }}</span>
            <UBadge
              v-if="preset.is_default"
              :label="t('theme.admin.default')"
              variant="subtle"
              size="xs"
              class="ml-2"
            />
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1">
            <UButton
              v-if="!preset.is_default"
              :label="t('theme.admin.setDefault')"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="setDefault(preset)"
            />
            <UButton
              icon="i-lucide-pencil"
              variant="ghost"
              color="neutral"
              size="xs"
              @click="openEditModal(preset)"
            />
            <UButton
              icon="i-lucide-trash-2"
              variant="ghost"
              color="error"
              size="xs"
              @click="openDeleteModal(preset)"
            />
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- Create/Edit Modal -->
  <UModal
    v-model:open="formModalOpen"
    :title="isEditing ? t('theme.admin.editPreset') : t('theme.admin.createPreset')"
    description=" "
    :ui="{ footer: 'justify-end', content: 'sm:max-w-xl', description: 'hidden' }"
  >
    <template #body>
      <div class="space-y-5">
        <div>
          <label class="text-sm font-medium mb-1 block">{{ t('theme.admin.presetName') }}</label>
          <UInput
            v-model="formData.name"
            :placeholder="t('theme.admin.presetNamePlaceholder')"
            class="w-full"
          />
        </div>

        <USeparator />

        <div class="space-y-4">
          <div
            v-for="key in semanticColorKeys"
            :key="key"
          >
            <label class="text-sm text-muted mb-1.5 block">
              {{ t(`theme.color.${key}`) }}
            </label>
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="color in getColorsForKey(key)"
                :key="color"
                class="size-7 rounded-full cursor-pointer ring-offset-2 ring-offset-[var(--ui-bg)] transition-shadow"
                :class="formData.colors[key] === color
                  ? 'ring-2 ring-[var(--ui-primary)]'
                  : 'hover:ring-2 hover:ring-[var(--ui-border-hover)]'"
                :style="{ background: colorHex[color] }"
                :title="t(`theme.colorName.${color}`)"
                @click="formData.colors[key] = color"
              />
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="formModalOpen = false"
      />
      <UButton
        :label="isEditing ? t('common.confirm') : t('common.create')"
        :loading="submitting"
        :disabled="!formData.name.trim()"
        @click="submitForm"
      />
    </template>
  </UModal>

  <!-- Delete Confirmation Modal -->
  <UModal
    v-model:open="deleteModalOpen"
    :title="t('theme.admin.deletePreset')"
    description=" "
    :ui="{ footer: 'justify-end', description: 'hidden' }"
  >
    <template #body>
      <p class="text-sm">
        {{ t('theme.admin.deleteConfirm', { name: deletingPreset?.name }) }}
      </p>
    </template>

    <template #footer>
      <UButton
        :label="t('common.cancel')"
        color="neutral"
        variant="outline"
        @click="deleteModalOpen = false"
      />
      <UButton
        :label="t('common.delete')"
        color="error"
        :loading="deleting"
        @click="confirmDelete"
      />
    </template>
  </UModal>
</template>
