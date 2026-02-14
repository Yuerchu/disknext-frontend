<script setup lang="ts">
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'
import { getFileExtension, useFileOpen } from '../../composables/useFileOpen'

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') return new jsonWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  },
}

const props = defineProps<{
  content: string
  fileName: string
  fileSize: number
  fileId?: string
}>()

const emit = defineEmits<{
  dirty: [isDirty: boolean]
  saving: [isSaving: boolean]
}>()

const containerRef = ref<HTMLDivElement | null>(null)
let editor: monaco.editor.IStandaloneCodeEditor | null = null

const { saveTextContent } = useFileOpen()
const saving = ref(false)
/** Local baseline: updated on mount and after each successful save */
const savedContent = ref(props.content)

const EXT_LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  vue: 'html',
  html: 'html',
  htm: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  xml: 'xml',
  svg: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  py: 'python',
  rb: 'ruby',
  java: 'java',
  kt: 'kotlin',
  go: 'go',
  rs: 'rust',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  swift: 'swift',
  php: 'php',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  sql: 'sql',
  graphql: 'graphql',
  dockerfile: 'dockerfile',
  toml: 'ini',
  ini: 'ini',
  conf: 'ini',
  txt: 'plaintext',
  log: 'plaintext',
}

function getLanguage(fileName: string): string {
  const ext = getFileExtension(fileName)
  return EXT_LANGUAGE_MAP[ext] || 'plaintext'
}

function isDark() {
  return document.documentElement.classList.contains('dark')
}

async function save() {
  if (saving.value || !editor || !props.fileId) return
  saving.value = true
  emit('saving', true)
  try {
    const currentText = editor.getValue()
    const success = await saveTextContent(currentText)
    if (success) {
      savedContent.value = currentText
      emit('dirty', false)
    }
  } finally {
    saving.value = false
    emit('saving', false)
  }
}

onMounted(() => {
  if (!containerRef.value) return

  const editable = !!props.fileId

  editor = monaco.editor.create(containerRef.value, {
    value: props.content,
    language: getLanguage(props.fileName),
    readOnly: !editable,
    automaticLayout: true,
    minimap: { enabled: true },
    scrollBeyondLastLine: false,
    fontSize: 14,
    theme: isDark() ? 'vs-dark' : 'vs',
  })

  if (editable) {
    // Register Ctrl+S save action
    editor.addAction({
      id: 'save-file',
      label: 'Save',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => { save() },
    })

    // Track dirty state against local baseline (not props.content which updates async)
    editor.onDidChangeModelContent(() => {
      if (!editor) return
      emit('dirty', editor.getValue() !== savedContent.value)
    })
  }

  const observer = new MutationObserver(() => {
    monaco.editor.setTheme(isDark() ? 'vs-dark' : 'vs')
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
  onBeforeUnmount(() => observer.disconnect())
})

onBeforeUnmount(() => {
  editor?.dispose()
  editor = null
})
</script>

<template>
  <div
    ref="containerRef"
    class="w-full h-full"
    @keydown.ctrl.s.prevent
    @keydown.meta.s.prevent
  />
</template>
