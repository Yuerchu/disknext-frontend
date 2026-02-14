import { useI18n } from 'vue-i18n'
import { createPatch } from 'diff'
import type { FileAppSummary, FileViewersResponse, DownloadTokenResponse, WopiSessionResponse, TextContentResponse, PatchContentResponse } from '../types/fileApp'
import type { AxiosError } from 'axios'
import api from '../utils/api'

/** Viewer state held while a file is open */
export interface ViewerState {
  fileId: string
  fileName: string
  fileSize: number
  viewer: FileAppSummary
  /** URL for URL-based builtin viewers, iframe src, or wopi editor_url */
  contentUrl: string | null
  /** Text content for text-based builtin viewers (monaco, markdown) */
  textContent: string | null
  /** SHA-256 hash of the text content (from GET /content API) */
  baseHash: string | null
  /** Original text content (baseline for diff calculation) */
  originalContent: string | null
  /** True while file content is being fetched */
  loading: boolean
  /** Error message if content fetch failed */
  error: string | null
}

/** Minimal file info needed to open a file */
export interface FileBasicInfo {
  id: string
  name: string
  size: number
}

// ── Constants ──

/** app_key → Vue component name (used by FileViewer for dynamic import) */
export const APP_KEY_COMPONENT: Record<string, string> = {
  pdfjs: 'PdfViewer',
  monaco: 'CodeEditor',
  markdown: 'MarkdownViewer',
  image_viewer: 'ImageViewer',
  video_player: 'VideoPlayer',
  audio_player: 'AudioPlayer',
}

/** app_keys that need text content instead of a URL */
const TEXT_CONTENT_APPS = new Set(['monaco', 'markdown'])

/** Backend icon name → Lucide icon class */
const ICON_MAP: Record<string, string> = {
  'file-pdf': 'i-lucide-file-text',
  'code': 'i-lucide-code',
  'markdown': 'i-lucide-book-open',
  'image': 'i-lucide-image',
  'video': 'i-lucide-play-circle',
  'audio': 'i-lucide-music',
  'file-word': 'i-lucide-file-text',
  'file-text': 'i-lucide-file-text',
}

/** Resolve backend icon string to a Lucide icon class */
export function resolveIcon(icon: string | null): string {
  if (!icon) return 'i-lucide-file'
  return ICON_MAP[icon] || 'i-lucide-file'
}

/** Extract lowercase extension without dot from a file name */
export function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  if (dot < 0) return ''
  return fileName.slice(dot + 1).toLowerCase()
}

// ── File extension → icon mapping ──

