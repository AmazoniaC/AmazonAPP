// ─────────────────────────────────────────────────────────────────────────────
// Combines every domain slice (src/store/slices/*.ts) into the single store
// every component reads via useStore(). This file only wires slices together
// — the actual state and actions live in the slice that owns each domain.
// See src/store/state.ts for how the combined AppState type is built.
// ─────────────────────────────────────────────────────────────────────────────
import { create } from 'zustand'
import type { AppState } from './state'
import { setUnauthorizedHandler } from './api'

import { createUiSlice } from './slices/uiSlice'
import { createAuthSlice } from './slices/authSlice'
import { createNotificationsSlice } from './slices/notificationsSlice'
import { createCalendarSlice } from './slices/calendarSlice'
import { createSettingsSlice } from './slices/settingsSlice'
import { createInventorySlice } from './slices/inventorySlice'
import { createProductionSlice } from './slices/productionSlice'
import { createSalesSlice } from './slices/salesSlice'
import { createCrmSlice } from './slices/crmSlice'
import { createPurchasingSlice } from './slices/purchasingSlice'
import { createDispatchSlice } from './slices/dispatchSlice'
import { createFinanceSlice } from './slices/financeSlice'
import { createDataSlice } from './slices/dataSlice'

export const useStore = create<AppState>()((...a) => ({
  ...createUiSlice(...a),
  ...createAuthSlice(...a),
  ...createNotificationsSlice(...a),
  ...createCalendarSlice(...a),
  ...createSettingsSlice(...a),
  ...createInventorySlice(...a),
  ...createProductionSlice(...a),
  ...createSalesSlice(...a),
  ...createCrmSlice(...a),
  ...createPurchasingSlice(...a),
  ...createDispatchSlice(...a),
  ...createFinanceSlice(...a),
  ...createDataSlice(...a),
}))

// apiFetch (in ./api) needs to clear the session on a 401, without importing
// this file (that would be circular — this file already imports api.ts).
setUnauthorizedHandler(() =>
  useStore.setState({ isAuthenticated: false, user: null, dataLoaded: false, lastActivity: 0 })
)

// Re-exported so existing `import { X } from '../store/useStore'` call sites
// across the app keep working unchanged.
export type {
  NotifCategory, Notification, CalendarItemKind, CalendarItem,
  AuthUser, CompanySettings, TeamRole, TeamMember,
} from './types'
