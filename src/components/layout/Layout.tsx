import { Outlet, useLocation } from 'react-router-dom'
import Topbar from './Topbar'
import GlobalSearch from './GlobalSearch'
import { PageSkeleton } from '../Skeletons'
import { useStore } from '../../store/useStore'
import { usePushNotifications } from '../../hooks/usePushNotifications'
import { useSessionTimeout }    from '../../hooks/useSessionTimeout'
import InstallPWA from '../InstallPWA'

const titles: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/inventory':  'Inventario',
  '/inventory/movements': 'Movimientos de Inventario',
  '/production': 'Producción',
  '/sales':      'Ventas',
  '/crm':        'Clientes — CRM',
  '/reports':    'Reportes y Analítica',
  '/catalog':    'Catálogo de Productos',
  '/settings':   'Configuración',
  '/returns':    'Devoluciones',
  '/suppliers':  'Proveedores',
  '/payments':   'Pagos — Tesorería',
  '/cartera':    'Cartera — Cuentas por Cobrar',
  '/quotations': 'Cotizaciones',
  '/purchases':  'Órdenes de Compra',
  '/dispatch':   'Despachos',
  '/expenses':   'Gastos',
  '/pipeline':   'Pipeline de Ventas',
  '/calendar':   'Calendario',
}

export default function Layout() {
  const { dataLoaded, customers } = useStore()
  const { pathname } = useLocation()
  usePushNotifications()
  useSessionTimeout()

  // Resolve title for dynamic routes
  const resolveTitle = () => {
    if (titles[pathname]) return titles[pathname]
    const crmMatch = pathname.match(/^\/crm\/(.+)$/)
    if (crmMatch) {
      const customer = customers.find(c => c.id === crmMatch[1])
      return customer ? `${customer.name} — Cliente` : 'Detalle de Cliente'
    }
    return ''
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex flex-col">
      <Topbar title={resolveTitle()} />
      <main className="flex-1 px-5 py-4 overflow-auto max-w-[1500px] w-full mx-auto">
        {!dataLoaded && pathname !== '/settings' ? (
          <PageSkeleton />
        ) : (
          <div className="animate-fadeIn">
            <Outlet />
          </div>
        )}
      </main>
      <GlobalSearch />
      <InstallPWA />
    </div>
  )
}
