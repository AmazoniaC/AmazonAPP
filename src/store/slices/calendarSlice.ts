import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { CalendarItem, WhatsAppSendResult } from '../types'
import { getCalendarItems, lsSet } from '../persist'
import { apiFetch, notifyWhatsAppResult } from '../api'
import { cleanPhone } from '../../utils/whatsapp'
import { toast } from '../../components/Toast'

export interface CalendarSlice {
  calendarItems: CalendarItem[]
  loadCalendarItems:  () => Promise<void>
  addCalendarItem:    (i: Omit<CalendarItem, 'id' | 'notifiedAt'>) => Promise<void>
  updateCalendarItem: (i: CalendarItem) => Promise<void>
  deleteCalendarItem: (id: string) => Promise<void>
  toggleCalendarItemDone: (id: string) => Promise<void>
  checkCalendarReminders: () => void
}

const initialCalendarItems = getCalendarItems()

export const createCalendarSlice: StateCreator<AppState, [], [], CalendarSlice> = (set, get) => ({
  calendarItems: initialCalendarItems,

  loadCalendarItems: async () => {
    try {
      const items = await apiFetch<CalendarItem[]>('/api/calendar-items')
      set({ calendarItems: items })
      lsSet('erp_calendar_items', items)
    } catch (e) {
      console.warn('No se pudo cargar calendario, usando caché local:', (e as Error).message)
    }
  },

  addCalendarItem: async (item) => {
    const newItem: CalendarItem = { ...item, id: crypto.randomUUID() }
    let res: { whatsapp?: WhatsAppSendResult | null }
    try {
      res = await apiFetch<{ whatsapp?: WhatsAppSendResult | null }>(
        '/api/calendar-items', { method: 'POST', body: JSON.stringify(newItem) },
      )
    } catch (e) {
      toast.error('No se pudo guardar en el servidor')
      console.error(e)
      return
    }
    set((s) => {
      const updated = [...s.calendarItems, newItem]
      lsSet('erp_calendar_items', updated)
      return { calendarItems: updated }
    })
    toast.success(item.kind === 'meeting' ? 'Reunión agendada' : 'Recordatorio creado')
    notifyWhatsAppResult(item, res?.whatsapp)
    setTimeout(() => get().checkCalendarReminders(), 0)
  },

  updateCalendarItem: async (item) => {
    let res: { whatsapp?: WhatsAppSendResult | null }
    try {
      res = await apiFetch<{ whatsapp?: WhatsAppSendResult | null }>(
        `/api/calendar-items/${item.id}`, { method: 'PUT', body: JSON.stringify(item) },
      )
    } catch (e) { toast.error('No se pudo actualizar'); return }
    set((s) => {
      const updated = s.calendarItems.map((x) => x.id === item.id ? item : x)
      lsSet('erp_calendar_items', updated)
      return { calendarItems: updated }
    })
    notifyWhatsAppResult(item, res?.whatsapp)
  },

  deleteCalendarItem: async (id) => {
    try {
      await apiFetch(`/api/calendar-items/${id}`, { method: 'DELETE' })
    } catch (e) { toast.error('No se pudo eliminar'); return }
    set((s) => {
      const updated = s.calendarItems.filter((x) => x.id !== id)
      lsSet('erp_calendar_items', updated)
      return { calendarItems: updated }
    })
    toast.success('Eliminado del calendario')
  },

  toggleCalendarItemDone: async (id) => {
    const current = get().calendarItems.find((x) => x.id === id)
    if (!current) return
    const updatedItem = { ...current, done: !current.done }
    await get().updateCalendarItem(updatedItem)
  },

  checkCalendarReminders: () => {
    const s = get()
    const now = Date.now()
    // Local calendar date (not UTC) so the "day" rolls over at local midnight.
    const d = new Date()
    const todayISO = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

    const deliveredKey = 'erp_calendar_inapp_delivered'
    let delivered: string[] = []
    try { delivered = JSON.parse(localStorage.getItem(deliveredKey) || '[]') } catch {}
    const deliveredSet = new Set(delivered)

    for (const it of s.calendarItems) {
      if (it.done || !it.notifyApp) continue
      if (deliveredSet.has(it.id)) continue
      const t = it.time || '09:00'
      const eventMs = new Date(`${it.date}T${t}:00`).getTime()
      if (Number.isNaN(eventMs)) continue
      const lead = (it.reminderMinutes ?? 15) * 60 * 1000
      if (now < eventMs - lead) continue

      const label = it.kind === 'meeting' ? 'Reunión' : 'Recordatorio'
      const when = it.time ? ` a las ${it.time}` : ''

      s.addNotification({
        type: 'info',
        category: 'general',
        message: `${label}: ${it.title}${when}`,
        link: '/calendar',
      })
      deliveredSet.add(it.id)
    }
    localStorage.setItem(deliveredKey, JSON.stringify([...deliveredSet]))

    // Daily agenda summary — fire once per day if there are any items today
    const lastAgenda = localStorage.getItem('erp_last_agenda_date')
    if (lastAgenda !== todayISO) {
      const todayItems = s.calendarItems.filter((i) => i.date === todayISO && !i.done)
      if (todayItems.length > 0) {
        const summary = todayItems
          .map((i) => `• ${i.time ? i.time + ' ' : ''}${i.kind === 'meeting' ? '📅' : '🔔'} ${i.title}`)
          .join('\n')
        // Auto-send daily agenda via WhatsApp if company WhatsApp is configured
        const phone = cleanPhone(s.companySettings.whatsapp || '')
        if (phone) {
          apiFetch('/api/whatsapp/send', {
            method: 'POST',
            body: JSON.stringify({ phone, text: `Tu agenda de hoy (${todayISO}):\n${summary}` }),
          }).then(() => {
            s.addNotification({
              type: 'success',
              category: 'general',
              message: `Agenda del día enviada por WhatsApp (${todayItems.length} evento${todayItems.length > 1 ? 's' : ''})`,
              link: '/calendar',
            })
          }).catch(() => {
            const waLink = `https://wa.me/${phone}?text=${encodeURIComponent(`Tu agenda de hoy (${todayISO}):\n${summary}`)}`
            s.addNotification({
              type: 'info',
              category: 'general',
              message: `Tienes ${todayItems.length} evento${todayItems.length > 1 ? 's' : ''} hoy — enviar agenda manualmente`,
              link: waLink,
            })
          })
        } else {
          s.addNotification({
            type: 'info',
            category: 'general',
            message: `Tienes ${todayItems.length} evento${todayItems.length > 1 ? 's' : ''} agendado${todayItems.length > 1 ? 's' : ''} hoy`,
            link: '/calendar',
          })
        }
      }
      localStorage.setItem('erp_last_agenda_date', todayISO)
    }
  },
})
