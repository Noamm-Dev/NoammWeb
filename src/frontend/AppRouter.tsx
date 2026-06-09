import { lazy, Suspense, type ReactNode } from "react"
import { Navigate, Route, Routes } from "react-router-dom"
import { AppNavigation } from "./components/AppNavigation"

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })))
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })))
const MePage = lazy(() => import("./pages/MePage").then((module) => ({ default: module.MePage })))
const DatabaseAdminPage = lazy(() => import("./pages/DatabaseAdminPage").then((module) => ({ default: module.DatabaseAdminPage })))
const PreviewPage = lazy(() => import("./pages/PreviewPage").then((module) => ({ default: module.PreviewPage })))

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
        <Route path="/me" element={ <NavigationPage><MePage/></NavigationPage> }/>
        <Route path="/database" element={ <NavigationPage><DatabaseAdminPage/></NavigationPage> }/>
        <Route path="/preview" element={ <NavigationPage><PreviewPage/></NavigationPage> }/>
        <Route path="/admin" element={ <Navigate replace to="/database"/> }/>
        <Route path="*" element={ <Navigate replace to="/"/> }/>
      </Routes>
    </Suspense>
  )
}
