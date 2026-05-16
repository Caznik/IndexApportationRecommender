import { NavLink } from 'react-router-dom'
import { NAV_LINKS } from '../config/navLinks'

export function BottomNav() {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 min-h-[4rem] bg-canvas flex items-stretch justify-around z-50 pb-[env(safe-area-inset-bottom,0px)]" aria-label="Bottom navigation">
      {NAV_LINKS.map(({ to, label, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center flex-1 text-xs font-medium transition-colors ${
              isActive
                ? 'text-ink border-t-2 border-grad-violet'
                : 'text-ink-muted border-t-2 border-hairline'
            }`
          }
        >
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
