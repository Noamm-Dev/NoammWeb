import "./index.scss"
import "./tailwind.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AppRouter } from "./AppRouter"
import { NotificationCenter } from "./components/NotificationCenter"
import { StatusBanner } from "./components/StatusBanner"
import SiteConfig from "./lib/SiteConfig"
import { getErrorMessage } from "./utils"

const root = createRoot(document.getElementById("root")!)

SiteConfig.load().then(() => root.render(
  <StrictMode>
    <BrowserRouter>
      <div className="app-background"/>
      <AppRouter/>
      <NotificationCenter/>
    </BrowserRouter>
  </StrictMode>
)).catch((error) => root.render(
  <StrictMode>
    <div className="app-background"/>
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <section className="glass-card w-full max-w-[460px] p-6">
        <StatusBanner message={ `Failed to load site config: ${ getErrorMessage(error) }` } tone="error"/>
      </section>
    </main>
  </StrictMode>
))