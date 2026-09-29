import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import ErrorBoundary from './components/ErrorBoundary'
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

function PageFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amazonia-600" />
    </div>
  )
}

export default function App() {
  const { isAuthenticated, loadAllData, checkCalendarReminders, materializeRecurringExpenses } = useStore()

  useEffect(() => {
    if (isAuthenticated) {
      loadAllData().then(() => materializeRecurringExpenses().catch(() => {}))
    }
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
            <Route element={<Layout />}>
              {/* The sidebar is the only navigation surface now — no separate
                  module-picker landing page. "/" and any unknown path land
                  on the dashboard. */}
              <Route path="/"             element={<Navigate to="/dashboard" replace />} />
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
              <Route path="*"            element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
