import { NavLink, Outlet } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { NAV_LINKS } from './config/navLinks'

export function App() {
  return (
    <div className="min-h-screen bg-canvas text-ink font-body">
      <nav aria-label="Top navigation" className="h-14 bg-canvas border-b border-hairline flex items-center px-6">
        <span className="text-sm font-semibold tracking-tight text-ink">
          IndexApportationRecommender
        </span>
        <div className="hidden sm:flex gap-1 ml-auto">
          {NAV_LINKS.map(({ to, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-pill text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-surface-2 text-ink'
                    : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-24 sm:pb-8">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