const EXT_ICON: Record<string, string> = {
  // Images
  jpg: 'i-lucide-file-image', jpeg: 'i-lucide-file-image', png: 'i-lucide-file-image',
  gif: 'i-lucide-file-image', bmp: 'i-lucide-file-image', webp: 'i-lucide-file-image',
  svg: 'i-lucide-file-image', ico: 'i-lucide-file-image', tiff: 'i-lucide-file-image',
  tif: 'i-lucide-file-image', avif: 'i-lucide-file-image', heic: 'i-lucide-file-image',
  heif: 'i-lucide-file-image', psd: 'i-lucide-file-image', raw: 'i-lucide-file-image',

  // Video
  mp4: 'i-lucide-file-video', mkv: 'i-lucide-file-video', avi: 'i-lucide-file-video',
  mov: 'i-lucide-file-video', wmv: 'i-lucide-file-video', flv: 'i-lucide-file-video',
  webm: 'i-lucide-file-video', m4v: 'i-lucide-file-video', ts: 'i-lucide-file-video',
  '3gp': 'i-lucide-file-video', mpg: 'i-lucide-file-video', mpeg: 'i-lucide-file-video',

  // Audio
  mp3: 'i-lucide-file-music', wav: 'i-lucide-file-music', flac: 'i-lucide-file-music',
  aac: 'i-lucide-file-music', ogg: 'i-lucide-file-music', wma: 'i-lucide-file-music',
  m4a: 'i-lucide-file-music', opus: 'i-lucide-file-music', ape: 'i-lucide-file-music',
  aiff: 'i-lucide-file-music', mid: 'i-lucide-file-music', midi: 'i-lucide-file-music',

  // Archives
  zip: 'i-lucide-file-archive', rar: 'i-lucide-file-archive', '7z': 'i-lucide-file-archive',
  tar: 'i-lucide-file-archive', gz: 'i-lucide-file-archive', bz2: 'i-lucide-file-archive',
  xz: 'i-lucide-file-archive', zst: 'i-lucide-file-archive', iso: 'i-lucide-file-archive',
  dmg: 'i-lucide-file-archive', cab: 'i-lucide-file-archive',

  // Documents
  pdf: 'i-lucide-file-text', doc: 'i-lucide-file-text', docx: 'i-lucide-file-text',
  odt: 'i-lucide-file-text', rtf: 'i-lucide-file-text', txt: 'i-lucide-file-text',
  tex: 'i-lucide-file-text', epub: 'i-lucide-file-text', pages: 'i-lucide-file-text',

  // Presentations
  ppt: 'i-lucide-file-chart-column', pptx: 'i-lucide-file-chart-column',
  odp: 'i-lucide-file-chart-column', key: 'i-lucide-file-chart-column',

  // Spreadsheets
  xls: 'i-lucide-file-spreadsheet', xlsx: 'i-lucide-file-spreadsheet',
  csv: 'i-lucide-file-spreadsheet', ods: 'i-lucide-file-spreadsheet',
  numbers: 'i-lucide-file-spreadsheet', tsv: 'i-lucide-file-spreadsheet',

  // Code
  js: 'i-lucide-file-code', jsx: 'i-lucide-file-code', mjs: 'i-lucide-file-code',
  vue: 'i-lucide-file-code', tsx: 'i-lucide-file-code',
  py: 'i-lucide-file-code', java: 'i-lucide-file-code', kt: 'i-lucide-file-code',
  c: 'i-lucide-file-code', cpp: 'i-lucide-file-code', h: 'i-lucide-file-code',
  hpp: 'i-lucide-file-code', cs: 'i-lucide-file-code', go: 'i-lucide-file-code',
  rs: 'i-lucide-file-code', rb: 'i-lucide-file-code', php: 'i-lucide-file-code',
  swift: 'i-lucide-file-code', r: 'i-lucide-file-code', scala: 'i-lucide-file-code',
  lua: 'i-lucide-file-code', dart: 'i-lucide-file-code', zig: 'i-lucide-file-code',
  html: 'i-lucide-file-code', htm: 'i-lucide-file-code', css: 'i-lucide-file-code',
  scss: 'i-lucide-file-code', sass: 'i-lucide-file-code', less: 'i-lucide-file-code',
  sql: 'i-lucide-file-code', graphql: 'i-lucide-file-code', gql: 'i-lucide-file-code',

  // Data / config (braces-style)
  json: 'i-lucide-file-json', jsonc: 'i-lucide-file-json',

  // Markup / config
  xml: 'i-lucide-file-code', yaml: 'i-lucide-file-cog', yml: 'i-lucide-file-cog',
  toml: 'i-lucide-file-cog', ini: 'i-lucide-file-cog', conf: 'i-lucide-file-cog',
  cfg: 'i-lucide-file-cog', env: 'i-lucide-file-cog', properties: 'i-lucide-file-cog',

  // Markdown
  md: 'i-lucide-file-text', mdx: 'i-lucide-file-text', rst: 'i-lucide-file-text',

  // Shell / terminal
  sh: 'i-lucide-file-terminal', bash: 'i-lucide-file-terminal',
  zsh: 'i-lucide-file-terminal', fish: 'i-lucide-file-terminal',
  bat: 'i-lucide-file-terminal', cmd: 'i-lucide-file-terminal',
  ps1: 'i-lucide-file-terminal',

  // Fonts
  ttf: 'i-lucide-file-type', otf: 'i-lucide-file-type', woff: 'i-lucide-file-type',
  woff2: 'i-lucide-file-type', eot: 'i-lucide-file-type',

  // Keys / certs
  pem: 'i-lucide-file-key', crt: 'i-lucide-file-key', cer: 'i-lucide-file-key',
  p12: 'i-lucide-file-key', pfx: 'i-lucide-file-key', pub: 'i-lucide-file-key',

  // Executables / binaries
  exe: 'i-lucide-file-cog', msi: 'i-lucide-file-cog', dll: 'i-lucide-file-cog',
  apk: 'i-lucide-file-archive', deb: 'i-lucide-file-archive', rpm: 'i-lucide-file-archive',
}

