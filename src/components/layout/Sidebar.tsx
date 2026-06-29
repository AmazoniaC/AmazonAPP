import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Package, Factory, ShoppingCart,
  Users, BarChart3, BookOpen, Settings, ChevronLeft, ChevronRight,
  Leaf, LogOut, FileText, Truck, Navigation, Receipt, Kanban, CalendarDays,
  RotateCcw, Building2, Wallet, Banknote, ArrowLeftRight,
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useMemo } from 'react'

const nav = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard',      category: null,         roles: null },
  { to: '/calendar',   icon: CalendarDays,    label: 'Calendario',     category: null,         roles: null },
  { to: '/inventory',  icon: Package,         label: 'Inventario',     category: 'inventory',  roles: ['Administrador','Inventario','Producción'] },
  { to: '/inventory/movements', icon: ArrowLeftRight, label: 'Movimientos', category: 'inventory', roles: ['Administrador','Inventario'] },
  { to: '/production', icon: Factory,         label: 'Producción',     category: 'production', roles: ['Administrador','Producción'] },
  { to: '/sales',      icon: ShoppingCart,    label: 'Ventas',         category: 'sales',      roles: ['Administrador','Ventas','Contabilidad'] },
  { to: '/quotations', icon: FileText,        label: 'Cotizaciones',   category: 'sales',      roles: ['Administrador','Ventas'] },
  { to: '/purchases',  icon: Truck,           label: 'Compras',        category: 'purchases',  roles: ['Administrador','Inventario','Contabilidad'] },
  { to: '/dispatch',   icon: Navigation,      label: 'Despachos',      category: 'dispatch',   roles: ['Administrador','Ventas','Producción'] },
  { to: '/crm',        icon: Users,           label: 'Clientes',       category: 'crm',        roles: ['Administrador','Ventas'] },
  { to: '/pipeline',   icon: Kanban,          label: 'Pipeline',       category: 'crm',        roles: ['Administrador','Ventas'] },
  { to: '/returns',    icon: RotateCcw,        label: 'Devoluciones',   category: null,         roles: ['Administrador','Ventas'] },
  { to: '/suppliers',  icon: Building2,        label: 'Proveedores',    category: null,         roles: ['Administrador','Inventario','Contabilidad'] },
  { to: '/payments',   icon: Banknote,         label: 'Pagos',          category: null,         roles: ['Administrador','Contabilidad','Ventas'] },
  { to: '/cartera',    icon: Wallet,           label: 'Cartera',        category: null,         roles: ['Administrador','Contabilidad','Ventas'] },
  { to: '/expenses',   icon: Receipt,         label: 'Gastos',         category: null,         roles: ['Administrador','Contabilidad'] },
  { to: '/catalog',    icon: BookOpen,        label: 'Catálogo',       category: null,         roles: ['Administrador','Ventas','Inventario'] },
  { to: '/reports',    icon: BarChart3,       label: 'Reportes',       category: null,         roles: ['Administrador','Contabilidad'] },
  { to: '/settings',   icon: Settings,        label: 'Configuración',  category: null,         roles: ['Administrador'] },
] as const

