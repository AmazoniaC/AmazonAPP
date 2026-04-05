import {
  Bell, Search, AlertTriangle, Info, CheckCircle, XCircle,
  Sun, Moon, Check, Trash2, LogOut, Package, Truck, ShoppingCart, Users, Factory, Navigation,
} from 'lucide-react'
import { useStore, NotifCategory } from '../../store/useStore'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const { notifications, markAsRead, markAllAsRead, clearNotifications, darkMode, toggleDarkMode, user, logout } = useStore()
  const [showNotif, setShowNotif] = useState(false)
  const [showUser,  setShowUser]  = useState(false)
  const [activeCategory, setActiveCategory] = useState<NotifCategory | 'all'>('all')
  const navigate = useNavigate()

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

  return (
    <header className="h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-slate-200/60 dark:border-gray-700/60 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Search */}
      <div className="flex items-center gap-4">
        {title && <h2 className="font-semibold text-slate-800 dark:text-gray-100 hidden sm:block tracking-tight">{title}</h2>}
        <button
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          className="hidden sm:flex items-center gap-2 pl-9 pr-3 py-2 text-sm bg-slate-50/80 dark:bg-gray-700/80 dark:text-gray-400 border border-slate-200 dark:border-gray-600 rounded-xl w-64 text-slate-400 hover:border-amazonia-400 dark:hover:border-amazonia-600 hover:shadow-sm transition-all duration-200 relative cursor-pointer"
        >
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <span className="flex-1 text-left">Buscar...</span>
          <kbd className="px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-gray-600 text-[10px] font-mono border border-slate-300/60 dark:border-gray-500">⌘K</kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors"
          title={darkMode ? 'Modo claro' : 'Modo oscuro'}
        >
          {darkMode
            ? <Sun  size={16} className="text-amber-400" />
            : <Moon size={16} className="text-slate-600" />
          }
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => { setShowNotif(!showNotif); setShowUser(false) }}
            className="relative w-9 h-9 rounded-lg bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors"
          >
            <Bell size={16} className="text-slate-600 dark:text-slate-300" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-2xl z-50 animate-fadeIn flex flex-col max-h-[80vh]">
              {/* Header */}
              <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <p className="font-semibold text-sm text-slate-800 dark:text-gray-100">
                  Alertas del sistema
                  {unread > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs rounded-full font-bold">
                      {unread} nueva{unread > 1 ? 's' : ''}
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
          <div className="relative ml-2">
            <button onClick={() => { setShowUser(!showUser); setShowNotif(false) }}
              className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
              <UserAvatar name={user.name} size={32} />
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-800 dark:text-gray-200 leading-tight">{user.name.split(' ')[0]}</p>
                <p className="text-xs text-slate-400 dark:text-gray-500 leading-tight">{user.role}</p>
              </div>
            </button>

            {showUser && (
              <div className="absolute right-0 top-12 w-52 bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 shadow-xl z-50 animate-fadeIn overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-700 flex items-center gap-3">
                  <UserAvatar name={user.name} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-gray-100 truncate">{user.name}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-500 truncate">{user.email}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">{user.role}</p>
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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
