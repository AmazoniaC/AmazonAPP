// ─────────────────────────────────────────────────────────────────────────────
// AppState is the union of every slice's state + actions — the exact same
// shape useStore() returned before this file existed. Kept separate from
// useStore.ts so each slice can import the full type (for its `get()` calls
// into other slices) without importing useStore.ts itself and creating a
// module cycle between "the store" and "the thing that builds the store".
// ─────────────────────────────────────────────────────────────────────────────
import type { UiSlice } from './slices/uiSlice'
import type { AuthSlice } from './slices/authSlice'
import type { NotificationsSlice } from './slices/notificationsSlice'
import type { CalendarSlice } from './slices/calendarSlice'
import type { SettingsSlice } from './slices/settingsSlice'
import type { InventorySlice } from './slices/inventorySlice'
import type { ProductionSlice } from './slices/productionSlice'
import type { SalesSlice } from './slices/salesSlice'
import type { CrmSlice } from './slices/crmSlice'
import type { PurchasingSlice } from './slices/purchasingSlice'
import type { DispatchSlice } from './slices/dispatchSlice'
import type { FinanceSlice } from './slices/financeSlice'
import type { DataSlice } from './slices/dataSlice'

export type AppState =
  & UiSlice
  & AuthSlice
  & NotificationsSlice
  & CalendarSlice
  & SettingsSlice
  & InventorySlice
  & ProductionSlice
  & SalesSlice
  & CrmSlice
  & PurchasingSlice
  & DispatchSlice
  & FinanceSlice
  & DataSlice
