import { lazy, Suspense } from "react"
import { Navigate, Route, Routes } from "react-router-dom"

const HomePage = lazy(() => import("./pages/HomePage").then((module) => ({ default: module.HomePage })))
const LoginPage = lazy(() => import("./pages/LoginPage").then((module) => ({ default: module.LoginPage })))
const MePage = lazy(() => import("./pages/MePage").then((module) => ({ default: module.MePage })))
const DatabaseAdminPage = lazy(() => import("./pages/DatabaseAdminPage").then((module) => ({ default: module.DatabaseAdminPage })))

export function AppRouter() {
  return (
    <Suspense fallback={ null }>
      <Routes>
        <Route path="/" element={ <HomePage/> }/>
        <Route path="/login" element={ <LoginPage/> }/>
        <Route path="/me" element={ <MePage/> }/>
        <Route path="/database" element={ <DatabaseAdminPage/> }/>
        <Route path="/admin" element={ <Navigate replace to="/database"/> }/>
        <Route path="*" element={ <Navigate replace to="/"/> }/>
      </Routes>
    </Suspense>
  )
}
