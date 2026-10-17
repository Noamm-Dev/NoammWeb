import "./index.scss"
import "./tailwind.css"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { AppRouter } from "./AppRouter"
import { NotificationCenter } from "./components/NotificationCenter"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <div className="app-background"/>
      <AppRouter/>
      <NotificationCenter/>
    </BrowserRouter>
  </StrictMode>
)