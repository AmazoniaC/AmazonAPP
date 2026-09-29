import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { SaleOrder, Quotation, Payment } from '../../data/mockData'
import { apiFetch } from '../api'
import { toast } from '../../components/Toast'
import { nextOrderNumber } from '../../utils/orderNumber'

export interface SalesSlice {
  saleOrders: SaleOrder[]
  quotations: Quotation[]
  payments:   Payment[]

  addSaleOrder:      (o: SaleOrder) => Promise<void>
  updateSaleOrder:   (o: SaleOrder) => Promise<void>
  deleteSaleOrder:   (id: string)   => Promise<void>
  generateInvoice:   (id: string)   => Promise<SaleOrder>
  addQuotation:     (q: Quotation) => Promise<void>
  updateQuotation:  (q: Quotation) => Promise<void>
  deleteQuotation:  (id: string)   => Promise<void>
  convertQuotation: (id: string)   => Promise<void>
  addPayment:    (p: Payment) => Promise<void>
  deletePayment: (id: string) => Promise<void>
  getOrderPayments: (saleOrderId: string) => Payment[]
}

export const createSalesSlice: StateCreator<AppState, [], [], SalesSlice> = (set, get) => ({
  saleOrders: [],
  quotations: [],
  payments:   [],

  addSaleOrder: async (order) => {
    await apiFetch('/api/sale-orders', { method: 'POST', body: JSON.stringify(order) })
    set((s) => ({ saleOrders: [...s.saleOrders, order] }))
    toast.success('Orden de venta creada')
  },
  updateSaleOrder: async (order) => {
    await apiFetch(`/api/sale-orders/${order.id}`, { method: 'PUT', body: JSON.stringify(order) })
    set((s) => ({ saleOrders: s.saleOrders.map((x) => x.id === order.id ? order : x) }))
    toast.success('Orden de venta actualizada')
  },
  deleteSaleOrder: async (id) => {
    await apiFetch(`/api/sale-orders/${id}`, { method: 'DELETE' })
    set((s) => ({ saleOrders: s.saleOrders.filter((x) => x.id !== id) }))
    toast.success('Orden de venta eliminada')
  },
  generateInvoice: async (id) => {
    const s = get()
    const order = s.saleOrders.find((x) => x.id === id)
    if (!order) throw new Error('Orden no encontrada')
    // If already has invoice number, return as-is
    if (order.invoiceNumber) return order
    const year     = new Date().getFullYear()
    const prefix   = s.companySettings.invoicePrefix?.replace('VTA', 'FAC') || 'FAC'
    const existingNumbers = s.saleOrders.map((x) => x.invoiceNumber).filter((n): n is string => !!n)
    const invoiceNumber = nextOrderNumber(existingNumbers, `${prefix}-${year}-`)
    const invoiceDate   = new Date().toISOString().split('T')[0]
    const updated: SaleOrder = { ...order, invoiceNumber, invoiceDate }
    await apiFetch(`/api/sale-orders/${id}`, { method: 'PUT', body: JSON.stringify(updated) })
    set((s2) => ({ saleOrders: s2.saleOrders.map((x) => x.id === id ? updated : x) }))
    return updated
  },

  addQuotation: async (quotation) => {
    await apiFetch('/api/quotations', { method: 'POST', body: JSON.stringify(quotation) })
    set((s) => ({ quotations: [quotation, ...s.quotations] }))
    toast.success('Cotización creada')
  },
  updateQuotation: async (quotation) => {
    await apiFetch(`/api/quotations/${quotation.id}`, { method: 'PUT', body: JSON.stringify(quotation) })
    set((s) => ({ quotations: s.quotations.map((x) => x.id === quotation.id ? quotation : x) }))
    toast.success('Cotización actualizada')
  },
  deleteQuotation: async (id) => {
    await apiFetch(`/api/quotations/${id}`, { method: 'DELETE' })
    set((s) => ({ quotations: s.quotations.filter((x) => x.id !== id) }))
    toast.success('Cotización eliminada')
  },
  convertQuotation: async (id) => {
    const s = get()
    const q = s.quotations.find((x) => x.id === id)
    if (!q || q.convertedToOrderId) return
    const prefix = `${s.companySettings.invoicePrefix || 'VTA'}-${new Date().getFullYear()}-`
    const order: SaleOrder = {
      id: `so${Date.now()}`,
      orderNumber: nextOrderNumber(s.saleOrders.map((x) => x.orderNumber), prefix),
      customer: q.customer, customerId: q.customerId,
      items: q.items,
      subtotal: q.subtotal, discount: q.discount, tax: q.tax, total: q.total,
      status: 'confirmed', paymentStatus: 'pending', paymentMethod: 'Transferencia',
      date: new Date().toISOString().split('T')[0],
      deliveryDate: q.deliveryEstimate || undefined,
      notes: q.notes,
      priceListId: q.priceListId,
    }
    await apiFetch('/api/sale-orders', { method: 'POST', body: JSON.stringify(order) })
    const updated: Quotation = { ...q, status: 'accepted', convertedToOrderId: order.id }
    await apiFetch(`/api/quotations/${id}`, { method: 'PUT', body: JSON.stringify(updated) })
    set((s2) => ({
      saleOrders: [...s2.saleOrders, order],
      quotations: s2.quotations.map((x) => x.id === id ? updated : x),
    }))
  },

  // ── Payments ─────────────────────────────────────────────────────────────
  addPayment: async (payment) => {
    await apiFetch('/api/payments', { method: 'POST', body: JSON.stringify(payment) })
    set((s) => {
      const updatedPayments = [payment, ...s.payments]
      const state: Partial<AppState> = { payments: updatedPayments }
      if (payment.saleOrderId) {
        const orderPayments = updatedPayments.filter(p => p.saleOrderId === payment.saleOrderId)
        const totalPaid = orderPayments.reduce((sum, p) => sum + p.amount, 0)
        const order = s.saleOrders.find(o => o.id === payment.saleOrderId)
        if (order) {
          const newStatus = totalPaid >= order.total ? 'paid' : totalPaid > 0 ? 'partial' : 'pending'
          state.saleOrders = s.saleOrders.map(o => o.id === payment.saleOrderId ? { ...o, paymentStatus: newStatus } : o)
        }
      }
      return state
    })
    toast.success('Pago registrado correctamente')
  },
  deletePayment: async (id) => {
    const payment = get().payments.find(p => p.id === id)
    await apiFetch(`/api/payments/${id}`, { method: 'DELETE' })
    set((s) => ({ payments: s.payments.filter(p => p.id !== id) }))
    // Recalculate sale order payment status
    if (payment?.saleOrderId) {
      const s = get()
      const remaining = s.payments.filter(p => p.saleOrderId === payment.saleOrderId)
      const totalPaid = remaining.reduce((sum, p) => sum + p.amount, 0)
      const order = s.saleOrders.find(o => o.id === payment.saleOrderId)
      if (order) {
        const newStatus = totalPaid >= order.total ? 'paid' : totalPaid > 0 ? 'partial' : 'pending'
        set((s2) => ({ saleOrders: s2.saleOrders.map(o => o.id === payment.saleOrderId ? { ...o, paymentStatus: newStatus } : o) }))
      }
    }
    toast.success('Pago eliminado')
  },
  getOrderPayments: (saleOrderId) => {
    return get().payments.filter(p => p.saleOrderId === saleOrderId)
  },
})
