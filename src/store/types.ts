// ─────────────────────────────────────────────────────────────────────────────
// Shared domain value types used across the store slices (src/store/slices/*).
// Pure data shapes — no state, no actions. Those live next to the slice that
// owns them (see slices/*Slice.ts).
// ─────────────────────────────────────────────────────────────────────────────

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
  token?: string
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
  monthlyGoal: number
  taxRate: number  // IVA rate as decimal (0.19 = 19%)
  paymentMethods: { id: string; name: string; isActive: boolean }[]
  taxRates: { id: string; name: string; rate: number; isDefault: boolean; isActive: boolean }[]
  // Equipo de trabajo — nombres editables de vendedores, producción y conductores
  teamMembers: TeamMember[]
}

// Roles del equipo que alimentan los selectores de la app (vendedor asignado,
// operario de producción, conductor de despacho).
export type TeamRole = 'seller' | 'production' | 'driver'
export interface TeamMember {
  id: string
  name: string
  role: TeamRole
  isActive: boolean
}

// Result the calendar API returns after attempting an immediate WhatsApp send.
export type WhatsAppSendResult = { sent: boolean; error?: string; status?: string }
