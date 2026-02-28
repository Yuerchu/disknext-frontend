import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'

const backend = "http://127.0.0.1:8000";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "0.0.0.0",
    proxy: {
      '/api': { target: backend },
      '/dav': { target: backend },
      '/emby': { target: backend },
      '/subsonic': { target: backend },
    }
  },
  resolve: {
    alias: [
      // Redirect the bare 'monaco-editor' package import to the minimal editor.api entry point.
      // This prevents editor.main.js from loading all ~80 basic-language tokenisers by default.
      // Sub-path imports such as 'monaco-editor/esm/...' are intentionally NOT affected.
      // The full package types are still used by TypeScript for correct type inference.
      {
        find: /^monaco-editor$/,
        replacement: 'monaco-editor/esm/vs/editor/editor.api',
      },
    ],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('monaco-editor/esm/vs/')) return 'vendor-monaco'
          if (id.includes('monaco-editor')) return 'vendor-monaco'
          if (id.includes('pdfjs-dist/build')) return 'vendor-pdf-build'
          if (id.includes('pdfjs-dist/web')) return 'vendor-pdf-web'
          if (id.includes('@tato30/vue-pdf')) return 'vendor-pdf-vue'
          if (id.includes('plyr')) return 'vendor-plyr'
          if (id.includes('epubjs')) return 'vendor-epub'
          if (id.includes('three/addons/loaders')) return 'vendor-three-loaders'
          if (id.includes('three/addons/controls')) return 'vendor-three-controls'
          if (id.includes('three/examples/jsm')) return 'vendor-three-extras'
          if (id.includes('three/addons')) return 'vendor-three-addons'
          if (id.includes('three')) return 'vendor-three-core'
          if (id.includes('opentype')) return 'vendor-opentype'
        }
      }
    }
  },
  plugins: [
    vue(),
    ui({
      ui: {
        colors: {
          primary: 'green',
          neutral: 'zinc'
        }
      },
      autoImport: {
        imports: ['vue', 'vue-router'],
        eslintrc: {
          enabled: true
        }
      }
    })
  ]
})
