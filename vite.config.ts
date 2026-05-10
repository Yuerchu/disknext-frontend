import path from "path"
import { defineConfig, loadEnv } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const gatewayUrl = env.VITE_GATEWAY_URL;

  const proxy: Record<string, string> = {
    "/api": "http://127.0.0.1:8000",
    "/dav": "http://127.0.0.1:8000",
    "/wopi": "http://127.0.0.1:8000",
  };

  if (gatewayUrl) {
    proxy["/upload"] = gatewayUrl;
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: { proxy },
  };
})
