import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import ui from '@nuxt/ui/vite'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
      '/dav': 'http://127.0.0.1:8000',
      '/emby': 'http://127.0.0.1:8000',
      '/subsonic': 'http://127.0.0.1:8000'
    }
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
