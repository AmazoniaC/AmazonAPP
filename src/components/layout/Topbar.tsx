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
    <header className="h-16 glass border-b border-slate-200/40 dark:border-gray-700/40 flex items-center justify-between px-5 sticky top-0 z-30">
      {/* Brand / breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          to="/"
          className="flex items-center gap-2.5 group flex-shrink-0"
          title="Volver al inicio"
        >
          {logo ? (
            <img src={logo} alt="" className="h-10 w-10 object-contain rounded-xl group-hover:scale-105 transition-transform" />
          ) : (
            <div className="w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform"
                 style={{
                   background: 'linear-gradient(135deg, #527d36 0%, #2d4a1e 100%)',
                   boxShadow: '0 4px 12px -2px rgba(82, 125, 54, 0.4)',
                 }}>
              <Leaf size={16} className="text-white" />
            </div>
          )}
          <div className="hidden sm:block min-w-0">
            <p className="text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate group-hover:text-amazonia-700 dark:group-hover:text-amazonia-300 transition-colors leading-tight">
              {companySettings.companyName || 'Amazonia Concrete'}
            </p>
            <p className="text-[10px] text-amazonia-700 dark:text-amazonia-400 font-medium tracking-wider uppercase leading-tight">
              Sistema ERP
            </p>
          </div>
        </Link>

        {title && (
          <>
            <ChevronRight size={14} className="text-slate-400 dark:text-gray-500 flex-shrink-0 hidden md:block" />
            <Link
              to="/"
              className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 dark:text-gray-400 hover:text-amazonia-700 dark:hover:text-amazonia-400 transition-colors flex-shrink-0"
              title="Inicio"
            >
              <Home size={12} /> Inicio
            </Link>
            <ChevronRight size={14} className="text-slate-400 dark:text-gray-500 flex-shrink-0 hidden md:block" />
            <h2 className="font-bold text-slate-800 dark:text-gray-100 tracking-tight text-sm md:text-base truncate">
              {title}
            </h2>
          </>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="hidden md:flex items-center gap-2 pl-9 pr-3 py-2 text-sm bg-white/60 dark:bg-gray-700/60 dark:text-gray-400 border border-slate-200/70 dark:border-gray-600/70 rounded-xl w-52 text-slate-400 hover:border-amazonia-400 dark:hover:border-amazonia-500 hover:shadow-soft transition-all duration-200 relative cursor-pointer"
        >
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-gray-600 text-[10px] font-mono border border-slate-300/60 dark:border-gray-500 text-slate-500 dark:text-gray-300">⌘K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="w-9 h-9 rounded-xl bg-white/60 dark:bg-gray-700/60 border border-slate-200/70 dark:border-gray-600/70 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200"
          title={darkMode ? 'Modo claro' : 'Modo oscuro'}
        >
          {darkMode
            ? <Sun  size={15} className="text-amber-400" />
            : <Moon size={15} className="text-slate-600" />
          }
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowUser(false) }}
            className="relative w-9 h-9 rounded-xl bg-white/60 dark:bg-gray-700/60 border border-slate-200/70 dark:border-gray-600/70 flex items-center justify-center hover:bg-white dark:hover:bg-gray-600 hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200"
          >
            <Bell size={15} className="text-slate-600 dark:text-slate-300" />
            {unread > 0 && (
              <>
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold ring-2 ring-white dark:ring-gray-800 z-10">
                  {unread > 9 ? '9+' : unread}
                </span>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500/60 rounded-full animate-ping" />
              </>
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

        {/* Date */}
        <div className="hidden md:block text-right ml-1">
          <p className="text-xs text-slate-500 dark:text-gray-400">
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* User avatar + dropdown */}
        {user && (
          <div className="relative ml-1.5">
            <button onClick={() => { setShowUser(!showUser); setShowNotif(false) }}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 rounded-xl hover:bg-white dark:hover:bg-gray-700 hover:shadow-soft transition-all duration-200 border border-transparent hover:border-slate-200/60 dark:hover:border-gray-600/60">
              <div className="relative">
                <UserAvatar name={user.name} size={30} />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white dark:ring-gray-800" />
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-bold text-slate-800 dark:text-gray-200 leading-tight">{user.name.split(' ')[0]}</p>
                <p className="text-[10px] text-amazonia-600 dark:text-amazonia-400 leading-tight font-medium">{user.role}</p>
              </div>
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
