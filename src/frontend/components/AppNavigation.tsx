import { Link, useLocation } from "react-router-dom"
import { NAVIGATION_ITEMS } from "../content/navigation"

export function AppNavigation() {
  const { pathname } = useLocation()

  return (
    <nav className="app-navigation" aria-label="Main navigation">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center">
        <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/35 p-2 shadow-2xl shadow-black/25 backdrop-blur-xl sm:w-auto">
          { NAVIGATION_ITEMS.map((item) => {
            const isActive = item.activePaths.includes(pathname)

            return (
              <Link
                aria-current={ isActive ? "page" : undefined }
                className={ `inline-flex min-h-10 flex-1 items-center justify-center rounded-lg px-4 py-2 text-sm font-extrabold transition sm:flex-none ${
                  isActive
                    ? "bg-cyan-300/15 text-white shadow-[0_0_0_1px_rgba(103,232,249,0.22)]"
                    : "text-white/48 hover:bg-white/[0.06] hover:text-white"
                }` }
                key={ item.href }
                to={ item.href }
              >
                { item.label }
              </Link>
            )
          }) }
        </div>
      </div>
    </nav>
  )
}
