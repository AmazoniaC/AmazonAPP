import { create } from 'zustand'
import {
  Supply, Product, ProductionOrder, Customer, SaleOrder, Recipe, Quotation, CustomerActivity,
  PurchaseOrder, Dispatch, Expense, Opportunity, PriceList, Supplier, Return, Payment, InventoryMovement,
} from '../data/mockData'
import { toast } from '../components/Toast'

export type NotifCategory = 'inventory' | 'purchases' | 'sales' | 'crm' | 'production' | 'dispatch' | 'general'

export interface Notification {
  id: string
  type: 'warning' | 'info' | 'success' | 'error'
  category: NotifCategory
  message: string
  timestamp: Date
  read: boolean
  link?: string
}

export type CalendarItemKind = 'meeting' | 'reminder'

export interface CalendarItem {
  id: string
  kind: CalendarItemKind
  title: string
  description?: string
  location?: string
  date: string         // YYYY-MM-DD
  time?: string        // HH:MM (24h)
  reminderMinutes?: number   // minutes before event to notify
  notifyApp: boolean
  notifyWhatsapp: boolean
  whatsappPhone?: string     // E.164 / digits only
  notifiedAt?: string        // ISO timestamp when reminder fired
  done?: boolean
}

export interface AuthUser {
  name: string
  email: string
  role: string
}

export interface CompanySettings {
  companyName: string
  slogan: string
  email: string
  phone: string
  address: string
  currency: string
  timezone: string
  logo: string | null
  // Invoice / factura fields
  bankName: string
  bankKey: string
  bankAccountType: string
  bankAccountNumber: string
  bankMessage: string
  tiktok: string
  whatsapp: string
  instagram: string
  instagramHandle: string
  // SMTP / email
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpFrom: string
  resendApiKey: string
  invoicePrefix: string
}

