import { type ComponentType, lazy, type ReactNode, Suspense } from "react"
import { Route, Routes } from "react-router-dom"
import { AppNavigation } from "./components/AppNavigation"
import { StatusBanner } from "./components/StatusBanner"
import SiteConfig from "./lib/SiteConfig"
import { getErrorMessage } from "./utils"

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })))
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })))
const MePage = lazy(() => withSiteConfig(import("./pages/MePage").then((module) => ({ default: module.MePage }))))
const DatabaseAdminPage = lazy(() => withSiteConfig(import("./pages/DatabaseAdminPage").then((module) => ({ default: module.DatabaseAdminPage }))))
const PreviewPage = lazy(() => withSiteConfig(import("./pages/PreviewPage").then((module) => ({ default: module.PreviewPage }))))
const SyncthingSetupPage = lazy(() => import("./pages/guide/SyncthingSetupPage").then((module) => ({ default: module.default })))
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })))

// pages that read SiteConfig only render once the backend config is loaded
function withSiteConfig(page: Promise<{ default: ComponentType }>) {
  return Promise.all([ page, SiteConfig.load() ])
    .then(([ module ]) => module)
    .catch((error) => ({ default: () => <SiteConfigError message={ getErrorMessage(error) }/> }))
}

function SiteConfigError({ message }: { message: string }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-8">
      <section className="glass-card w-full max-w-[460px] p-6">
        <StatusBanner message={ `Failed to load site config: ${ message }` } tone="error"/>
      </section>
    </main>
  )
}

function NavigationPage({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <AppNavigation/>
      <div className="app-navigation-page">
        { children }
      </div>
    </div>
  )
}

export function AppRouter() {
  return (
    <Suspense fallback={ null }>
      <Routes>
        <Route path="/" element={ <HomePage/> }/>
        <Route path="/login" element={ <NavigationPage><LoginPage/></NavigationPage> }/>
        <Route path="/me" element={ <MePage/> }/>
        <Route path="/database" element={ <NavigationPage><DatabaseAdminPage/></NavigationPage> }/>
        <Route path="/preview" element={ <NavigationPage><PreviewPage/></NavigationPage> }/>
        <Route path="/guide/syncthing" element={ <SyncthingSetupPage/> }/>
        <Route path="*" element={ <NavigationPage><NotFoundPage/></NavigationPage> }/>
      </Routes>
    </Suspense>
  )
}