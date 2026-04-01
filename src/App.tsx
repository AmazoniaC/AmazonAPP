import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Layout from './components/layout/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inventory from './pages/Inventory'
import Production from './pages/Production'
import Sales from './pages/Sales'
import CRM from './pages/CRM'
import Reports from './pages/Reports'
import Catalog from './pages/Catalog'
import Settings from './pages/Settings'
import Quotations from './pages/Quotations'
import PurchaseOrders from './pages/PurchaseOrders'
import DispatchPage from './pages/Dispatch'
import ExpensesPage from './pages/Expenses'
import PipelinePage from './pages/Pipeline'
import CalendarPage from './pages/Calendar'
import PublicCatalog from './pages/PublicCatalog'
import ReturnsPage from './pages/Returns'
import SuppliersPage from './pages/Suppliers'
import CarteraPage from './pages/Cartera'
import PaymentsPage from './pages/Payments'
import { useStore } from './store/useStore'

export default function App() {
  const { isAuthenticated, loadAllData } = useStore()

  useEffect(() => {
    if (isAuthenticated) loadAllData()
  }, [isAuthenticated])

  return (
    <Routes>
      <Route path="/catalogo" element={<PublicCatalog />} />
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/"            element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/calendar"    element={<CalendarPage />} />
          <Route path="/inventory"   element={<Inventory />} />
          <Route path="/production"  element={<Production />} />
          <Route path="/sales"       element={<Sales />} />
          <Route path="/crm"         element={<CRM />} />
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
  )
}
