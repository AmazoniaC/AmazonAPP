import {
  Bell, Search, AlertTriangle, Info, CheckCircle, XCircle,
  Sun, Moon, Check, Trash2, LogOut, Package, Truck, ShoppingCart, Users, Factory, Navigation,
  Home, Leaf, ChevronRight,
} from 'lucide-react'
import { useStore, NotifCategory } from '../../store/useStore'
import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import ModuleNav, { ModuleTitle } from './ModuleNav'

// ── UserAvatar ─────────────────────────────────────────────────────────────

function UserAvatar({ name, size = 32, className = '' }: { name: string; size?: number; className?: string }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
  const colors   = ['bg-emerald-500','bg-blue-500','bg-violet-500','bg-rose-500','bg-amber-500','bg-teal-500','bg-pink-500','bg-indigo-500']
  const color    = colors[name.charCodeAt(0) % colors.length]
  return (
    <div
      className={`${color} ${className} rounded-full flex items-center justify-center text-white font-bold select-none`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      title={name}
    >
      {initials}
    </div>
  )
}

export { UserAvatar }

// ── Icon maps ──────────────────────────────────────────────────────────────

const typeIcon = {
  warning: <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />,
  info:    <Info          size={14} className="text-blue-500 flex-shrink-0 mt-0.5" />,
  success: <CheckCircle  size={14} className="text-emerald-500 flex-shrink-0 mt-0.5" />,
  error:   <XCircle      size={14} className="text-red-500 flex-shrink-0 mt-0.5" />,
}

const CATEGORY_META: Record<NotifCategory, { label: string; icon: React.ElementType; color: string }> = {
  inventory:  { label: 'Inventario',  icon: Package,      color: 'text-blue-600 dark:text-blue-400' },
  purchases:  { label: 'Compras',     icon: Truck,        color: 'text-violet-600 dark:text-violet-400' },
  sales:      { label: 'Ventas',      icon: ShoppingCart, color: 'text-emerald-600 dark:text-emerald-400' },
  crm:        { label: 'CRM',         icon: Users,        color: 'text-rose-600 dark:text-rose-400' },
  production: { label: 'Producción',  icon: Factory,      color: 'text-amber-600 dark:text-amber-400' },
  dispatch:   { label: 'Despachos',  icon: Navigation,   color: 'text-blue-600 dark:text-blue-400' },
  general:    { label: 'General',     icon: Info,         color: 'text-slate-600 dark:text-slate-400' },
}

// ── Topbar ─────────────────────────────────────────────────────────────────

export default function Topbar({ title }: { title?: string }) {
  const { notifications, markAsRead, markAllAsRead, clearNotifications, darkMode, toggleDarkMode, user, logout, companySettings } = useStore()
  const [showNotif, setShowNotif] = useState(false)
  const [showUser,  setShowUser]  = useState(false)
  const [activeCategory, setActiveCategory] = useState<NotifCategory | 'all'>('all')
  const [, setTick] = useState(0)
  const navigate = useNavigate()

  // Refresh relative timestamps every 30s so "hace 2 min" stays accurate
  useEffect(() => {
    if (!showNotif) return
    const id = window.setInterval(() => setTick((t) => t + 1), 30_000)
    return () => window.clearInterval(id)
  }, [showNotif])

  const unread = notifications.filter((n) => !n.read).length

  // Available categories that have at least one notification
  const usedCategories = [...new Set(notifications.map((n) => n.category))]

  const filtered = activeCategory === 'all'
    ? notifications
    : notifications.filter((n) => n.category === activeCategory)

  const handleClickNotif = (id: string, link?: string) => {
    markAsRead(id)
    if (link) {
      setShowNotif(false)
      navigate(link)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const logo = companySettings.logo

  return (
    <header className="app-header sticky top-0 z-30 flex h-14 items-center gap-3 px-3 sm:px-5">
      {/* Brand + module switcher */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Link to="/" className="flex flex-shrink-0 items-center gap-2.5" title="Volver al inicio">
          {logo ? (
            <img src={logo} alt="" className="h-8 w-8 rounded-lg object-contain" />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15">
              <Leaf size={16} className="text-white" />
            </div>
          )}
          <span className="hidden truncate text-sm font-bold tracking-tight text-white sm:block">
            {companySettings.companyName || 'Amazonia Concrete'}
          </span>
        </Link>

        <ModuleNav />
        <ModuleTitle title={title} />
      </div>

      {/* Search — full control on desktop, icon on phones */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
        className="hidden items-center gap-2 rounded-full bg-white/12 px-3.5 py-1.5 text-sm text-white/70
                   transition-colors hover:bg-white/20 md:flex md:w-56 lg:w-72"
      >
        <Search size={14} className="flex-shrink-0" />
        <span className="flex-1 text-left">Buscar cliente, orden…</span>
        <kbd className="rounded border border-white/25 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('open-global-search'))}
        aria-label="Buscar"
        className="flex h-9 w-9 items-center justify-center rounded-full text-white/85 hover:bg-white/15 md:hidden"
      >
        <Search size={17} />
      </button>

      <div className="flex flex-shrink-0 items-center gap-1">
        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15"
          title={darkMode ? 'Modo claro' : 'Modo oscuro'}
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowUser(false) }}
            aria-label="Notificaciones"
            className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/15"
          >
            <Bell size={16} />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 z-10 flex h-4 min-w-[16px] items-center justify-center
                               rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-amazonia-800">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-96 glass-strong rounded-2xl border border-slate-200/60 dark:border-gray-700/60 z-50 animate-scaleIn flex flex-col max-h-[80vh] origin-top-right"
                 style={{ boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 8px 16px -8px rgba(15, 23, 42, 0.10)' }}>
              {/* Header */}
              <div className="px-4 py-3.5 border-b border-slate-100/80 dark:border-gray-700/60 flex items-center justify-between flex-shrink-0">
                <p className="font-bold text-sm text-slate-800 dark:text-gray-100 tracking-tight">
                  Notificaciones
                  {unread > 0 && (
                    <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-[10px] rounded-full font-bold ring-2 ring-red-100 dark:ring-red-900/40">
                      {unread}
                    </span>
                  )}
                </p>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button onClick={markAllAsRead}
                      className="text-xs text-amazonia-600 dark:text-amazonia-400 hover:underline flex items-center gap-1">
                      <Check size={12} /> Todas leídas
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button onClick={() => { clearNotifications(); setActiveCategory('all') }}
                      className="text-xs text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                      title="Limpiar todo">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Category tabs */}
              {usedCategories.length > 1 && (
                <div className="flex gap-1 px-3 pt-2 pb-1 overflow-x-auto flex-shrink-0">
                  {(['all', ...usedCategories] as (NotifCategory | 'all')[]).map((cat) => {
                    const count = cat === 'all'
                      ? notifications.filter((n) => !n.read).length
                      : notifications.filter((n) => n.category === cat && !n.read).length
                    return (
                      <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                          activeCategory === cat
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600'
                        }`}>
                        {cat === 'all' ? 'Todas' : CATEGORY_META[cat as NotifCategory].label}
                        {count > 0 && (
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full ${
                            activeCategory === cat ? 'bg-white/30' : 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                          }`}>{count}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* List */}
              <div className="divide-y divide-slate-50 dark:divide-gray-700 overflow-y-auto flex-1">
                {filtered.length === 0 ? (
                  <div className="text-center py-10">
                    <CheckCircle size={28} className="mx-auto mb-2 text-emerald-400 opacity-50" />
                    <p className="text-xs text-slate-400 dark:text-gray-500">
                      {activeCategory === 'all' ? 'Sin alertas — todo en orden' : 'Sin alertas en esta categoría'}
                    </p>
                  </div>
                ) : (
                  filtered.map((n) => {
                    const catMeta = CATEGORY_META[n.category]
                    const CatIcon = catMeta.icon
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleClickNotif(n.id, n.link)}
                        className={`flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/60 transition-colors ${
                          n.read ? 'opacity-50' : ''
                        } ${n.link ? 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10' : ''}`}
                      >
                        <div className="flex-shrink-0 mt-0.5">{typeIcon[n.type]}</div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <CatIcon size={10} className={catMeta.color} />
                            <span className={`text-[10px] font-semibold uppercase tracking-wider ${catMeta.color}`}>
                              {catMeta.label}
                            </span>
                          </div>
                          <p className={`text-xs leading-snug ${n.read ? 'text-slate-500 dark:text-gray-400' : 'text-slate-700 dark:text-gray-200'}`}>
                            {n.message}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">
                            {formatDistanceToNow(n.timestamp, { addSuffix: true, locale: es })}
                            {n.link && <span className="ml-2 text-blue-500 dark:text-blue-400">→ Ver</span>}
                          </p>
                        </div>
                        {!n.read && (
                          <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1 animate-pulse" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <div className="px-4 py-2 border-t border-slate-100 dark:border-gray-700 flex-shrink-0">
                <button className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  onClick={() => setShowNotif(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User avatar + dropdown */}
        {user && (
          <div className="relative ml-0.5">
            <button onClick={() => { setShowUser(!showUser); setShowNotif(false) }}
              aria-label={`Cuenta de ${user.name}`}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1 transition-colors hover:bg-white/15 sm:pr-2.5">
              <UserAvatar name={user.name} size={30} />
              <span className="hidden text-left text-xs font-semibold leading-tight text-white sm:block">
                {user.name.split(' ')[0]}
              </span>
            </button>

            {showUser && (
              <div className="absolute right-0 top-12 w-60 glass-strong rounded-2xl border border-slate-200/60 dark:border-gray-700/60 z-50 animate-scaleIn overflow-hidden origin-top-right"
                   style={{ boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25), 0 8px 16px -8px rgba(15, 23, 42, 0.10)' }}>
                <div className="px-4 py-3 border-b border-slate-100/80 dark:border-gray-700/60 flex items-center gap-3"
                     style={{ background: 'linear-gradient(135deg, rgba(82, 125, 54, 0.05) 0%, transparent 100%)' }}>
                  <div className="relative">
                    <UserAvatar name={user.name} size={40} />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-white dark:ring-gray-800" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-gray-100 truncate tracking-tight">{user.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">{user.email}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-amazonia-100 dark:bg-amazonia-900/40 text-amazonia-700 dark:text-amazonia-300 text-[10px] font-bold rounded-full ring-1 ring-inset ring-amazonia-600/20">
                      {user.role}
                    </span>
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors font-medium">
                  <LogOut size={15} /> Cerrar sesión
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
