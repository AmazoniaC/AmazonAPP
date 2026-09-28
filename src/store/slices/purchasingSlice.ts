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
    const s = get()
    const order = s.purchaseOrders.find((x) => x.id === id)
    if (!order) return

    const updatedItems = order.items.map((item) => ({
      ...item,
      receivedQty: (item.receivedQty ?? 0) + (receivedQtyMap[item.supplyId] ?? 0),
    }))
    const allReceived = updatedItems.every((i) => (i.receivedQty ?? 0) >= i.qty)
    const anyReceived = updatedItems.some((i) => (i.receivedQty ?? 0) > 0)
    const newStatus: PurchaseOrder['status'] = allReceived ? 'received' : anyReceived ? 'partial' : order.status

    const updated: PurchaseOrder = {
      ...order, items: updatedItems, status: newStatus,
      receivedDate: newStatus === 'received' ? new Date().toISOString().split('T')[0] : order.receivedDate,
    }

    await apiFetch(`/api/purchase-orders/${id}`, { method: 'PUT', body: JSON.stringify(updated) })

    // Update supply stock for received quantities
    const updatedSupplies = s.supplies.map((sup) => {
      const qty = receivedQtyMap[sup.id]
      if (!qty) return sup
      const newSup = { ...sup, stock: parseFloat((sup.stock + qty).toFixed(4)) }
      apiFetch(`/api/supplies/${sup.id}`, { method: 'PUT', body: JSON.stringify(newSup) })
      return newSup
    })

    set((curr) => ({ purchaseOrders: curr.purchaseOrders.map((x) => x.id === id ? updated : x), supplies: updatedSupplies }))
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