export default function Sidebar() {
  const { sidebarOpen, setSidebarOpen, user, logout, companySettings, notifications } = useStore()
  const navigate = useNavigate()

  // Count unread notifications per category (only unread)
  const badgeCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const n of notifications) {
      if (!n.read) map[n.category] = (map[n.category] ?? 0) + 1
    }
    return map
  }, [notifications])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AD'

  const logo = companySettings.logo

  return (
    <aside
      className={`fixed left-0 top-0 h-screen flex flex-col z-40 ${
        sidebarOpen ? 'w-60' : 'w-16'
      }`}
      style={{
        background: 'linear-gradient(180deg, #1e3315 0%, #12200d 50%, #0a1408 100%)',
        transition: 'width 320ms cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '4px 0 24px -8px rgba(0, 0, 0, 0.25)',
      }}
    >
      {/* Decorative glow */}
      <div className="absolute inset-0 opacity-60 pointer-events-none overflow-hidden">
        <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(82, 125, 54, 0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 -right-20 w-60 h-60 rounded-full"
             style={{ background: 'radial-gradient(circle, rgba(151, 190, 130, 0.08) 0%, transparent 70%)' }} />
      </div>

      {/* Logo */}
      <div className="relative flex items-center justify-between px-3 h-16 border-b border-white/[0.08]">
        {sidebarOpen && (
          <div className="flex items-center gap-2.5 animate-slideIn overflow-hidden">
            {logo ? (
              <div className="relative flex-shrink-0">
                <img src={logo} alt={companySettings.companyName} className="h-9 w-9 object-contain rounded-lg ring-2 ring-white/10" />
              </div>
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{
                     background: 'linear-gradient(135deg, #527d36 0%, #3d6227 100%)',
                     boxShadow: '0 4px 12px -2px rgba(82, 125, 54, 0.5)',
                   }}>
                <Leaf size={18} className="text-white" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate tracking-tight">
                {companySettings.companyName || 'Amazonia ERP'}
              </p>
              <p className="text-amazonia-300/70 text-[10px] font-medium tracking-wider uppercase">Sistema ERP</p>
            </div>
          </div>
        )}
        {!sidebarOpen && (
          logo ? (
            <img src={logo} alt={companySettings.companyName} className="h-8 w-8 object-contain rounded-lg ring-2 ring-white/10 mx-auto" />
          ) : (
            <div className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto"
                 style={{
                   background: 'linear-gradient(135deg, #527d36 0%, #3d6227 100%)',
                   boxShadow: '0 4px 12px -2px rgba(82, 125, 54, 0.5)',
                 }}>
              <Leaf size={16} className="text-white" />
            </div>
          )
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-amazonia-300/70 hover:text-white hover:bg-white/5 rounded-lg p-1 transition-all ml-auto"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="relative flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {nav.filter(item => !item.roles || (item.roles as readonly string[]).includes(user?.role ?? 'Administrador')).map(({ to, icon: Icon, label, category }) => {
          const badgeCount = category ? (badgeCounts[category] ?? 0) : 0
          return (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-link ${isActive ? 'active' : 'text-amazonia-200/80 hover:text-white'}`
              }
              title={!sidebarOpen ? label : undefined}
            >
              <div className="relative flex-shrink-0">
                <Icon size={17} strokeWidth={2.2} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-1 bg-red-500 text-white text-[8px] rounded-full flex items-center justify-center font-bold leading-none ring-2 ring-amazonia-900">
                    {badgeCount > 9 ? '9+' : badgeCount}
                  </span>
                )}
              </div>
              {sidebarOpen && (
                <span className="animate-slideIn flex-1 flex items-center justify-between text-[13px]">
                  <span className="truncate">{label}</span>
                  {badgeCount > 0 && (
                    <span className="ml-auto px-1.5 py-0.5 bg-red-500/90 text-white text-[9px] font-bold rounded-full leading-none">
                      {badgeCount}
                    </span>
                  )}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      {/* User + Logout */}
      <div className={`relative px-3 py-3 border-t border-white/[0.08] ${sidebarOpen ? '' : 'flex flex-col items-center gap-2'}`}>
        <div className={`flex items-center gap-3 rounded-xl p-2 ${sidebarOpen ? 'bg-white/[0.04] hover:bg-white/[0.08] transition-colors' : 'justify-center'}`}>
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center ring-2 ring-white/10"
                 style={{
                   background: 'linear-gradient(135deg, #6ea050 0%, #3d6227 100%)',
                   boxShadow: '0 2px 8px -2px rgba(82, 125, 54, 0.5)',
                 }}>
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-amazonia-900" />
          </div>
          {sidebarOpen && (
            <div className="animate-slideIn min-w-0 flex-1">
              <p className="text-white text-[13px] font-semibold truncate leading-tight">{user?.name ?? 'Administrador'}</p>
              <p className="text-amazonia-300/70 text-[10px] truncate">{user?.role ?? user?.email ?? ''}</p>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={handleLogout}
              className="text-amazonia-300/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg p-1.5 transition-all flex-shrink-0"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
        {!sidebarOpen && (
          <button
            onClick={handleLogout}
            className="text-amazonia-300/70 hover:text-red-400 hover:bg-red-500/10 rounded-lg p-1.5 transition-all"
            title="Cerrar sesión"
          >
            <LogOut size={15} />
          </button>
        )}
      </div>
    </aside>
  )
}
