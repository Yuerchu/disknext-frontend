<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
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
  // mail type
  fromName: 'DiskNext',
  fromAdress: '',
  replyTo: '',
  smtpHost: '',
  smtpPort: '25',
  smtpUser: '',
  smtpPass: '',
  mail_keepalive: '30',
  // mail_template type
  mail_activation_template: '',
  mail_reset_pwd_template: '',
})

const original = ref<Record<string, string>>({})

const settingTypeMap: Record<string, string> = {
  fromName: 'mail',
  fromAdress: 'mail',
  replyTo: 'mail',
  smtpHost: 'mail',
  smtpPort: 'mail',
  smtpUser: 'mail',
  smtpPass: 'mail',
  mail_keepalive: 'mail',
  mail_activation_template: 'mail_template',
  mail_reset_pwd_template: 'mail_template',
}

// Template editor state
const templateModalOpen = ref(false)
const editingTemplate = ref<'activation' | 'reset' | null>(null)

const editingTemplateTitle = computed(() => {
  if (editingTemplate.value === 'activation') return t('adminMail.activationTemplate')
  if (editingTemplate.value === 'reset') return t('adminMail.resetPwdTemplate')
  return ''
})

const editingTemplateKey = computed<'mail_activation_template' | 'mail_reset_pwd_template' | null>(() => {
  if (editingTemplate.value === 'activation') return 'mail_activation_template'
  if (editingTemplate.value === 'reset') return 'mail_reset_pwd_template'
  return null
})

const editingTemplateVars = computed(() => {
  if (editingTemplate.value === 'activation') return '{siteTitle}, {userName}, {activationUrl}'
  if (editingTemplate.value === 'reset') return '{siteTitle}, {userName}, {resetUrl}'
  return ''
})

function openTemplateEditor(template: 'activation' | 'reset') {
  editingTemplate.value = template
  templateModalOpen.value = true
}

async function fetchSettings() {
  loading.value = true
  try {
    const [mail, mailTemplate] = await Promise.all([
      api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', { params: { type: 'mail' } }),
      api.get<{ settings: Setting[]; total: number }>('/api/v1/admin/settings', { params: { type: 'mail_template' } }),
    ])
    const allSettings = [...mail.data.settings, ...mailTemplate.data.settings]
    const formVal = form.value as Record<string, string>
    const orig: Record<string, string> = {}
    for (const s of allSettings) {
      if (s.name in formVal) {
        formVal[s.name] = s.value
        orig[s.name] = s.value
      }
    }
    original.value = orig
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminMail.loadFailed'),
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
  if (changes.length === 0) {
    toast.add({
      title: t('adminMail.noChanges'),
      icon: 'i-lucide-info',
      color: 'neutral',
    })
    return
  }

  saving.value = true
  try {
    await api.patch('/api/v1/admin/settings', { settings: changes })
    for (const c of changes) {
      original.value[c.name] = c.value
    }
    toast.add({
      title: t('adminMail.saveSuccess'),
      icon: 'i-lucide-check-circle',
      color: 'success',
    })
  } catch (e: unknown) {
    const err = e as AxiosError<ApiErrorResponse>
    toast.add({
      title: t('adminMail.saveFailed'),
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
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">
        {{ t('adminMail.title') }}
      </h1>
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
        <!-- SMTP Settings -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminMail.smtp') }}
            </h2>
          </template>
          <div class="space-y-4">
            <UFormField
              :label="t('adminMail.fromName')"
              :description="t('adminMail.fromNameDesc')"
            >
              <UInput
                v-model="form.fromName"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="t('adminMail.fromAdress')"
              :description="t('adminMail.fromAdressDesc')"
            >
              <UInput
                v-model="form.fromAdress"
                class="w-full"
              />
            </UFormField>
            <UFormField
              :label="t('adminMail.replyTo')"
              :description="t('adminMail.replyToDesc')"
            >
              <UInput
                v-model="form.replyTo"
                class="w-full"
              />
            </UFormField>
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('adminMail.smtpHost')">
                <UInput
                  v-model="form.smtpHost"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('adminMail.smtpPort')">
                <UInput
                  v-model="form.smtpPort"
                  type="number"
                  class="w-full"
                />
              </UFormField>
            </div>
            <div class="grid grid-cols-2 gap-4">
              <UFormField :label="t('adminMail.smtpUser')">
                <UInput
                  v-model="form.smtpUser"
                  class="w-full"
                />
              </UFormField>
              <UFormField :label="t('adminMail.smtpPass')">
                <UInput
                  v-model="form.smtpPass"
                  type="password"
                  class="w-full"
                />
              </UFormField>
            </div>
            <UFormField
              :label="t('adminMail.keepalive')"
              :description="t('adminMail.keepaliveDesc')"
            >
              <UInput
                v-model="form.mail_keepalive"
                type="number"
                class="w-full"
              />
            </UFormField>
          </div>
        </UCard>

        <!-- Email Templates -->
        <UCard>
          <template #header>
            <h2 class="text-base font-semibold">
              {{ t('adminMail.templates') }}
            </h2>
          </template>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 border border-default rounded-lg">
              <div>
                <p class="font-medium">
                  {{ t('adminMail.activationTemplate') }}
                </p>
                <p class="text-sm text-muted">
                  {{ t('adminMail.activationTemplateDesc') }}
                </p>
              </div>
              <UButton
                :label="t('adminMail.editTemplate')"
                icon="i-lucide-pencil"
                variant="outline"
                @click="openTemplateEditor('activation')"
              />
            </div>
            <div class="flex items-center justify-between p-4 border border-default rounded-lg">
              <div>
                <p class="font-medium">
                  {{ t('adminMail.resetPwdTemplate') }}
                </p>
                <p class="text-sm text-muted">
                  {{ t('adminMail.resetPwdTemplateDesc') }}
                </p>
              </div>
              <UButton
                :label="t('adminMail.editTemplate')"
                icon="i-lucide-pencil"
                variant="outline"
                @click="openTemplateEditor('reset')"
              />
            </div>
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

    <!-- Template Editor Modal -->
    <UModal
      v-model:open="templateModalOpen"
      fullscreen
      :title="editingTemplateTitle"
    >
      <template #body>
        <UEditor
          v-if="editingTemplateKey"
          v-model="form[editingTemplateKey]"
          content-type="html"
          class="min-h-[60vh]"
        />
      </template>
      <template #footer>
        <div class="flex items-center justify-between w-full">
          <p class="text-sm text-muted">
            {{ t('adminMail.templateVars') }}: {{ editingTemplateVars }}
          </p>
          <UButton
            :label="t('adminMail.closeEditor')"
            @click="templateModalOpen = false"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
