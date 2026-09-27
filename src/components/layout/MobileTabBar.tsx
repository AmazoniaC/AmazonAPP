// ─────────────────────────────────────────────────────────────────────────────
// Bottom tab bar — phone navigation for design direction B.
//
// Four shortcuts plus a "Más" sheet listing every module the role can open, so
// the phone never depends on the home screen to move between modules.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MoreHorizontal, X, Search, Home } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { MODULE_GROUPS, modulesForRole, quickModules, moduleForPath } from '../../config/modules'

export default function MobileTabBar() {
  const { user } = useStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [sheet, setSheet] = useState(false)

  const quick = quickModules(user?.role)
  const allowed = modulesForRole(user?.role)
  const current = moduleForPath(pathname)
  const inQuick = quick.some((m) => m.to === current?.to)

  useEffect(() => { setSheet(false) }, [pathname])

  // Lock background scroll while the sheet is open
  useEffect(() => {
    if (!sheet) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [sheet])

  const go = (to: string) => { navigate(to); setSheet(false) }

  return (
    <>
      {sheet && (
        <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-label="Todos los módulos">
          <div className="absolute inset-0 bg-black/45" onClick={() => setSheet(false)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-3xl
                          bg-white pb-[max(1rem,env(safe-area-inset-bottom))] dark:bg-gray-800">
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-100
                            bg-white px-5 py-3.5 dark:border-gray-700 dark:bg-gray-800">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Todos los módulos</h2>
              <button onClick={() => setSheet(false)} aria-label="Cerrar"
                className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-700">
                <X size={19} />
              </button>
            </div>

            <div className="flex gap-2 px-5 pt-3">
              <button onClick={() => go('/')}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200
                           py-2.5 text-sm font-medium text-slate-700 dark:border-gray-600 dark:text-gray-200">
                <Home size={15} /> Inicio
              </button>
              <button
                onClick={() => { setSheet(false); window.dispatchEvent(new CustomEvent('open-global-search')) }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200
                           py-2.5 text-sm font-medium text-slate-700 dark:border-gray-600 dark:text-gray-200">
                <Search size={15} /> Buscar
              </button>
            </div>

            <div className="px-5 py-3">
              {MODULE_GROUPS.map((group) => {
                const items = allowed.filter((m) => m.group === group)
                if (items.length === 0) return null
                return (
                  <div key={group} className="mb-4 last:mb-0">
                    <p className="pb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">
                      {group}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {items.map((m) => {
                        const active = current?.to === m.to
                        return (
                          <button key={m.to} onClick={() => go(m.to)}
                            className={`flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-xl
                                        border p-2 text-center transition-colors ${
                              active
                                ? 'border-amazonia-300 bg-amazonia-50 text-amazonia-800 dark:border-amazonia-700 dark:bg-amazonia-900/40 dark:text-amazonia-200'
                                : 'border-slate-200 text-slate-700 dark:border-gray-700 dark:text-gray-300'
                            }`}>
                            <m.icon size={19} className="opacity-85" />
                            <span className="text-[11px] font-medium leading-tight">{m.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className="fixed inset-x-0 bottom-0 z-[70] flex border-t border-slate-200 bg-white/95
                   pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden
                   dark:border-gray-700 dark:bg-gray-800/95">
        {quick.map((m) => {
          const active = current?.to === m.to
          return (
            <button key={m.to} onClick={() => go(m.to)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 ${
                active ? 'text-amazonia-700 dark:text-amazonia-300' : 'text-slate-500 dark:text-gray-400'
              }`}>
              <m.icon size={19} strokeWidth={active ? 2.4 : 2} />
              <span className={`text-[10px] leading-none ${active ? 'font-semibold' : ''}`}>{m.label}</span>
            </button>
          )
        })}
        <button onClick={() => setSheet(true)}
          aria-label="Ver todos los módulos"
          className={`flex min-h-[54px] flex-1 flex-col items-center justify-center gap-1 px-1 py-1.5 ${
            sheet || !inQuick ? 'text-amazonia-700 dark:text-amazonia-300' : 'text-slate-500 dark:text-gray-400'
          }`}>
          <MoreHorizontal size={19} strokeWidth={sheet || !inQuick ? 2.4 : 2} />
          <span className={`text-[10px] leading-none ${sheet || !inQuick ? 'font-semibold' : ''}`}>Más</span>
        </button>
      </nav>
    </>
  )
}
