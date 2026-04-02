import { NavLink, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { useStore } from '../store/useStore'

const ROUTE_LABELS: Record<string, string> = {
  '/dashboard':   'Dashboard',
  '/calendar':    'Calendario',
  '/inventory':   'Inventario',
  '/production':  'Producción',
  '/sales':       'Ventas',
  '/crm':         'Clientes — CRM',
  '/reports':     'Reportes',
  '/catalog':     'Catálogo',
  '/settings':    'Configuración',
  '/quotations':  'Cotizaciones',
  '/purchases':   'Compras',
  '/dispatch':    'Despachos',
  '/expenses':    'Gastos',
  '/pipeline':    'Pipeline',
  '/returns':     'Devoluciones',
  '/suppliers':   'Proveedores',
  '/payments':    'Pagos',
  '/cartera':     'Cartera',
}

export default function Breadcrumbs() {
  const { pathname } = useLocation()
  const { customers } = useStore()

  if (pathname === '/dashboard') return null

  // Handle /crm/:id detail pages
  const crmDetailMatch = pathname.match(/^\/crm\/(.+)$/)
  if (crmDetailMatch) {
    const customer = customers.find(c => c.id === crmDetailMatch[1])
    return (
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-500 mb-4">
        <NavLink to="/dashboard" className="flex items-center gap-1 hover:text-amazonia-600 dark:hover:text-amazonia-400 transition-colors">
          <Home size={12} />
          <span>Inicio</span>
        </NavLink>
        <ChevronRight size={12} className="flex-shrink-0" />
        <NavLink to="/crm" className="hover:text-amazonia-600 dark:hover:text-amazonia-400 transition-colors">
          Clientes
        </NavLink>
        <ChevronRight size={12} className="flex-shrink-0" />
        <span className="text-slate-600 dark:text-gray-300 font-medium">{customer?.name || 'Detalle'}</span>
      </nav>
    )
  }

  const label = ROUTE_LABELS[pathname]
  if (!label) return null

  return (
    <nav className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-gray-500 mb-4">
      <NavLink to="/dashboard" className="flex items-center gap-1 hover:text-amazonia-600 dark:hover:text-amazonia-400 transition-colors">
        <Home size={12} />
        <span>Inicio</span>
      </NavLink>
      <ChevronRight size={12} className="flex-shrink-0" />
      <span className="text-slate-600 dark:text-gray-300 font-medium">{label}</span>
    </nav>
  )
}
