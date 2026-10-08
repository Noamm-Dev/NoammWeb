import { defineConfig, type Plugin } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { readFileSync, writeFileSync } from "node:fs"
import { resolve } from "node:path"

const NOT_FOUND_META: Record<string, string> = {
  "og:title": "404: Page not found",
  "description": "Wtf are you doing?.",
  "og:description": "Wtf are you doing?",
  "theme-color": "#ca0707"
}

// Cloudflare only falls back to index.html when there's no 404.html, so shipping one makes unknown paths real 404s.
// It's the same SPA shell (the router renders NotFoundPage), with the embed meta swapped for the 404 one.
const notFoundPage = (): Plugin => ({
  name: "not-found-page",
  apply: "build",
  writeBundle: ({ dir = "dist" }) => {
    const html = Object.entries(NOT_FOUND_META).reduce(
      (page, [ key, value ]) => page.replace(new RegExp(`content="[^"]*"(?= (?:name|property)="${ key }")`), `content="${ value }"`),
      readFileSync(resolve(dir, "index.html"), "utf-8").replace(/<title>.*?<\/title>/, "<title>404: Page not found</title>")
    )
    writeFileSync(resolve(dir, "404.html"), html)
  }
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

            proxyRes.headers["set-cookie"] = (Array.isArray(setCookie) ? setCookie : [ setCookie ]).map((cookie) =>
              cookie.replace(/\s*;\s*Secure(?=\s*;|$)/gi, "").replace(/\s*;\s*SameSite=None(?=\s*;|$)/gi, "; SameSite=Lax")
            )
          })
        }
      }
    }
  }
})