interface AppState {
  // Data
  supplies:         Supply[]
  products:         Product[]
  productionOrders: ProductionOrder[]
  customers:        Customer[]
  saleOrders:       SaleOrder[]
  recipes:          Recipe[]
  quotations:       Quotation[]
  activities:       CustomerActivity[]
  purchaseOrders:   PurchaseOrder[]
  dispatches:       Dispatch[]
  expenses:         Expense[]
  opportunities:    Opportunity[]
  priceLists:       PriceList[]
  suppliers:        Supplier[]
  returns:          Return[]
  payments:         Payment[]
  inventoryMovements: InventoryMovement[]
  // Company settings
  companySettings:  CompanySettings
  // UI
  sidebarOpen: boolean
  darkMode:    boolean
  dataLoaded:  boolean
  // Auth
  isAuthenticated: boolean
  user: AuthUser | null
  lastActivity: number
  // Notifications
  notifications: Notification[]
  // Calendar items (meetings & reminders)
  calendarItems: CalendarItem[]
  // Actions – data loading
  loadAllData: (force?: boolean) => Promise<void>
  // Actions – UI
  setSidebarOpen: (v: boolean) => void
  toggleDarkMode: () => void
  // Actions – auth
  login:        (user: AuthUser) => void
  logout:       () => void
  touchSession: () => void
  // Actions – notifications
  addNotification:  (n: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void
  checkAlerts:      () => void
  markAsRead:       (id: string) => void
  markAllAsRead:    () => void
  clearNotifications: () => void
  // Actions – calendar items
  loadCalendarItems:  () => Promise<void>
  addCalendarItem:    (i: Omit<CalendarItem, 'id' | 'notifiedAt'>) => Promise<void>
  updateCalendarItem: (i: CalendarItem) => Promise<void>
  deleteCalendarItem: (id: string) => Promise<void>
  toggleCalendarItemDone: (id: string) => Promise<void>
  checkCalendarReminders: () => void
  // Actions – business data
  updateProductionOrderStatus: (id: string, status: ProductionOrder['status']) => void
  addSupply:    (s: Supply)    => Promise<void>
  updateSupply: (s: Supply)    => Promise<void>
  deleteSupply: (id: string)   => Promise<void>
  addProduct:   (p: Product)   => Promise<void>
  updateProduct:(p: Product)   => Promise<void>
  deleteProduct:(id: string)   => Promise<void>
  addCustomer:  (c: Customer)  => Promise<void>
  updateCustomer:(c: Customer) => Promise<void>
  deleteCustomer:(id: string)  => Promise<void>
  addSaleOrder:      (o: SaleOrder) => Promise<void>
  updateSaleOrder:   (o: SaleOrder) => Promise<void>
  deleteSaleOrder:   (id: string)   => Promise<void>
  generateInvoice:   (id: string)   => Promise<SaleOrder>
  addProductionOrder: (o: ProductionOrder) => Promise<void>
  deleteProductionOrder:(id: string) => Promise<void>
  addRecipe:    (r: Recipe)  => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
  addQuotation:     (q: Quotation) => Promise<void>
  updateQuotation:  (q: Quotation) => Promise<void>
  deleteQuotation:  (id: string)   => Promise<void>
  convertQuotation: (id: string)   => Promise<void>
  addActivity:      (a: CustomerActivity) => Promise<void>
  updateActivity:   (a: CustomerActivity) => Promise<void>
  deleteActivity:   (id: string)          => Promise<void>
  addPurchaseOrder:     (o: PurchaseOrder) => Promise<void>
  updatePurchaseOrder:  (o: PurchaseOrder) => Promise<void>
  deletePurchaseOrder:  (id: string)       => Promise<void>
  receivePurchaseOrder: (id: string, receivedQty: Record<string, number>) => Promise<void>
  addDispatch:    (d: Dispatch) => Promise<void>
  updateDispatch: (d: Dispatch) => Promise<void>
  deleteDispatch: (id: string)  => Promise<void>
  addExpense:     (e: Expense)  => Promise<void>
  updateExpense:  (e: Expense)  => Promise<void>
  deleteExpense:  (id: string)  => Promise<void>
  addOpportunity:    (o: Opportunity) => Promise<void>
  updateOpportunity: (o: Opportunity) => Promise<void>
  deleteOpportunity: (id: string)     => Promise<void>
  // Actions – payments
  addPayment:    (p: Payment) => Promise<void>
  deletePayment: (id: string) => Promise<void>
  getOrderPayments: (saleOrderId: string) => Payment[]
  // Actions – suppliers
  addSupplier:    (s: Supplier) => Promise<void>
  updateSupplier: (s: Supplier) => Promise<void>
  deleteSupplier: (id: string)  => Promise<void>
  // Actions – returns
  addReturn:    (r: Return) => Promise<void>
  updateReturn: (r: Return) => Promise<void>
  deleteReturn: (id: string) => Promise<void>
  // Actions – inventory movements
  addInventoryMovement: (m: InventoryMovement) => Promise<void>
  loadInventoryMovements: () => Promise<void>
  // Actions – price lists
  addPriceList:    (p: PriceList) => Promise<void>
  updatePriceList: (p: PriceList) => Promise<void>
  deletePriceList: (id: string)   => Promise<void>
  // Actions – company settings
  saveCompanySettings: (s: CompanySettings) => Promise<void>
  // Actions – factory reset
  factoryReset: () => Promise<void>
}

// ── localStorage helpers (solo para auth, theme, notifications, logo) ────────

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch { return fallback }
}

function lsSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* noop */ }
}

const getAuth = (): { isAuthenticated: boolean; user: AuthUser | null } => {
  try {
    const raw = localStorage.getItem('erp_auth')
    if (!raw) return { isAuthenticated: false, user: null }
    return { isAuthenticated: true, user: JSON.parse(raw) }
  } catch { return { isAuthenticated: false, user: null } }
}

const getNotifications = (): Notification[] => {
  try {
    const raw = localStorage.getItem('erp_notifications')
    if (!raw) return []
    return JSON.parse(raw).map((n: Notification) => ({ ...n, timestamp: new Date(n.timestamp), category: n.category ?? 'general' }))
  } catch { return [] }
}

const getCalendarItems = (): CalendarItem[] => {
  try {
    const raw = localStorage.getItem('erp_calendar_items')
    if (!raw) return []
    return JSON.parse(raw) as CalendarItem[]
  } catch { return [] }
}

const getDarkMode = (): boolean => localStorage.getItem('erp_theme') === 'dark'

if (getDarkMode()) document.documentElement.classList.add('dark')

// ── API helpers ──────────────────────────────────────────────────────────────

