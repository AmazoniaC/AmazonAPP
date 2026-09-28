// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers (solo para auth, theme, notifications, calendario, logo).
// Used to read the initial snapshot each slice starts from, and to persist
// after each mutation.
// ─────────────────────────────────────────────────────────────────────────────
import type { AuthUser, Notification, CalendarItem } from './types'

export function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch { return fallback }
}

export function lsSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
}

export const getAuth = (): { isAuthenticated: boolean; user: AuthUser | null } => {
  try {
    const raw = localStorage.getItem('erp_auth')
    if (!raw) return { isAuthenticated: false, user: null }
    const user = JSON.parse(raw)
    if (!user.token) {
      localStorage.removeItem('erp_auth')
      return { isAuthenticated: false, user: null }
    }
    return { isAuthenticated: true, user }
  } catch { return { isAuthenticated: false, user: null } }
}

export const getNotifications = (): Notification[] => {
  try {
    const raw = localStorage.getItem('erp_notifications')
    if (!raw) return []
    return JSON.parse(raw).map((n: Notification) => ({ ...n, timestamp: new Date(n.timestamp), category: n.category ?? 'general' }))
  } catch { return [] }
}

export const getCalendarItems = (): CalendarItem[] => {
  try {
    const raw = localStorage.getItem('erp_calendar_items')
    if (!raw) return []
    return JSON.parse(raw) as CalendarItem[]
  } catch { return [] }
}

export const getDarkMode = (): boolean => localStorage.getItem('erp_theme') === 'dark'
