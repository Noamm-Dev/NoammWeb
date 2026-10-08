import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { copyFileSync } from "node:fs"
import { resolve } from "node:path"

// Cloudflare only falls back to index.html when there's no 404.html, so shipping one makes unknown paths real 404s.
// It's the same SPA shell, so the router renders NotFoundPage for them.
const notFoundPage = (): Plugin => ({
  name: "not-found-page",
  apply: "build",
  writeBundle: ({ dir = "dist" }) => copyFileSync(resolve(dir, "index.html"), resolve(dir, "404.html"))
})

export default defineConfig({
  plugins: [ react(), tailwindcss(), notFoundPage() ],
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