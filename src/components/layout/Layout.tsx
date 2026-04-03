import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import GlobalSearch from './GlobalSearch'
import Breadcrumbs from '../Breadcrumbs'
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
  const { sidebarOpen, dataLoaded } = useStore()
  const { pathname } = useLocation()
  usePushNotifications()
  useSessionTimeout()

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex">
      <Sidebar />
      <div
        className="flex-1 flex flex-col min-h-screen transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '240px' : '64px' }}
      >
        <Topbar title={titles[pathname]} />
        <main className="flex-1 p-6 overflow-auto">
          <Breadcrumbs />
          {!dataLoaded && pathname !== '/settings' ? (
            <PageSkeleton />
          ) : (
            <div className="animate-fadeIn">
              <Outlet />
            </div>
          )}
        </main>
      </div>
      <GlobalSearch />
      <InstallPWA />
    </div>
  )
}
