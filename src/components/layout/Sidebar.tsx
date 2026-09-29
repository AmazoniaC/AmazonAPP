// ─────────────────────────────────────────────────────────────────────────────
// Persistent desktop sidebar — replaces the header dropdown (ModuleNav) as the
// primary way to switch modules. Collapsible to an icon-only rail; hidden on
// phones, which keep their own bottom tab bar (MobileTabBar).
// ─────────────────────────────────────────────────────────────────────────────
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronsLeft, ChevronsRight, Leaf } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { MODULE_GROUPS, modulesForRole, moduleForPath } from '../../config/modules'

export default function Sidebar() {
  const { user, sidebarOpen, setSidebarOpen, companySettings } = useStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()

  const allowed = modulesForRole(user?.role)
  const current = moduleForPath(pathname)
  const logo = companySettings.logo

  return (
    <aside
      className={`app-header sticky top-0 hidden h-screen flex-shrink-0 flex-col md:flex
                  transition-[width] duration-200 ${sidebarOpen ? 'w-60' : 'w-[72px]'}`}
    >
      {/* Brand */}
      <button
        onClick={() => navigate('/')}
        title="Volver al inicio"
        className={`flex h-14 flex-shrink-0 items-center gap-2.5 border-b border-white/10 px-4 ${sidebarOpen ? '' : 'justify-center px-0'}`}
      >
        {logo ? (
          <img src={logo} alt="" className="h-8 w-8 flex-shrink-0 rounded-lg object-contain" />
        ) : (
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/15">
            <Leaf size={16} className="text-white" />
          </div>
        )}
        {sidebarOpen && (
          <span className="truncate text-sm font-bold tracking-tight text-white">
            {companySettings.companyName || 'Amazonia Concrete'}
          </span>
        )}
      </button>

      {/* Module groups */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Navegación de módulos">
        {MODULE_GROUPS.map((group) => {
          const items = allowed.filter((m) => m.group === group)
          if (items.length === 0) return null
          return (
            <div key={group} className="mb-4 last:mb-0">
              {sidebarOpen && (
                <p className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                  {group}
                </p>
              )}
              <div className="space-y-0.5">
                {items.map((m) => {
                  const active = current?.to === m.to
                  return (
                    <Link
                      key={m.to}
                      to={m.to}
                      title={sidebarOpen ? undefined : m.label}
                      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                        sidebarOpen ? '' : 'justify-center'
                      } ${
                        active
                          ? 'bg-white/15 font-semibold text-white'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      <m.icon size={17} className="flex-shrink-0" />
                      {sidebarOpen && <span className="truncate">{m.label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        title={sidebarOpen ? 'Contraer menú' : 'Expandir menú'}
        className={`flex h-11 flex-shrink-0 items-center gap-2 border-t border-white/10 px-4 text-white/60
                    transition-colors hover:bg-white/10 hover:text-white ${sidebarOpen ? '' : 'justify-center px-0'}`}
      >
        {sidebarOpen ? <ChevronsLeft size={16} /> : <ChevronsRight size={16} />}
        {sidebarOpen && <span className="text-xs font-medium">Contraer</span>}
      </button>
    </aside>
  )
}
