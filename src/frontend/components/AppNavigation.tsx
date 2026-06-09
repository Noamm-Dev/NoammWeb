import { Link, useLocation } from "react-router-dom"
import { NAVIGATION_ITEMS } from "../content/navigation"

export function AppNavigation() {
  const { pathname } = useLocation()

  return (
    <nav className="app-navigation" aria-label="Main navigation">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-center">
        <div className="flex w-full flex-wrap items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] p-1.5 shadow-[0_18px_45px_rgba(37,99,235,0.16)] backdrop-blur-xl sm:w-auto">
          { NAVIGATION_ITEMS.map((item) => {
            const isActive = item.activePaths.includes(pathname)

            return (
              <Link
                aria-current={ isActive ? "page" : undefined }
                className={ `inline-flex min-h-10 flex-1 items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition duration-300 sm:flex-none ${
                  isActive
                    ? "bg-white/10 text-white shadow-[0_0_0_1px_rgba(96,165,250,0.24)]"
                    : "text-white/50 hover:bg-[#60a5fa]/5 hover:text-white/80"
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
