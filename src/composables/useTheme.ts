import type { ThemeColors, ThemePreset } from '../constants/colors'
import { defaultThemeColors } from '../constants/colors'
import api from '../utils/api'

const STORAGE_KEY = 'theme'

const presets = ref<ThemePreset[]>([])
const presetId = ref<string | null>(null)

export function useTheme() {
  const appConfig = useAppConfig()

  function applyColors(colors: ThemeColors) {
    appConfig.ui.colors.primary = colors.primary
    appConfig.ui.colors.secondary = colors.secondary
    appConfig.ui.colors.success = colors.success
    appConfig.ui.colors.info = colors.info
    appConfig.ui.colors.warning = colors.warning
    appConfig.ui.colors.error = colors.error
    appConfig.ui.colors.neutral = colors.neutral
  }

  function saveToStorage(colors: ThemeColors, pid: string | null) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ colors, preset_id: pid }))
  }

  function loadFromStorage(): { colors: ThemeColors; preset_id: string | null } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }

  function init() {
    const cached = loadFromStorage()
    if (cached?.colors) {
      presetId.value = cached.preset_id
      applyColors(cached.colors)
    }
  }

  async function fetchPresets() {
    try {
      const { data } = await api.get<{ themes: ThemePreset[] }>('/api/v1/site/themes')
      presets.value = data.themes
    } catch {
      // silently ignore - presets are optional
    }
  }

  async function syncFromServer() {
    try {
      const { data } = await api.get<{
        theme_preset_id: string | null
        theme_colors: ThemeColors | null
      }>('/api/v1/user/settings/')
      if (data.theme_colors) {
        presetId.value = data.theme_preset_id
        applyColors(data.theme_colors)
        saveToStorage(data.theme_colors, data.theme_preset_id)
      }
    } catch {
      // silently ignore - use local cache
    }
  }

  function setTheme(colors: ThemeColors, pid: string | null) {
    presetId.value = pid
    applyColors(colors)
    saveToStorage(colors, pid)
    api.patch('/api/v1/user/settings/theme', {
      theme_preset_id: pid,
      theme_colors: colors
    }).catch(() => {})
  }

  function selectPreset(preset: ThemePreset) {
    setTheme(preset.colors, preset.id)
  }

  function getCurrentColors(): ThemeColors {
    return {
      primary: appConfig.ui.colors.primary,
      secondary: appConfig.ui.colors.secondary,
      success: appConfig.ui.colors.success,
      info: appConfig.ui.colors.info,
      warning: appConfig.ui.colors.warning,
      error: appConfig.ui.colors.error,
      neutral: appConfig.ui.colors.neutral
    }
  }

  function setColor(key: keyof ThemeColors, colorName: string) {
    const current = getCurrentColors()
    setTheme({ ...current, [key]: colorName }, null)
  }

  function resetToDefault() {
    setTheme(defaultThemeColors, null)
  }

  return {
    presetId: readonly(presetId),
    presets: readonly(presets),
    init,
    fetchPresets,
    syncFromServer,
    setTheme,
    selectPreset,
    setColor,
    getCurrentColors,
    resetToDefault
  }
}