/** Resolve a file icon by name; folders get a dedicated icon */
export function getFileIcon(fileName: string, isFolder: boolean): string {
  if (isFolder) return 'i-lucide-folder'
  const ext = getFileExtension(fileName)
  return EXT_ICON[ext] || 'i-lucide-file'
}

// ── Module-level shared state ──

const viewerOpen = ref(false)
const viewerState = ref<ViewerState | null>(null)
const chooserOpen = ref(false)
const chooserFile = ref<FileBasicInfo | null>(null)
const chooserViewers = ref<FileAppSummary[]>([])

export function useFileOpen() {
  const toast = useToast()

  // ── API helpers ──

  async function fetchViewers(ext: string): Promise<FileViewersResponse> {
    const { data } = await api.get<FileViewersResponse>('/api/v1/file/viewers', { params: { ext } })
    return data
  }

  async function getDownloadToken(fileId: string): Promise<string> {
    const { data } = await api.post<DownloadTokenResponse>(`/api/v1/file/download/${fileId}`)
    return data.access_token
  }

  function buildTokenUrl(accessToken: string): string {
    return `${window.location.origin}/api/v1/file/download/${accessToken}`
  }

  // ── Core methods ──

  /** Called when user clicks / double-clicks a file */
  async function openFile(file: FileBasicInfo) {
    const ext = getFileExtension(file.name)
    if (!ext) return

    try {
      const { viewers, default_viewer_id } = await fetchViewers(ext)

      if (viewers.length === 0) {
        downloadFile(file)
        return
      }

      // Has a saved default?
      if (default_viewer_id) {
        const defaultViewer = viewers.find(v => v.id === default_viewer_id)
        if (defaultViewer) {
          launchViewer(file, defaultViewer)
          return
        }
        // Default no longer available — fallback
      }

      if (viewers.length === 1) {
        launchViewer(file, viewers[0])
        return
      }

      // Multiple viewers — show chooser
      showChooser(file, viewers)
    } catch {
      toast.add({ title: t('viewer.networkError'), icon: 'i-lucide-circle-x', color: 'error' })
    }
  }

  /** Right-click "Open with…" — always show chooser */
  async function openFileWith(file: FileBasicInfo) {
    const ext = getFileExtension(file.name)
    if (!ext) return

    try {
      const { viewers } = await fetchViewers(ext)

      if (viewers.length === 0) {
        downloadFile(file)
        return
      }

      showChooser(file, viewers)
    } catch {
      toast.add({ title: t('viewer.networkError'), icon: 'i-lucide-circle-x', color: 'error' })
    }
  }

  function showChooser(file: FileBasicInfo, viewers: FileAppSummary[]) {
    chooserFile.value = file
    chooserViewers.value = viewers
    chooserOpen.value = true
  }

  /** Called when user picks a viewer in the AppChooser */
  async function onAppChosen(viewerId: string, remember: boolean) {
    const viewer = chooserViewers.value.find(v => v.id === viewerId)
    const file = chooserFile.value
    if (!viewer || !file) return

    chooserOpen.value = false

    if (remember) {
      const ext = getFileExtension(file.name)
      try {
        await api.put('/api/v1/user/settings/file-viewers/default', {
          extension: ext,
          app_id: viewer.id,
        })
      } catch {
        // Non-critical — preference save failed, still open the file
      }
    }

    launchViewer(file, viewer)
  }

  /** Launch the viewer modal and prepare file content */
  async function launchViewer(file: FileBasicInfo, viewer: FileAppSummary) {
    viewerState.value = {
      fileId: file.id,
      fileName: file.name,
      fileSize: file.size,
      viewer,
      contentUrl: null,
      textContent: null,
      baseHash: null,
      originalContent: null,
      loading: true,
      error: null,
    }
    viewerOpen.value = true

    try {
      if (viewer.type === 'builtin') {
        if (TEXT_CONTENT_APPS.has(viewer.app_key)) {
          const { data } = await api.get<TextContentResponse>(`/api/v1/file/content/${file.id}`)
          viewerState.value = {
            ...viewerState.value!,
            textContent: data.content,
            baseHash: data.hash,
            originalContent: data.content,
            loading: false,
          }
        } else {
          const token = await getDownloadToken(file.id)
          const tokenUrl = buildTokenUrl(token)
          viewerState.value = { ...viewerState.value!, contentUrl: tokenUrl, loading: false }
        }
      } else if (viewer.type === 'iframe') {
        const token = await getDownloadToken(file.id)
        const fileUrl = buildTokenUrl(token)
        const src = (viewer.iframe_url_template || '').replace('{file_url}', encodeURIComponent(fileUrl))
        viewerState.value = { ...viewerState.value!, contentUrl: src, loading: false }
      } else if (viewer.type === 'wopi') {
        const { data } = await api.post<WopiSessionResponse>(`/api/v1/file/${file.id}/wopi-session`)
        viewerState.value = { ...viewerState.value!, contentUrl: data.editor_url, loading: false }
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { status?: number } })?.response?.status === 404
        ? t('viewer.fileNotFound')
        : t('viewer.loadErrorDesc')
      viewerState.value = { ...viewerState.value!, error: msg, loading: false }
    }
  }

  /** Save text content via incremental diff patch */
  async function saveTextContent(currentText: string): Promise<boolean> {
    const state = viewerState.value
    if (!state || state.originalContent === null || state.baseHash === null) return false

    if (currentText === state.originalContent) {
      toast.add({ title: t('viewer.editor.noChanges'), icon: 'i-lucide-info', color: 'info' })
      return true
    }

    const patch = createPatch(state.fileName, state.originalContent, currentText)

    try {
      const { data } = await api.patch<PatchContentResponse>(`/api/v1/file/content/${state.fileId}`, {
        patch,
        base_hash: state.baseHash,
      })
      // Mutate in place to avoid triggering activeComponent recompute & component remount
      state.baseHash = data.new_hash
      state.originalContent = currentText
      state.textContent = currentText
      state.fileSize = data.new_size
      toast.add({ title: t('viewer.editor.saved'), icon: 'i-lucide-check', color: 'success' })
      return true
    } catch (e: unknown) {
      const err = e as AxiosError<{ detail?: string }>
      const status = err.response?.status
      if (status === 409) {
        toast.add({ title: t('viewer.editor.conflict'), icon: 'i-lucide-alert-triangle', color: 'error' })
      } else if (status === 422) {
        toast.add({ title: t('viewer.editor.patchFailed'), icon: 'i-lucide-circle-x', color: 'error' })
      } else {
        toast.add({ title: t('viewer.editor.saveError'), icon: 'i-lucide-circle-x', color: 'error' })
      }
      return false
    }
  }

  /** Trigger browser download for a file */
  async function downloadFile(file: FileBasicInfo) {
    try {
      const token = await getDownloadToken(file.id)
      const url = buildTokenUrl(token)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch {
      toast.add({ title: t('viewer.networkError'), icon: 'i-lucide-circle-x', color: 'error' })
    }
  }

  /** Close the viewer modal */
  function closeViewer() {
    viewerOpen.value = false
    setTimeout(() => {
      viewerState.value = null
    }, 300)
  }

  // i18n — auto-imported by @nuxt/ui vite plugin
  const { t } = useI18n()

  return {
    viewerOpen: readonly(viewerOpen),
    viewerState: readonly(viewerState),
    chooserOpen,
    chooserFile: readonly(chooserFile),
    chooserViewers: readonly(chooserViewers),

    openFile,
    openFileWith,
    onAppChosen,
    downloadFile,
    closeViewer,
    saveTextContent,
  }
}
