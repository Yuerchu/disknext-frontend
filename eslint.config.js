import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // shadcn/ui 生成的组件会导出 variants 等非组件值
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // react-hooks v7 新规则，对 useEffect 中调用异步数据加载函数（标准 React 模式）过于严格
      // 正确修复需要引入 React Router loader 或 TanStack Query，暂降级为 warn
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
])
