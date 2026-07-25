// ─────────────────────────────────────────────────────────────────────────────
// Persistent module navigation — the deep-green header from design direction B.
//
// Replaces "go back to the home tiles to switch module": every screen now
// carries a module switcher, so any module is two clicks away from anywhere.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, Search, Home, Check } from 'lucide-react'
import { useStore } from '../../store/useStore'
import { MODULE_GROUPS, modulesForRole, moduleForPath } from '../../config/modules'

export default function ModuleNav() {
  const { user } = useStore()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const allowed = modulesForRole(user?.role)
  const current = moduleForPath(pathname)

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Close the panel whenever navigation happens
  useEffect(() => { setOpen(false) }, [pathname])

  const go = (to: string) => { navigate(to); setOpen(false) }

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-white/12 hover:bg-white/20 px-3 py-1.5
                   text-sm font-medium text-white transition-colors focus-visible:outline
                   focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/70">
        {current?.icon && <current.icon size={15} className="opacity-90" />}
        <span className="max-w-[10rem] truncate">{current?.label ?? 'Módulos'}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-50 mt-2 w-[min(92vw,34rem)] overflow-hidden rounded-2xl
                     border border-slate-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-gray-700">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">
              Ir a un módulo
            </span>
            <button
              onClick={() => go('/')}
              className="flex items-center gap-1.5 text-xs font-medium text-amazonia-700 hover:underline dark:text-amazonia-300">
              <Home size={13} /> Inicio
            </button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-3">
            {MODULE_GROUPS.map((group) => {
              const items = allowed.filter((m) => m.group === group)
              if (items.length === 0) return null
              return (
                <div key={group} className="mb-3 last:mb-0">
                  <p className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-gray-500">
                    {group}
                  </p>
                  <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                    {items.map((m) => {
                      const active = current?.to === m.to
                      return (
                        <button
                          key={m.to}
                          role="menuitem"
                          onClick={() => go(m.to)}
                          className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                            active
                              ? 'bg-amazonia-50 font-semibold text-amazonia-800 dark:bg-amazonia-900/40 dark:text-amazonia-200'
                              : 'text-slate-700 hover:bg-slate-100 dark:text-gray-300 dark:hover:bg-gray-700'
                          }`}>
                          <m.icon size={15} className="flex-shrink-0 opacity-80" />
                          <span className="truncate">{m.label}</span>
                          {active && <Check size={13} className="ml-auto flex-shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => {
              setOpen(false)
              window.dispatchEvent(new CustomEvent('open-global-search'))
            }}
            className="flex w-full items-center gap-2 border-t border-slate-100 px-4 py-2.5 text-left
                       text-xs text-slate-500 hover:bg-slate-50 dark:border-gray-700 dark:text-gray-400
                       dark:hover:bg-gray-700/60">
            <Search size={13} />
            Buscar cliente, orden o producto
            <kbd className="ml-auto rounded border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] dark:border-gray-600">⌘K</kbd>
          </button>
        </div>
      )}
    </div>
  )
}

/** Breadcrumb-ish label shown next to the switcher on wide screens. */
export function ModuleTitle({ title }: { title?: string }) {
  if (!title) return null
  return (
    <>
      <span className="hidden text-white/35 lg:inline">/</span>
      <span className="hidden truncate text-sm font-medium text-white/85 lg:inline">{title}</span>
    </>
  )
}

export { Link }
