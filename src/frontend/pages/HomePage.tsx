import { Link } from "react-router-dom"
import { useState } from "react"
import { SiteCredit } from "../components/SiteCredit"
import { HOME_ACTIONS, HOME_INFO_ITEMS, HOME_PROFILE, HOME_TABS, HOME_TAGS, type HomeAction, type HomeTab } from "../content/home"

function HomeActionLink({ href, label, target }: HomeAction) {
  const className = "block rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-center text-base font-semibold text-white no-underline transition duration-300 hover:border-[#60a5fa] hover:bg-[#60a5fa]/5 focus:outline-none focus:ring-4 focus:ring-cyan-300/20"

  if (target) return (
    <a className={ className } href={ href } rel="noreferrer" target={ target }>
      <h3 className="m-0 text-base font-semibold text-white">{ label }</h3>
    </a>
  )

  return (
    <Link className={ className } to={ href }>
      <h3 className="m-0 text-base font-semibold text-white">{ label }</h3>
    </Link>
  )
}

function ActionList({ items }: { items: HomeAction[] }) {
  return (
    <div className="flex flex-col gap-2.5">
      { items.map((item) => (
        <HomeActionLink key={ `${ item.label }-${ item.href }` } { ...item } />
      )) }
    </div>
  )
}

export function HomePage() {
  const [ activeTab, setActiveTab ] = useState<HomeTab>("links")

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4">
      <section className="glass-card flex min-h-[630px] w-full max-w-[560px] flex-col px-8 py-7 text-center sm:px-9 sm:py-8">
        <header>
          <img
            alt={ HOME_PROFILE.imageAlt }
            className="mx-auto mb-4 h-[84px] w-[84px] rounded-full border-[3px] border-white/10 object-cover"
            src={ HOME_PROFILE.imageSrc }
          />

          <h1 className="gradient-text m-0 mb-4 text-[30px] font-extrabold leading-tight">
            { HOME_PROFILE.name }
          </h1>
        </header>

        <nav className="mb-5 flex justify-center gap-2 rounded-xl bg-white/[0.05] p-1.5">
          { HOME_TABS.map((tab) => (
            <button
              className={ `rounded-lg px-4 py-2 text-sm font-semibold transition duration-300 ${
                activeTab === tab.value
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/80"
              }` }
              key={ tab.value }
              onClick={ () => setActiveTab(tab.value) }
              type="button"
            >
              { tab.label }
            </button>
          )) }
        </nav>

        <div className="flex min-h-[310px] flex-col justify-start">
          {activeTab === "links" ? (
            <div className="animate-panel-in">
              <div className="mb-4 grid grid-cols-3 gap-2.5">
                { HOME_INFO_ITEMS.map((item) => (
                  <div
                    className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] px-2 py-2.5 transition duration-300 hover:-translate-y-0.5 hover:border-blue-400/40"
                    key={ item.label }
                  >
                    <span className="mb-1 text-[10px] font-normal uppercase tracking-[1px] text-white/40">
                      { item.label }
                    </span>
                    <span className="text-sm font-bold text-white">
                      { item.value }
                    </span>
                  </div>
                )) }
              </div>

              <div className="mb-5 flex justify-center gap-2">
                { HOME_TAGS.map((tag) => (
                  <span
                    className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-white/80"
                    key={ tag }
                  >
                    { tag }
                  </span>
                )) }
              </div>

              <ActionList items={ HOME_ACTIONS.links }/>
            </div>
          ) : null }

          { activeTab === "projects" ? (
            <div className="animate-panel-in">
              <ActionList items={ HOME_ACTIONS.projects }/>
            </div>
          ) : null }

          { activeTab === "extras" ? (
            <div className="animate-panel-in">
              <ActionList items={ HOME_ACTIONS.extras }/>
            </div>
          ) : null }
        </div>

        <SiteCredit className="mt-8"/>
      </section>
    </main>
  )
}