import { useEffect, lazy, Suspense, Component, type ReactNode } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import { useStore } from './store/useStore'

// Lazy-loaded pages — each chunk loads only when the route is visited
const Dashboard         = lazy(() => import('./pages/Dashboard'))
const Inventory         = lazy(() => import('./pages/Inventory'))
const InventoryMovements = lazy(() => import('./pages/InventoryMovements'))
const Production        = lazy(() => import('./pages/Production'))
const Sales             = lazy(() => import('./pages/Sales'))
const CRM               = lazy(() => import('./pages/CRM'))
const CustomerDetail    = lazy(() => import('./pages/CustomerDetail'))
const Reports           = lazy(() => import('./pages/Reports'))
const Catalog           = lazy(() => import('./pages/Catalog'))
const Settings          = lazy(() => import('./pages/Settings'))
const Quotations        = lazy(() => import('./pages/Quotations'))
const PurchaseOrders    = lazy(() => import('./pages/PurchaseOrders'))
const DispatchPage      = lazy(() => import('./pages/Dispatch'))
const ExpensesPage      = lazy(() => import('./pages/Expenses'))
const PipelinePage      = lazy(() => import('./pages/Pipeline'))
const CalendarPage      = lazy(() => import('./pages/Calendar'))
const PublicCatalog     = lazy(() => import('./pages/PublicCatalog'))
const ReturnsPage       = lazy(() => import('./pages/Returns'))
const SuppliersPage     = lazy(() => import('./pages/Suppliers'))
const CarteraPage       = lazy(() => import('./pages/Cartera'))
const PaymentsPage      = lazy(() => import('./pages/Payments'))
const Welcome           = lazy(() => import('./pages/Welcome'))

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazonia-600" />
    </div>
  )
}

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-red-600 dark:text-red-400 text-lg font-semibold">Algo salió mal</div>
          <p className="text-slate-500 dark:text-gray-400 text-sm max-w-md text-center">
            {this.state.error?.message || 'Error inesperado en la aplicación'}
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
            className="px-4 py-2 bg-amazonia-600 text-white rounded-lg hover:bg-amazonia-700 transition-colors text-sm"
          >
            Recargar página
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

export default function App() {
  const { isAuthenticated, loadAllData, checkCalendarReminders } = useStore()

  useEffect(() => {
    if (isAuthenticated) loadAllData()
  }, [isAuthenticated])

  useEffect(() => {
    if (!isAuthenticated) return
    checkCalendarReminders()
    const id = window.setInterval(() => checkCalendarReminders(), 60_000)
    return () => window.clearInterval(id)
  }, [isAuthenticated, checkCalendarReminders])

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/catalogo" element={<PublicCatalog />} />
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            {/* Welcome page — full-screen, no sidebar, the landing after login */}
            <Route path="/" element={<Welcome />} />
            <Route element={<Layout />}>
              <Route path="/dashboard"   element={<Dashboard />} />
              <Route path="/calendar"    element={<CalendarPage />} />
              <Route path="/inventory"   element={<Inventory />} />
              <Route path="/inventory/movements" element={<InventoryMovements />} />
              <Route path="/production"  element={<Production />} />
              <Route path="/sales"       element={<Sales />} />
              <Route path="/crm"         element={<CRM />} />
              <Route path="/crm/:id"     element={<CustomerDetail />} />
              <Route path="/reports"     element={<Reports />} />
              <Route path="/catalog"     element={<Catalog />} />
              <Route path="/quotations"  element={<Quotations />} />
              <Route path="/purchases"   element={<PurchaseOrders />} />
              <Route path="/dispatch"    element={<DispatchPage />} />
              <Route path="/expenses"    element={<ExpensesPage />} />
              <Route path="/pipeline"    element={<PipelinePage />} />
              <Route path="/returns"     element={<ReturnsPage />} />
              <Route path="/suppliers"   element={<SuppliersPage />} />
              <Route path="/cartera"     element={<CarteraPage />} />
              <Route path="/payments"    element={<PaymentsPage />} />
              <Route path="/settings"    element={<Settings />} />
              <Route path="*"            element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
