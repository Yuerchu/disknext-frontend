<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { setLocale } from '../i18n'
import axios from 'axios'
import type { AxiosError } from 'axios'
import { getFileIcon } from '../composables/useFileOpen'

const route = useRoute()
const { t, locale } = useI18n()

const supportedLocales = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'en', name: 'English' },
  { code: 'zh-TW', name: '繁體中文' },
]

function onLocaleChange(code: string) {
  setLocale(code)
}

interface ShareOwnerInfo {
  nickname: string | null
  avatar: string
}

interface ShareObjectItem {
  id: string
  name: string
  type: 'file' | 'folder'
  size: number
  created_at: string
  updated_at: string
}

interface ShareDetail {
  code: string
  expires: string | null
  preview_enabled: boolean
  score: number
  created_at: string
  owner: ShareOwnerInfo
  object: ShareObjectItem
  children: ShareObjectItem[]
}

const shareData = ref<ShareDetail | null>(null)
const loading = ref(true)
const needPassword = ref(false)
const passwordError = ref(false)
const notFound = ref(false)
const password = ref('')
const submitting = ref(false)

const code = route.params.code as string

function formatSize(bytes: number): string {
  if (bytes === 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`
}

function formatDate(iso: string): string {
  if (!iso) return '-'
  return new Date(iso).toLocaleString(locale.value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function fetchShare(pwd?: string) {
  loading.value = true
  passwordError.value = false
  try {
    const params: Record<string, string> = {}
    if (pwd) params.password = pwd
    const { data } = await axios.get<ShareDetail>(`/api/v1/share/${code}`, { params })
    shareData.value = data
    needPassword.value = false
    notFound.value = false
  } catch (e: unknown) {
    const err = e as AxiosError<{ detail?: string }>
    const status = err.response?.status
    if (status === 428) {
      needPassword.value = true
    } else if (status === 403) {
      passwordError.value = true
    } else {
      notFound.value = true
    }
  } finally {
    loading.value = false
  }
}

async function submitPassword() {
  if (!password.value.trim()) return
  submitting.value = true
  await fetchShare(password.value.trim())
  submitting.value = false
}

const columns = computed(() => [
  { accessorKey: 'name', header: t('shareView.fileName') },
  { accessorKey: 'size', header: t('shareView.size') },
  { accessorKey: 'updated_at', header: t('shareView.modifiedAt') },
])

onMounted(() => {
  fetchShare()
})
</script>

<template>
  <div class="min-h-svh flex flex-col bg-default">
    <UHeader
      title="DiskNext"
      to="/"
    >
      <template #title>
        <AppLogo class="h-5 w-auto" />
      </template>

      <template #right>
        <div class="flex items-center gap-1">
          <UIcon
            name="i-lucide-languages"
            class="size-4 text-muted"
          />
          <UDropdownMenu
            :items="[[
              ...supportedLocales.map(l => ({
                label: l.name,
                active: locale === l.code,
                onSelect() { onLocaleChange(l.code) }
              }))
            ]]"
            :content="{ align: 'end' as const }"
          >
            <UButton
              size="sm"
              color="neutral"
              variant="ghost"
              :label="supportedLocales.find(l => l.code === locale)?.name"
              trailing-icon="i-lucide-chevron-down"
            />
          </UDropdownMenu>
        </div>
        <UColorModeButton />
      </template>
    </UHeader>

    <!-- Loading -->
    <div
      v-if="loading"
      class="flex-1 flex items-center justify-center"
    >
      <UIcon
        name="i-lucide-loader-circle"
        class="size-8 text-muted animate-spin"
      />
    </div>

    <!-- Password Required -->
    <div
      v-else-if="needPassword || passwordError"
      class="flex-1 flex items-center justify-center p-4"
    >
      <UCard class="w-full max-w-sm">
        <div class="flex flex-col items-center gap-4">
          <div class="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <UIcon
              name="i-lucide-lock"
              class="size-6 text-primary"
            />
          </div>
          <h2 class="text-lg font-semibold">
            {{ t('shareView.passwordTitle') }}
          </h2>
          <form
            class="w-full flex flex-col gap-3"
            @submit.prevent="submitPassword"
          >
            <UInput
              v-model="password"
              type="text"
              :placeholder="t('shareView.passwordPlaceholder')"
              icon="i-lucide-key-round"
              autofocus
            />
            <p
              v-if="passwordError"
              class="text-sm text-error"
            >
              {{ t('shareView.passwordError') }}
            </p>
            <UButton
              type="submit"
              block
              :loading="submitting"
              :label="t('shareView.passwordSubmit')"
            />
          </form>
        </div>
      </UCard>
    </div>

    <!-- Not Found / Expired -->
    <div
      v-else-if="notFound"
      class="flex-1 flex items-center justify-center p-4"
    >
      <div class="flex flex-col items-center gap-4 text-center">
        <div class="size-16 rounded-full bg-error/10 flex items-center justify-center">
          <UIcon
            name="i-lucide-file-x"
            class="size-8 text-error"
          />
        </div>
        <h2 class="text-xl font-semibold">
          {{ t('shareView.notFound') }}
        </h2>
        <p class="text-muted text-sm max-w-md">
          {{ t('shareView.notFoundMessage') }}
        </p>
        <UButton
          :label="t('shareView.backHome')"
          to="/"
          color="neutral"
          variant="subtle"
          icon="i-lucide-arrow-left"
        />
      </div>
    </div>

    <!-- Share Detail -->
    <div
      v-else-if="shareData"
      class="flex-1"
    >
      <UContainer class="py-8">
        <!-- Share Info Header -->
        <div class="flex items-center gap-4 mb-6">
          <UAvatar
            :src="shareData.owner.avatar"
            :alt="shareData.owner.nickname || ''"
            size="lg"
          />
          <div class="flex-1 min-w-0">
            <h1 class="text-xl font-semibold truncate flex items-center gap-2">
              <UIcon
                :name="getFileIcon(shareData.object.name, shareData.object.type === 'folder')"
                class="size-5 shrink-0"
              />
              {{ shareData.object.name }}
            </h1>
            <div class="flex items-center gap-3 text-sm text-muted mt-1 flex-wrap">
              <span>{{ t('shareView.sharedBy', { name: shareData.owner.nickname || 'User' }) }}</span>
              <span>{{ t('shareView.createdAt', { date: formatDate(shareData.created_at) }) }}</span>
              <span v-if="shareData.expires">
                {{ t('shareView.expires', { date: formatDate(shareData.expires) }) }}
              </span>
              <span v-else>{{ t('shareView.neverExpire') }}</span>
            </div>
          </div>
        </div>

        <!-- Folder: file list -->
        <template v-if="shareData.object.type === 'folder' && shareData.children.length > 0">
          <div class="text-sm text-muted mb-3">
            {{ t('shareView.fileCount', { n: shareData.children.length }) }}
          </div>
          <UTable
            :data="shareData.children"
            :columns="columns"
          >
            <template #name-cell="{ row }">
              <div class="flex items-center gap-2">
                <UIcon
                  :name="getFileIcon(row.original.name, row.original.type === 'folder')"
                  class="size-4 shrink-0"
                />
                <span class="truncate">{{ row.original.name }}</span>
              </div>
            </template>
            <template #size-cell="{ row }">
              {{ row.original.type === 'file' ? formatSize(row.original.size) : '-' }}
            </template>
            <template #updated_at-cell="{ row }">
              {{ formatDate(row.original.updated_at) }}
            </template>
          </UTable>
        </template>

        <!-- Single file info -->
        <template v-else-if="shareData.object.type === 'file'">
          <UCard>
            <div class="flex items-center gap-4">
              <div class="size-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <UIcon
                  name="i-lucide-file"
                  class="size-6 text-primary"
                />
              </div>
              <div class="flex-1 min-w-0">
                <div class="font-medium truncate">
                  {{ shareData.object.name }}
                </div>
                <div class="text-sm text-muted mt-1 flex items-center gap-3">
                  <span>{{ formatSize(shareData.object.size) }}</span>
                  <span>{{ formatDate(shareData.object.updated_at) }}</span>
                </div>
              </div>
            </div>
          </UCard>
        </template>

        <!-- Empty folder -->
        <template v-else>
          <div class="text-center text-muted py-12">
            {{ t('shareView.fileCount', { n: 0 }) }}
          </div>
        </template>
      </UContainer>
    </div>
  </div>
</template>