function getUserHeader(): Record<string, string> {
  try {
    const raw = localStorage.getItem('erp_auth')
    return raw ? { 'x-user': raw } : {}
  } catch { return {} }
}

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...getUserHeader() },
    ...options,
  })
  if (!res.ok) throw new Error(`API error ${res.status}: ${await res.text()}`)
  return res.json()
}

// ── Initial state ────────────────────────────────────────────────────────────

const initialAuth          = getAuth()
const initialNotifications = getNotifications()
const initialCalendarItems = getCalendarItems()
const initialDark          = getDarkMode()

const defaultCompanySettings: CompanySettings = {
  companyName: 'Amazonia Concrete',
  slogan: 'Belleza natural en concreto',
  email: '',
  phone: '',
  address: '',
  currency: 'COP',
  timezone: 'America/Bogota',
  logo: lsGet<string | null>('erp_logo', null),
  bankName: 'Bancolombia',
  bankKey: '',
  bankAccountType: 'Cuenta Ahorros',
  bankAccountNumber: '',
  bankMessage: '',
  tiktok: '',
  whatsapp: '',
  instagram: '',
  instagramHandle: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  smtpFrom: '',
  resendApiKey: '',
  invoicePrefix: 'VTA',
}

export const useStore = create<AppState>((set, get) => ({
  supplies:         [],
  products:         [],
  productionOrders: [],
  customers:        [],
  saleOrders:       [],
  recipes:          [],
  quotations:       [],
  activities:       [],
  purchaseOrders:   [],
  dispatches:       [],
  expenses:         [],
  opportunities:    [],
  priceLists:       [],
  suppliers:        [],
  returns:          [],
  payments:         [],
  inventoryMovements: [],
  companySettings:  defaultCompanySettings,
  sidebarOpen:      true,
  darkMode:         initialDark,
  dataLoaded:       false,
  isAuthenticated:  initialAuth.isAuthenticated,
  user:             initialAuth.user,
  lastActivity:     Date.now(),
  notifications:    initialNotifications,
  calendarItems:    initialCalendarItems,

  // ── Load all data from API ─────────────────────────────────────────────────
  loadAllData: async (force = false) => {
    if (get().dataLoaded && !force) return
    if (force) set({ dataLoaded: false })
    try {
      const [supplies, products, productionOrders, customers, saleOrders, recipes, settings, quotations, activities, purchaseOrders, dispatches, expenses, opportunities, priceLists, suppliers, returns, payments, inventoryMovements] =
        await Promise.all([
          apiFetch<Supply[]>('/api/supplies'),
          apiFetch<Product[]>('/api/products'),
          apiFetch<ProductionOrder[]>('/api/production-orders'),
          apiFetch<Customer[]>('/api/customers'),
          apiFetch<SaleOrder[]>('/api/sale-orders'),
          apiFetch<Recipe[]>('/api/recipes'),
          apiFetch<Partial<CompanySettings>>('/api/settings'),
          apiFetch<Quotation[]>('/api/quotations'),
          apiFetch<CustomerActivity[]>('/api/customer-activities'),
          apiFetch<PurchaseOrder[]>('/api/purchase-orders'),
          apiFetch<Dispatch[]>('/api/dispatches'),
          apiFetch<Expense[]>('/api/expenses'),
          apiFetch<Opportunity[]>('/api/opportunities'),
          apiFetch<PriceList[]>('/api/price-lists').catch(() => [] as PriceList[]),
          apiFetch<Supplier[]>('/api/suppliers').catch(() => [] as Supplier[]),
          apiFetch<Return[]>('/api/returns').catch(() => [] as Return[]),
          apiFetch<Payment[]>('/api/payments').catch(() => [] as Payment[]),
          apiFetch<InventoryMovement[]>('/api/inventory-movements').catch(() => [] as InventoryMovement[]),
        ])

      // Calendar items load (best-effort, separate so we can ignore failures)
      get().loadCalendarItems().catch(() => {})

      const companySettings: CompanySettings = {
        companyName:        settings.companyName        ?? defaultCompanySettings.companyName,
        slogan:             settings.slogan             ?? defaultCompanySettings.slogan,
        email:              settings.email              ?? defaultCompanySettings.email,
        phone:              settings.phone              ?? defaultCompanySettings.phone,
        address:            settings.address            ?? defaultCompanySettings.address,
        currency:           settings.currency           ?? defaultCompanySettings.currency,
        timezone:           settings.timezone           ?? defaultCompanySettings.timezone,
        logo:               settings.logo               ?? lsGet<string | null>('erp_logo', null),
        bankName:           settings.bankName           ?? defaultCompanySettings.bankName,
        bankKey:            settings.bankKey            ?? defaultCompanySettings.bankKey,
        bankAccountType:    settings.bankAccountType    ?? defaultCompanySettings.bankAccountType,
        bankAccountNumber:  settings.bankAccountNumber  ?? defaultCompanySettings.bankAccountNumber,
        bankMessage:        settings.bankMessage        ?? defaultCompanySettings.bankMessage,
        tiktok:             settings.tiktok             ?? defaultCompanySettings.tiktok,
        whatsapp:           settings.whatsapp           ?? defaultCompanySettings.whatsapp,
        instagram:          settings.instagram          ?? defaultCompanySettings.instagram,
        instagramHandle:    settings.instagramHandle    ?? defaultCompanySettings.instagramHandle,
        smtpHost:           settings.smtpHost           ?? defaultCompanySettings.smtpHost,
        smtpPort:           settings.smtpPort           ?? defaultCompanySettings.smtpPort,
        smtpUser:           settings.smtpUser           ?? defaultCompanySettings.smtpUser,
        smtpPass:           settings.smtpPass           ?? defaultCompanySettings.smtpPass,
        smtpFrom:           settings.smtpFrom           ?? defaultCompanySettings.smtpFrom,
        resendApiKey:       settings.resendApiKey       ?? defaultCompanySettings.resendApiKey,
        invoicePrefix:      settings.invoicePrefix      ?? defaultCompanySettings.invoicePrefix,
      }

      set({ supplies, products, productionOrders, customers, saleOrders, recipes, quotations, activities, purchaseOrders, dispatches, expenses, opportunities, priceLists, suppliers, returns, payments, inventoryMovements, companySettings, dataLoaded: true })
      // Run smart alerts after data is ready
      get().checkAlerts()
      get().checkCalendarReminders()
    } catch (e) {
      console.error('No se pudo conectar con el servidor:', e)
      toast.error('Error al conectar con el servidor')
    }
  },

  // ── UI ─────────────────────────────────────────────────────────────────────
  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  toggleDarkMode: () =>
    set((s) => {
      const next = !s.darkMode
      if (next) {
        document.documentElement.classList.add('dark')
        localStorage.setItem('erp_theme', 'dark')
      } else {
        document.documentElement.classList.remove('dark')
        localStorage.setItem('erp_theme', 'light')
      }
      return { darkMode: next }
    }),

  // ── Auth ───────────────────────────────────────────────────────────────────
  login: (user) => {
    localStorage.setItem('erp_auth', JSON.stringify(user))
    set({ isAuthenticated: true, user, lastActivity: Date.now() })
  },

  logout: () => {
    localStorage.removeItem('erp_auth')
    set({ isAuthenticated: false, user: null, dataLoaded: false, lastActivity: 0 })
  },

  touchSession: () => set({ lastActivity: Date.now() }),

  // ── Notifications ──────────────────────────────────────────────────────────
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

  // ── Calendar items (meetings & reminders) ─────────────────────────────────
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
    try {
      await apiFetch('/api/calendar-items', { method: 'POST', body: JSON.stringify(newItem) })
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
    setTimeout(() => get().checkCalendarReminders(), 0)
  },

  updateCalendarItem: async (item) => {
    try {
      await apiFetch(`/api/calendar-items/${item.id}`, { method: 'PUT', body: JSON.stringify(item) })
    } catch (e) { toast.error('No se pudo actualizar'); return }
    set((s) => {
      const updated = s.calendarItems.map((x) => x.id === item.id ? item : x)
      lsSet('erp_calendar_items', updated)
      return { calendarItems: updated }
    })
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
    const todayISO = new Date().toISOString().split('T')[0]
    let mutated = false
    const updatedItems = s.calendarItems.map((it) => {
      if (it.done || it.notifiedAt || !it.notifyApp) return it
      const t = it.time || '09:00'
      const eventMs = new Date(`${it.date}T${t}:00`).getTime()
      if (Number.isNaN(eventMs)) return it
      const lead = (it.reminderMinutes ?? 15) * 60 * 1000
      if (now >= eventMs - lead) {
        const label = it.kind === 'meeting' ? 'Reunión' : 'Recordatorio'
        const when = it.time ? ` a las ${it.time}` : ''
        const link = it.notifyWhatsapp && it.whatsappPhone
          ? `https://wa.me/${it.whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`${label}: ${it.title}${when} (${it.date})${it.description ? ' — ' + it.description : ''}`)}`
          : '/calendar'
        s.addNotification({
          type: 'info',
          category: 'general',
          message: `${label}: ${it.title}${when}`,
          link,
        })
        mutated = true
        return { ...it, notifiedAt: new Date().toISOString() }
      }
      return it
    })

    // Daily agenda summary — fire once per day if there are any items today
    const lastAgenda = localStorage.getItem('erp_last_agenda_date')
    if (lastAgenda !== todayISO) {
      const todayItems = updatedItems.filter((i) => i.date === todayISO && !i.done)
      if (todayItems.length > 0) {
        const summary = todayItems
          .map((i) => `• ${i.time ? i.time + ' ' : ''}${i.kind === 'meeting' ? '📅' : '🔔'} ${i.title}`)
          .join('\n')
        const phone = s.companySettings.whatsapp?.replace(/\D/g, '') || ''
        const waLink = phone
          ? `https://wa.me/${phone}?text=${encodeURIComponent(`Tu agenda de hoy (${todayISO}):\n${summary}`)}`
          : '/calendar'
        s.addNotification({
          type: 'info',
          category: 'general',
          message: `Tienes ${todayItems.length} evento${todayItems.length > 1 ? 's' : ''} agendado${todayItems.length > 1 ? 's' : ''} hoy`,
          link: waLink,
        })
      }
      localStorage.setItem('erp_last_agenda_date', todayISO)
    }

    if (mutated) {
      lsSet('erp_calendar_items', updatedItems)
      set({ calendarItems: updatedItems })
    }
  },

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

  addSupply: async (supply) => {
    await apiFetch('/api/supplies', { method: 'POST', body: JSON.stringify(supply) })
    set((s) => ({ supplies: [...s.supplies, supply] }))
    toast.success('Insumo creado correctamente')
  },
  updateSupply: async (supply) => {
    await apiFetch(`/api/supplies/${supply.id}`, { method: 'PUT', body: JSON.stringify(supply) })
    set((s) => ({ supplies: s.supplies.map((x) => x.id === supply.id ? supply : x) }))
    toast.success('Insumo actualizado')
  },
  deleteSupply: async (id) => {
    await apiFetch(`/api/supplies/${id}`, { method: 'DELETE' })
    set((s) => ({ supplies: s.supplies.filter((x) => x.id !== id) }))
    toast.success('Insumo eliminado')
  },

  addProduct: async (product) => {
    await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(product) })
    set((s) => ({ products: [...s.products, product] }))
    toast.success('Producto creado correctamente')
  },
  updateProduct: async (product) => {
    await apiFetch(`/api/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) })
    set((s) => ({ products: s.products.map((x) => x.id === product.id ? product : x) }))
    toast.success('Producto actualizado')
  },
  deleteProduct: async (id) => {
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' })
    set((s) => ({ products: s.products.filter((x) => x.id !== id) }))
    toast.success('Producto eliminado')
  },

  addCustomer: async (customer) => {
    await apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(customer) })
    set((s) => ({ customers: [...s.customers, customer] }))
    toast.success('Cliente creado correctamente')
  },
  updateCustomer: async (customer) => {
    await apiFetch(`/api/customers/${customer.id}`, { method: 'PUT', body: JSON.stringify(customer) })
    set((s) => ({ customers: s.customers.map((x) => x.id === customer.id ? customer : x) }))
    toast.success('Cliente actualizado')
  },
  deleteCustomer: async (id) => {
    await apiFetch(`/api/customers/${id}`, { method: 'DELETE' })
    set((s) => ({ customers: s.customers.filter((x) => x.id !== id) }))
    toast.success('Cliente eliminado')
  },

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
    // Sequential number = existing invoices + 1
    const existing = s.saleOrders.filter((x) => x.invoiceNumber).length
    const year     = new Date().getFullYear()
    const prefix   = s.companySettings.invoicePrefix?.replace('VTA', 'FAC') || 'FAC'
    const invoiceNumber = `${prefix}-${year}-${String(existing + 1).padStart(4, '0')}`
    const invoiceDate   = new Date().toISOString().split('T')[0]
    const updated: SaleOrder = { ...order, invoiceNumber, invoiceDate }
    await apiFetch(`/api/sale-orders/${id}`, { method: 'PUT', body: JSON.stringify(updated) })
    set((s2) => ({ saleOrders: s2.saleOrders.map((x) => x.id === id ? updated : x) }))
    return updated
  },

  addProductionOrder: async (order) => {
    await apiFetch('/api/production-orders', { method: 'POST', body: JSON.stringify(order) })
    set((s) => ({ productionOrders: [...s.productionOrders, order] }))
  },
  deleteProductionOrder: async (id) => {
    await apiFetch(`/api/production-orders/${id}`, { method: 'DELETE' })
    set((s) => ({ productionOrders: s.productionOrders.filter((x) => x.id !== id) }))
  },

  addRecipe: async (recipe) => {
    await apiFetch('/api/recipes', { method: 'POST', body: JSON.stringify(recipe) })
    set((s) => ({ recipes: [...s.recipes, recipe] }))
  },
  deleteRecipe: async (id) => {
    await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' })
    set((s) => ({ recipes: s.recipes.filter((x) => x.id !== id) }))
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
    const order: SaleOrder = {
      id: `so${Date.now()}`,
      orderNumber: `${s.companySettings.invoicePrefix || 'VTA'}-${new Date().getFullYear()}-${String(s.saleOrders.length + 1).padStart(4, '0')}`,
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

  addActivity: async (activity) => {
    await apiFetch('/api/customer-activities', { method: 'POST', body: JSON.stringify(activity) })
    set((s) => ({ activities: [activity, ...s.activities] }))
  },
  updateActivity: async (activity) => {
    await apiFetch(`/api/customer-activities/${activity.id}`, { method: 'PUT', body: JSON.stringify(activity) })
    set((s) => ({ activities: s.activities.map((x) => x.id === activity.id ? activity : x) }))
  },
  deleteActivity: async (id) => {
    await apiFetch(`/api/customer-activities/${id}`, { method: 'DELETE' })
    set((s) => ({ activities: s.activities.filter((x) => x.id !== id) }))
  },

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

    set(() => ({ purchaseOrders: s.purchaseOrders.map((x) => x.id === id ? updated : x), supplies: updatedSupplies }))
    // Re-run alerts: stock levels changed after receiving
    setTimeout(() => get().checkAlerts(), 0)
  },

  addDispatch: async (d) => {
    await apiFetch('/api/dispatches', { method: 'POST', body: JSON.stringify(d) })
    set((s) => ({ dispatches: [d, ...s.dispatches] }))
    toast.success('Despacho creado')
  },
  updateDispatch: async (d) => {
    await apiFetch(`/api/dispatches/${d.id}`, { method: 'PUT', body: JSON.stringify(d) })
    set((s) => ({ dispatches: s.dispatches.map((x) => x.id === d.id ? d : x) }))
    toast.success('Despacho actualizado')
  },
  deleteDispatch: async (id) => {
    await apiFetch(`/api/dispatches/${id}`, { method: 'DELETE' })
    set((s) => ({ dispatches: s.dispatches.filter((x) => x.id !== id) }))
    toast.success('Despacho eliminado')
  },
  addExpense: async (e) => {
    await apiFetch('/api/expenses', { method: 'POST', body: JSON.stringify(e) })
    set((s) => ({ expenses: [e, ...s.expenses] }))
    toast.success('Gasto registrado')
  },
  updateExpense: async (e) => {
    await apiFetch(`/api/expenses/${e.id}`, { method: 'PUT', body: JSON.stringify(e) })
    set((s) => ({ expenses: s.expenses.map((x) => x.id === e.id ? e : x) }))
    toast.success('Gasto actualizado')
  },
  deleteExpense: async (id) => {
    await apiFetch(`/api/expenses/${id}`, { method: 'DELETE' })
    set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) }))
    toast.success('Gasto eliminado')
  },
  addOpportunity: async (o) => {
    await apiFetch('/api/opportunities', { method: 'POST', body: JSON.stringify(o) })
    set((s) => ({ opportunities: [o, ...s.opportunities] }))
    toast.success('Oportunidad creada')
  },
  updateOpportunity: async (o) => {
    await apiFetch(`/api/opportunities/${o.id}`, { method: 'PUT', body: JSON.stringify(o) })
    set((s) => ({ opportunities: s.opportunities.map((x) => x.id === o.id ? o : x) }))
    toast.success('Oportunidad actualizada')
  },
  deleteOpportunity: async (id) => {
    await apiFetch(`/api/opportunities/${id}`, { method: 'DELETE' })
    set((s) => ({ opportunities: s.opportunities.filter((x) => x.id !== id) }))
    toast.success('Oportunidad eliminada')
  },

  // ── Payments ─────────────────────────────────────────────────────────────
  addPayment: async (payment) => {
    await apiFetch('/api/payments', { method: 'POST', body: JSON.stringify(payment) })
    set((s) => ({ payments: [payment, ...s.payments] }))
    // Update the sale order payment status locally
    if (payment.saleOrderId) {
      const s = get()
      const orderPayments = [...s.payments.filter(p => p.saleOrderId === payment.saleOrderId), payment]
      const totalPaid = orderPayments.reduce((sum, p) => sum + p.amount, 0)
      const order = s.saleOrders.find(o => o.id === payment.saleOrderId)
      if (order) {
        const newStatus = totalPaid >= order.total ? 'paid' : totalPaid > 0 ? 'partial' : 'pending'
        set((s2) => ({ saleOrders: s2.saleOrders.map(o => o.id === payment.saleOrderId ? { ...o, paymentStatus: newStatus } : o) }))
      }
    }
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

  // ── Suppliers ────────────────────────────────────────────────────────────
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

  // ── Returns ─────────────────────────────────────────────────────────────
  addReturn: async (r) => {
    await apiFetch('/api/returns', { method: 'POST', body: JSON.stringify(r) })
    set((st) => ({ returns: [r, ...st.returns] }))
    toast.success('Devolución registrada')
  },
  updateReturn: async (r) => {
    await apiFetch(`/api/returns/${r.id}`, { method: 'PUT', body: JSON.stringify(r) })
    set((st) => ({ returns: st.returns.map((x) => x.id === r.id ? r : x) }))
    toast.success('Devolución actualizada')
  },
  deleteReturn: async (id) => {
    await apiFetch(`/api/returns/${id}`, { method: 'DELETE' })
    set((st) => ({ returns: st.returns.filter((x) => x.id !== id) }))
    toast.success('Devolución eliminada')
  },

  // ── Inventory movements ──────────────────────────────────────────────────
  addInventoryMovement: async (m) => {
    await apiFetch('/api/inventory-movements', { method: 'POST', body: JSON.stringify(m) })
    set((st) => ({ inventoryMovements: [m, ...st.inventoryMovements] }))
  },
  loadInventoryMovements: async () => {
    const data = await apiFetch<InventoryMovement[]>('/api/inventory-movements').catch(() => [] as InventoryMovement[])
    set({ inventoryMovements: data })
  },

  // ── Price lists ───────────────────────────────────────────────────────────
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
  },

  // ── Factory reset ──────────────────────────────────────────────────────────
  factoryReset: async () => {
    await apiFetch('/api/reset', { method: 'DELETE' })
    // Clear all localStorage keys used by the app
    ;['erp_auth', 'erp_notifications', 'erp_theme', 'erp_logo', 'erp_calendar_items', 'erp_last_agenda_date'].forEach((k) =>
      localStorage.removeItem(k)
    )
    // Reset store to blank state (keep page alive, logout will redirect)
    set({
      supplies: [], products: [], productionOrders: [],
      customers: [], saleOrders: [], recipes: [], quotations: [], activities: [], purchaseOrders: [], priceLists: [], suppliers: [], returns: [], payments: [], inventoryMovements: [],
      companySettings: defaultCompanySettings,
      notifications: [],
      calendarItems: [],
      dataLoaded: false,
      isAuthenticated: false,
      user: null,
    })
  },

  // ── Company settings ───────────────────────────────────────────────────────
  saveCompanySettings: async (settings) => {
    await apiFetch('/api/settings', { method: 'PUT', body: JSON.stringify(settings) })
    lsSet('erp_logo', settings.logo)
    set({ companySettings: settings })
    toast.success('Configuración guardada')
  },
}))
