import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { ProductionOrder } from '../../data/mockData'
import { apiFetch } from '../api'
import { toast } from '../../components/Toast'

export interface ProductionSlice {
  productionOrders: ProductionOrder[]
  updateProductionOrderStatus: (id: string, status: ProductionOrder['status']) => void
  finalizeProductionOrder: (id: string, actuals: {
    actualQty: number
    rejectedQty: number
    actualCost: number
    actualIngredients: { supplyId: string; supplyName: string; qty: number; unit: string }[]
    notes?: string
  }) => Promise<void>
  addProductionOrder: (o: ProductionOrder) => Promise<void>
  deleteProductionOrder:(id: string) => Promise<void>
}

export const createProductionSlice: StateCreator<AppState, [], [], ProductionSlice> = (set, get) => ({
  productionOrders: [],

  // ── Business data mutations (via API) ──────────────────────────────────────
  updateProductionOrderStatus: async (id, status) => {
    await apiFetch(`/api/production-orders/${id}/status`, {
      method: 'PUT', body: JSON.stringify({ status }),
    })
    set((s) => {
      const updatedOrders = s.productionOrders.map((o) => o.id === id ? { ...o, status } : o)

      // When finishing a production order, auto-deduct supplies from inventory
      if (status === 'finished') {
        const order = s.productionOrders.find((o) => o.id === id)
        if (order?.recipeId) {
          const recipe = s.recipes.find((r) => r.id === order.recipeId)
          if (recipe) {
            const batchesNeeded = order.plannedQty / recipe.yieldQty
            const updatedSupplies = s.supplies.map((supply) => {
              const ingredient = recipe.ingredients.find((ing) => ing.supplyId === supply.id)
              if (!ingredient) return supply
              const consumed = parseFloat((ingredient.qty * batchesNeeded).toFixed(4))
              return { ...supply, stock: Math.max(0, parseFloat((supply.stock - consumed).toFixed(4))) }
            })
            // Persist each changed supply
            updatedSupplies.forEach((sup, i) => {
              if (sup.stock !== s.supplies[i]?.stock) {
                apiFetch(`/api/supplies/${sup.id}`, { method: 'PUT', body: JSON.stringify(sup) })
              }
            })
            setTimeout(() => get().checkAlerts(), 0)
            return { productionOrders: updatedOrders, supplies: updatedSupplies }
          }
        }
      }

      return { productionOrders: updatedOrders }
    })
  },

  finalizeProductionOrder: async (id, actuals) => {
    // Call new backend endpoint
    await apiFetch(`/api/production-orders/${id}/finish`, {
      method: 'PUT',
      body: JSON.stringify(actuals),
    })

    const s = get()
    const order = s.productionOrders.find((o) => o.id === id)
    if (!order) return
    const finishedAt = new Date().toISOString()

    // Update the order with actuals
    const updatedOrders = s.productionOrders.map((o) =>
      o.id === id
        ? { ...o, status: 'finished' as const, ...actuals, finishedAt }
        : o
    )

    // Consume actual ingredients from supplies
    const updatedSupplies = s.supplies.map((sup) => {
      const used = actuals.actualIngredients.find((i) => i.supplyId === sup.id)
      if (!used) return sup
      const newStock = Math.max(0, parseFloat((sup.stock - used.qty).toFixed(4)))
      return { ...sup, stock: newStock }
    })

    // Persist supply changes + log movements
    updatedSupplies.forEach((sup, i) => {
      const original = s.supplies[i]
      if (sup.stock !== original?.stock) {
        apiFetch(`/api/supplies/${sup.id}`, { method: 'PUT', body: JSON.stringify(sup) })
        const consumed = original.stock - sup.stock
        // Log a production-type movement (fire-and-forget)
        get().addInventoryMovement({
          id: `im${Date.now()}_${sup.id}`,
          itemId: sup.id,
          itemName: sup.name,
          itemType: 'supply',
          movementType: 'production',
          quantity: consumed,
          previousStock: original.stock,
          newStock: sup.stock,
          unit: sup.unit,
          reference: order.orderNumber,
          notes: `Consumo real orden ${order.orderNumber}`,
          createdBy: s.user?.name || 'Sistema',
          createdAt: finishedAt,
        }).catch(() => {})
      }
    })

    set({ productionOrders: updatedOrders, supplies: updatedSupplies })
    setTimeout(() => get().checkAlerts(), 0)
    toast.success(`Orden finalizada — ${actuals.actualQty} unidades producidas`)
  },

  addProductionOrder: async (order) => {
    await apiFetch('/api/production-orders', { method: 'POST', body: JSON.stringify(order) })
    set((s) => ({ productionOrders: [...s.productionOrders, order] }))
    toast.success('Orden de producción creada')
  },
  deleteProductionOrder: async (id) => {
    await apiFetch(`/api/production-orders/${id}`, { method: 'DELETE' })
    set((s) => ({ productionOrders: s.productionOrders.filter((x) => x.id !== id) }))
  },
})
