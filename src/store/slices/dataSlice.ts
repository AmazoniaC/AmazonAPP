import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type {
  Supply, Product, ProductionOrder, Customer, SaleOrder, Recipe, Quotation, CustomerActivity,
  PurchaseOrder, Dispatch, Expense, Opportunity, PriceList, Supplier, Return, Payment, InventoryMovement,
} from '../../data/mockData'
import type { CompanySettings } from '../types'
import { defaultCompanySettings } from '../defaults'
import { lsGet } from '../persist'
import { apiFetch } from '../api'
import { toast } from '../../components/Toast'

export interface DataSlice {
  dataLoaded: boolean
  loadAllData: (force?: boolean) => Promise<void>
  factoryReset: () => Promise<void>
}

export const createDataSlice: StateCreator<AppState, [], [], DataSlice> = (set, get) => ({
  dataLoaded: false,

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
        invoicePrefix:      settings.invoicePrefix      ?? defaultCompanySettings.invoicePrefix,
        monthlyGoal:        settings.monthlyGoal        ?? defaultCompanySettings.monthlyGoal,
        taxRate:            settings.taxRate            ?? defaultCompanySettings.taxRate,
        paymentMethods:     settings.paymentMethods     ?? defaultCompanySettings.paymentMethods,
        taxRates:           settings.taxRates           ?? defaultCompanySettings.taxRates,
        teamMembers:        settings.teamMembers        ?? defaultCompanySettings.teamMembers,
        carteraAutoReminders: settings.carteraAutoReminders ?? defaultCompanySettings.carteraAutoReminders,
        carteraReminderDays:  settings.carteraReminderDays  ?? defaultCompanySettings.carteraReminderDays,
        quoteAutoFollowup: settings.quoteAutoFollowup ?? defaultCompanySettings.quoteAutoFollowup,
        quoteFollowupDays: settings.quoteFollowupDays ?? defaultCompanySettings.quoteFollowupDays,
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

  // ── Factory reset ──────────────────────────────────────────────────────────
  factoryReset: async () => {
    await apiFetch('/api/reset', { method: 'DELETE' })
    // Clear all localStorage keys used by the app
    ;['erp_auth', 'erp_notifications', 'erp_theme', 'erp_logo', 'erp_calendar_items', 'erp_last_agenda_date', 'erp_calendar_inapp_delivered'].forEach((k) =>
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
})
