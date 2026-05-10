import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const location = proxyRes.headers["location"];
            if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && location) {
              try {
                const url = new URL(location);
                proxyRes.headers["location"] = url.pathname + url.search;
              } catch { /* not absolute URL, leave as-is */ }
            }
          });
        },
      },
      "/dav": "http://127.0.0.1:8000",
      "/wopi": "http://127.0.0.1:8000",
      "/download": "http://127.0.0.1:18080",
    },
  },
})
