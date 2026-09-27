// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for the app's modules.
//
// The module switcher in the header, the mobile tab bar and the Welcome grid all
// read from here, so a module added once shows up everywhere with the same label,
// icon and role restriction.
// ─────────────────────────────────────────────────────────────────────────────
import {
  LayoutDashboard, CalendarDays, Package, ArrowLeftRight, Factory,
  ShoppingCart, FileText, Truck, Navigation, Users, Kanban, RotateCcw,
  Building2, Banknote, Wallet, Receipt, BookOpen, BarChart3, Settings,
} from 'lucide-react'

export type ModuleGroup = 'Operación' | 'Comercial' | 'Finanzas' | 'Sistema'

export interface AppModule {
  to: string
  icon: React.ElementType
  label: string
  group: ModuleGroup
  /** When set, only these roles see the module. Undefined = everyone. */
  roles?: string[]
}

export const MODULES: AppModule[] = [
  { to: '/dashboard',           icon: LayoutDashboard, label: 'Dashboard',    group: 'Operación' },
  { to: '/calendar',            icon: CalendarDays,    label: 'Calendario',   group: 'Operación' },
  { to: '/inventory',           icon: Package,         label: 'Inventario',   group: 'Operación', roles: ['Administrador','Inventario','Producción'] },
  { to: '/inventory/movements', icon: ArrowLeftRight,  label: 'Movimientos',  group: 'Operación', roles: ['Administrador','Inventario'] },
  { to: '/production',          icon: Factory,         label: 'Producción',   group: 'Operación', roles: ['Administrador','Producción'] },
  { to: '/dispatch',            icon: Navigation,      label: 'Despachos',    group: 'Operación', roles: ['Administrador','Ventas','Producción'] },

  { to: '/sales',               icon: ShoppingCart,    label: 'Ventas',       group: 'Comercial', roles: ['Administrador','Ventas','Contabilidad'] },
  { to: '/quotations',          icon: FileText,        label: 'Cotizaciones', group: 'Comercial', roles: ['Administrador','Ventas'] },
  { to: '/crm',                 icon: Users,           label: 'Clientes',     group: 'Comercial', roles: ['Administrador','Ventas'] },
  { to: '/pipeline',            icon: Kanban,          label: 'Pipeline',     group: 'Comercial', roles: ['Administrador','Ventas'] },
  { to: '/catalog',             icon: BookOpen,        label: 'Catálogo',     group: 'Comercial', roles: ['Administrador','Ventas','Inventario'] },
  { to: '/returns',             icon: RotateCcw,       label: 'Devoluciones', group: 'Comercial', roles: ['Administrador','Ventas'] },

  { to: '/cartera',             icon: Wallet,          label: 'Cartera',      group: 'Finanzas',  roles: ['Administrador','Contabilidad','Ventas'] },
  { to: '/payments',            icon: Banknote,        label: 'Pagos',        group: 'Finanzas',  roles: ['Administrador','Contabilidad','Ventas'] },
  { to: '/purchases',           icon: Truck,           label: 'Compras',      group: 'Finanzas',  roles: ['Administrador','Inventario','Contabilidad'] },
  { to: '/suppliers',           icon: Building2,       label: 'Proveedores',  group: 'Finanzas',  roles: ['Administrador','Inventario','Contabilidad'] },
  { to: '/expenses',            icon: Receipt,         label: 'Gastos',       group: 'Finanzas',  roles: ['Administrador','Contabilidad'] },
  { to: '/reports',             icon: BarChart3,       label: 'Reportes',     group: 'Finanzas',  roles: ['Administrador','Contabilidad'] },

  { to: '/settings',            icon: Settings,        label: 'Configuración', group: 'Sistema',  roles: ['Administrador'] },
]

export const MODULE_GROUPS: ModuleGroup[] = ['Operación', 'Comercial', 'Finanzas', 'Sistema']

/** Modules the given role may open. */
export function modulesForRole(role?: string | null): AppModule[] {
  return MODULES.filter((m) => !m.roles || (role != null && m.roles.includes(role)))
}

/**
 * Bottom-bar shortcuts on phones. Kept to four so the fifth slot can always be
 * the "Más" sheet that reveals everything else.
 */
const QUICK_PATHS = ['/dashboard', '/sales', '/inventory', '/crm']

export function quickModules(role?: string | null): AppModule[] {
  const allowed = modulesForRole(role)
  const quick = QUICK_PATHS
    .map((p) => allowed.find((m) => m.to === p))
    .filter((m): m is AppModule => Boolean(m))
  // A role without the default four (e.g. Producción) still gets a usable bar.
  if (quick.length < 4) {
    for (const m of allowed) {
      if (quick.length >= 4) break
      if (!quick.includes(m)) quick.push(m)
    }
  }
  return quick.slice(0, 4)
}

/** The module that owns a given pathname, longest match first. */
export function moduleForPath(pathname: string): AppModule | undefined {
  return [...MODULES]
    .sort((a, b) => b.to.length - a.to.length)
    .find((m) => pathname === m.to || pathname.startsWith(m.to + '/'))
}
