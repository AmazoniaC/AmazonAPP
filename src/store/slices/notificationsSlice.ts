import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { Notification, NotifCategory } from '../types'
import { getNotifications, lsSet } from '../persist'

export interface NotificationsSlice {
  notifications: Notification[]
  addNotification:    (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  checkAlerts:         () => void
  markAsRead:          (id: string) => void
  markAllAsRead:       () => void
  clearNotifications:  () => void
}

const initialNotifications = getNotifications()

export const createNotificationsSlice: StateCreator<AppState, [], [], NotificationsSlice> = (set, get) => ({
  notifications: initialNotifications,

  addNotification: (n) =>
    set((s) => {
      const notif: Notification = { ...n, id: crypto.randomUUID(), timestamp: new Date(), read: false }
      const updated = [notif, ...s.notifications]
      lsSet('erp_notifications', updated)
      return { notifications: updated }
    }),

  markAsRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) => n.id === id ? { ...n, read: true } : n)
      lsSet('erp_notifications', updated)
      return { notifications: updated }
    }),

  markAllAsRead: () =>
    set((s) => {
      const updated = s.notifications.map((n) => ({ ...n, read: true }))
      lsSet('erp_notifications', updated)
      return { notifications: updated }
    }),

  clearNotifications: () => {
    localStorage.removeItem('erp_notifications')
    set({ notifications: [] })
  },

  // ── Smart alerts engine ────────────────────────────────────────────────────
  checkAlerts: () => {
    const s = get()
    const today    = new Date().toISOString().split('T')[0]
    const in3Days  = new Date(Date.now() + 3  * 86400000).toISOString().split('T')[0]
    const ago7Days = new Date(Date.now() - 7  * 86400000).toISOString().split('T')[0]

    // Remove stale auto-generated alerts (keep only 'general' and user-cleared ones)
    const AUTO_CATEGORIES: NotifCategory[] = ['inventory', 'purchases', 'sales', 'production', 'crm']
    const kept = s.notifications.filter((n) => !AUTO_CATEGORIES.includes(n.category))
    const updatedNotifs = kept
    localStorage.setItem('erp_notifications', JSON.stringify(updatedNotifs))
    set({ notifications: updatedNotifs })

    // Track already-generated messages to avoid intra-run duplicates
    const existingMsgs = new Set(updatedNotifs.map((n) => n.message))
    const push = (notif: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      if (!existingMsgs.has(notif.message)) {
        s.addNotification(notif)
        existingMsgs.add(notif.message)
      }
    }

    // 1. Stock bajo (supplies)
    for (const sup of s.supplies) {
      if (sup.stock <= sup.minStock) {
        push({
          type: 'warning', category: 'inventory', link: `/inventory?open=${sup.id}`,
          message: `Stock bajo: ${sup.name} — ${sup.stock} ${sup.unit} (mín. ${sup.minStock})`,
        })
      }
    }

    // 2. Órdenes de compra atrasadas
    for (const o of s.purchaseOrders) {
      if ((o.status === 'sent' || o.status === 'partial') && o.expectedDate && o.expectedDate < today) {
        push({
          type: 'error', category: 'purchases', link: `/purchases?open=${o.id}`,
          message: `OC atrasada: ${o.orderNumber} de ${o.supplier} (esperada ${o.expectedDate})`,
        })
      }
    }

    // 3. Cotizaciones próximas a vencer (dentro de 3 días)
    for (const q of s.quotations) {
      if ((q.status === 'draft' || q.status === 'sent') && q.validUntil >= today && q.validUntil <= in3Days) {
        push({
          type: 'warning', category: 'sales', link: `/quotations?open=${q.id}`,
          message: `Cotización por vencer: ${q.quoteNumber} — ${q.customer} (${q.validUntil})`,
        })
      }
    }

    // 4. Pedidos de venta con entrega vencida
    for (const o of s.saleOrders) {
      if (['confirmed', 'processing'].includes(o.status) && o.deliveryDate && o.deliveryDate < today) {
        push({
          type: 'error', category: 'sales', link: `/sales?open=${o.id}`,
          message: `Entrega vencida: ${o.orderNumber} — ${o.customer} (debía ${o.deliveryDate})`,
        })
      }
    }

    // 5. Órdenes de producción prioritarias sin iniciar
    for (const o of s.productionOrders) {
      if (o.status === 'pending' && o.priority === 1) {
        push({
          type: 'warning', category: 'production', link: `/production?open=${o.id}`,
          message: `Producción prioritaria pendiente: ${o.orderNumber} — ${o.product}`,
        })
      }
    }

    // 6. Seguimientos de CRM sin completar por más de 7 días
    const stale = s.activities.filter((a) => !a.done && a.date < ago7Days)
    if (stale.length > 0) {
      push({
        type: 'info', category: 'crm', link: '/crm',
        message: `${stale.length} seguimiento${stale.length > 1 ? 's' : ''} de CRM pendiente${stale.length > 1 ? 's' : ''} (más de 7 días)`,
      })
    }

    // 7. Oportunidades de pipeline con próxima acción vencida
    for (const o of s.opportunities) {
      if (!['won', 'lost'].includes(o.stage) && o.nextActionDate && o.nextActionDate < today) {
        push({
          type: 'warning', category: 'crm', link: '/pipeline',
          message: `Seguimiento vencido: ${o.title} — ${o.customer}${o.nextActionNote ? ` (${o.nextActionNote})` : ''}`,
        })
      }
    }
  },
})
