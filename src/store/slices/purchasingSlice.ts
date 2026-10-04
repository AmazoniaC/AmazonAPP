import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { PurchaseOrder, Supplier, PriceList } from '../../data/mockData'
import { apiFetch } from '../api'
import { toast } from '../../components/Toast'

export interface PurchasingSlice {
  purchaseOrders: PurchaseOrder[]
  suppliers:      Supplier[]
  priceLists:     PriceList[]

  addPurchaseOrder:     (o: PurchaseOrder) => Promise<void>
  updatePurchaseOrder:  (o: PurchaseOrder) => Promise<void>
  deletePurchaseOrder:  (id: string)       => Promise<void>
  receivePurchaseOrder: (id: string, receivedQty: Record<string, number>) => Promise<void>
  addSupplier:    (s: Supplier) => Promise<void>
  updateSupplier: (s: Supplier) => Promise<void>
  deleteSupplier: (id: string)  => Promise<void>
  addPriceList:    (p: PriceList) => Promise<void>
  updatePriceList: (p: PriceList) => Promise<void>
  deletePriceList: (id: string)   => Promise<void>
}

export const createPurchasingSlice: StateCreator<AppState, [], [], PurchasingSlice> = (set, get) => ({
  purchaseOrders: [],
  suppliers:      [],
  priceLists:     [],

  addPurchaseOrder: async (order) => {
    await apiFetch('/api/purchase-orders', { method: 'POST', body: JSON.stringify(order) })
    set((s) => ({ purchaseOrders: [order, ...s.purchaseOrders] }))
    toast.success('Orden de compra creada')
  },
  updatePurchaseOrder: async (order) => {
    await apiFetch(`/api/purchase-orders/${order.id}`, { method: 'PUT', body: JSON.stringify(order) })
    set((s) => ({ purchaseOrders: s.purchaseOrders.map((x) => x.id === order.id ? order : x) }))
    toast.success('Orden de compra actualizada')
  },
  deletePurchaseOrder: async (id) => {
    await apiFetch(`/api/purchase-orders/${id}`, { method: 'DELETE' })
    set((s) => ({ purchaseOrders: s.purchaseOrders.filter((x) => x.id !== id) }))
    toast.success('Orden de compra eliminada')
  },
  receivePurchaseOrder: async (id, receivedQtyMap) => {
    // The server does this atomically in one transaction — merges received
    // quantities into the items, recomputes status, credits each supply's
    // stock, and logs an inventory movement for every item received, all or
    // nothing. (It used to be a client-side loop of individual, unawaited
    // PUTs with no movement logged at all — a failure partway through left
    // stock half-updated with no audit trail of what happened.)
    const updated = await apiFetch<PurchaseOrder>(`/api/purchase-orders/${id}/receive`, {
      method: 'PUT', body: JSON.stringify({ receivedQtyMap }),
    })
    set((s) => ({
      purchaseOrders: s.purchaseOrders.map((x) => x.id === id ? updated : x),
      supplies: s.supplies.map((sup) => {
        const qty = receivedQtyMap[sup.id]
        if (!qty) return sup
        return { ...sup, stock: parseFloat((sup.stock + qty).toFixed(4)) }
      }),
    }))
    toast.success('Mercancía recibida')
    // Re-run alerts: stock levels changed after receiving
    setTimeout(() => get().checkAlerts(), 0)
  },

  addSupplier: async (s) => {
    await apiFetch('/api/suppliers', { method: 'POST', body: JSON.stringify(s) })
    set((st) => ({ suppliers: [...st.suppliers, s] }))
    toast.success('Proveedor creado')
  },
  updateSupplier: async (s) => {
    await apiFetch(`/api/suppliers/${s.id}`, { method: 'PUT', body: JSON.stringify(s) })
    set((st) => ({ suppliers: st.suppliers.map((x) => x.id === s.id ? s : x) }))
    toast.success('Proveedor actualizado')
  },
  deleteSupplier: async (id) => {
    await apiFetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    set((st) => ({ suppliers: st.suppliers.filter((x) => x.id !== id) }))
    toast.success('Proveedor eliminado')
  },

  addPriceList: async (pl) => {
    await apiFetch('/api/price-lists', { method: 'POST', body: JSON.stringify(pl) })
    set((s) => ({ priceLists: [...s.priceLists, pl] }))
  },
  updatePriceList: async (pl) => {
    await apiFetch(`/api/price-lists/${pl.id}`, { method: 'PUT', body: JSON.stringify(pl) })
    set((s) => ({ priceLists: s.priceLists.map((x) => x.id === pl.id ? pl : x) }))
  },
  deletePriceList: async (id) => {
    await apiFetch(`/api/price-lists/${id}`, { method: 'DELETE' })
    set((s) => ({ priceLists: s.priceLists.filter((x) => x.id !== id) }))
  },
})
