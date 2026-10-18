import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { SaleOrder, Quotation, Payment, ProductionOrder } from '../../data/mockData'
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
  createProductionOrdersForSale: (order: SaleOrder) => Promise<void>
}

export const createSalesSlice: StateCreator<AppState, [], [], SalesSlice> = (set, get) => ({
  saleOrders: [],
  quotations: [],
  payments:   [],

  addSaleOrder: async (order) => {
    await apiFetch('/api/sale-orders', { method: 'POST', body: JSON.stringify(order) })
    set((s) => ({ saleOrders: [...s.saleOrders, order] }))
    toast.success('Orden de venta creada')
    if (order.status === 'confirmed') await get().createProductionOrdersForSale(order)
  },
  updateSaleOrder: async (order) => {
    const prev = get().saleOrders.find((x) => x.id === order.id)
    await apiFetch(`/api/sale-orders/${order.id}`, { method: 'PUT', body: JSON.stringify(order) })
    set((s) => ({ saleOrders: s.saleOrders.map((x) => x.id === order.id ? order : x) }))
    toast.success('Orden de venta actualizada')
    // Only trigger on the pending → confirmed transition, never on every edit
    // of an already-confirmed order (payment status changes, notes, etc.).
    if (order.status === 'confirmed' && prev?.status !== 'confirmed') {
      await get().createProductionOrdersForSale(order)
    }
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
    await get().createProductionOrdersForSale(order)
  },

  // When a sale is confirmed, auto-create a draft production order for any
  // item whose stock on hand can't cover the sold quantity — but only for
  // products that have a matching recipe (we never invent a production
  // formula). Items without a recipe are left for manual follow-up.
  createProductionOrdersForSale: async (order) => {
    const s = get()
    let created = 0
    const year = new Date().getFullYear()
    const defaultAssignee = (s.companySettings.teamMembers ?? [])
      .find((m) => m.role === 'production' && m.isActive)?.name ?? ''
    const today = new Date().toISOString().split('T')[0]

    for (const item of order.items) {
      // Variant-level deficits aren't covered: production replenishes the
      // base product's stock, not a specific variant's.
      if (!item.productId || item.variantId) continue
      const product = s.products.find((p) => p.id === item.productId)
      if (!product?.recipeId) continue
      const recipe = s.recipes.find((r) => r.id === product.recipeId)
      if (!recipe) continue

      const deficit = parseFloat((item.qty - product.stock).toFixed(4))
      if (deficit <= 0) continue

      const existingNumbers = get().productionOrders.map((o) => o.orderNumber)
      const po: ProductionOrder = {
        id: `po${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        orderNumber: nextOrderNumber(existingNumbers, `OP-${year}-`),
        recipe: recipe.name, recipeId: recipe.id, product: recipe.name.split('(')[0].trim(),
        plannedQty: deficit, status: 'pending', priority: 2,
        plannedStart: `${today} 08:00`, plannedEnd: `${today} 16:00`,
        estimatedCost: parseFloat((recipe.costPerUnit * deficit).toFixed(2)),
        assignedTo: defaultAssignee,
        notes: `Generada automáticamente: faltante de ${deficit} ${recipe.yieldUnit} para la venta ${order.orderNumber}`,
      }
      await get().addProductionOrder(po, { silent: true })
      created += 1
    }

    if (created > 0) {
      toast.success(
        created === 1
          ? `Se generó 1 orden de producción por stock insuficiente (venta ${order.orderNumber})`
          : `Se generaron ${created} órdenes de producción por stock insuficiente (venta ${order.orderNumber})`
      )
    }
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
