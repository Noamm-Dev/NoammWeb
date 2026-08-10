import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

export default defineConfig({
  plugins: [ react(), tailwindcss() ],
  server: {
    proxy: {
      "/api": {
        target: "https://api.noamm.org",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        configure: (proxy) => {
          proxy.on("proxyRes", (proxyRes) => {
            const setCookie = proxyRes.headers["set-cookie"]
            if (! setCookie) return

            const sanitized = (Array.isArray(setCookie) ? setCookie : [ setCookie ]).map((cookie) =>
              cookie
                .replace(/\s*;\s*Secure(?=\s*;|$)/gi, "")
                .replace(/\s*;\s*SameSite=None(?=\s*;|$)/gi, "; SameSite=Lax")
            )
            proxyRes.headers["set-cookie"] = sanitized
          })
        }
      }
    }
  }
})