import js from '@eslint/js'
import eslintPluginVue from 'eslint-plugin-vue'
import ts from 'typescript-eslint'
import globals from 'globals'
import autoImportGlobals from './.eslintrc-auto-import.json' with { type: 'json' }

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  ...eslintPluginVue.configs['flat/recommended'],
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...autoImportGlobals.globals,
        grecaptcha: 'readonly',
        turnstile: 'readonly',
        FileSystemEntry: 'readonly',
        FileSystemFileEntry: 'readonly',
        FileSystemDirectoryEntry: 'readonly',
        FileSystemDirectoryReader: 'readonly',
      }
    }
  },
  {
    files: ['*.vue', '**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: '@typescript-eslint/parser'
      }
    },
    rules: {
      'vue/multi-word-component-names': 'off'
    }
  }
)
