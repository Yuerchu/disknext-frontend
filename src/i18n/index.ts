import { createI18n } from 'vue-i18n'
import zhCN from './zh-CN'
import en from './en'
import zhTW from './zh-TW'

function getDefaultLocale(): string {
  const saved = localStorage.getItem('locale')
  if (saved && ['zh-CN', 'en', 'zh-TW'].includes(saved)) return saved

  const browserLang = navigator.language
  if (browserLang.startsWith('zh')) {
    return browserLang.includes('TW') || browserLang.includes('HK') ? 'zh-TW' : 'zh-CN'
  }
  return 'en'
}

const i18n = createI18n({
  legacy: false,
  locale: getDefaultLocale(),
  fallbackLocale: 'zh-CN',
  messages: { 'zh-CN': zhCN, en, 'zh-TW': zhTW },
})

export default i18n

export function setLocale(locale: string) {
  ;(i18n.global.locale as any).value = locale
  localStorage.setItem('locale', locale)
}
