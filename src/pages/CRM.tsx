import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Search, X, Users, TrendingUp, Star, Phone, Mail, MapPin,
  MessageCircle, Send, Pencil, Trash2, FileSpreadsheet,
  PhoneCall, AtSign, Navigation, StickyNote, CheckCircle2, Circle,
  FileText, ShoppingBag, Activity, Info, Clock, Heart, Repeat, AlertCircle, Upload,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Customer, CustomerActivity, Quotation } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmDelete from '../components/ConfirmDelete'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { formatCOP } from '../utils/currency'
import * as XLSX from 'xlsx'
import ImportModal from '../components/ImportModal'
import { openWhatsApp, buildFollowUp, buildPaymentReminder, getBankInfo } from '../utils/whatsapp'

// ── Constants ──────────────────────────────────────────────────────────────

const SEG_BADGE: Record<string, string> = {
  vip: 'badge-purple', mayorista: 'badge-blue', regular: 'badge-gray',
}
const SEG_LABELS: Record<string, string> = {
  vip: 'VIP', mayorista: 'Mayorista', regular: 'Regular',
}

const ACTIVITY_META: Record<CustomerActivity['type'], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  call:     { label: 'Llamada',  icon: PhoneCall,  color: 'text-blue-600 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-900/30' },
  email:    { label: 'Email',    icon: AtSign,     color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
  visit:    { label: 'Visita',   icon: Navigation, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  note:     { label: 'Nota',     icon: StickyNote, color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/30' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/30' },
}

const QUOTE_STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', sent: 'Enviada', accepted: 'Aceptada', rejected: 'Rechazada', expired: 'Vencida',
}
const QUOTE_STATUS_BADGE: Record<string, string> = {
  draft: 'badge-gray', sent: 'badge-blue', accepted: 'badge-green', rejected: 'badge-red', expired: 'badge-yellow',
}

// ── CustomerModal ──────────────────────────────────────────────────────────

function CustomerModal({ customer, onClose }: { customer?: Customer; onClose: () => void }) {
  const { addCustomer, updateCustomer, customers, priceLists } = useStore()
  const [form, setForm] = useState<Partial<Customer>>(customer ?? {
    code: `CLI-${String(customers.length + 1).padStart(4, '0')}`, name: '', company: '',
    email: '', phone: '', city: '', segment: 'regular', isActive: true,
    totalPurchases: 0, lastPurchase: new Date().toISOString().split('T')[0], notes: '',
  })

  const field = (k: keyof Customer, label: string, type = 'text') => (
    <div key={k}>
      <label className="label">{label}</label>
      <input className="input" type={type} value={String(form[k] ?? '')}
        onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
          <h3 className="font-semibold text-slate-800 dark:text-white">{customer ? 'Editar cliente' : 'Nuevo cliente'}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {field('name', 'Nombre completo *')}
          {field('company', 'Empresa')}
          {field('email', 'Correo electrónico', 'email')}
          {field('phone', 'Teléfono')}
          {field('city', 'Ciudad')}
          <div>
            <label className="label">Segmento</label>
            <select className="input" value={String(form.segment ?? 'regular')}
              onChange={(e) => setForm({ ...form, segment: e.target.value })}>
              {['regular', 'mayorista', 'vip'].map((s) => <option key={s} value={s}>{SEG_LABELS[s]}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Lista de precios</label>
            <select className="input" value={String(form.priceListId ?? '')}
              onChange={(e) => setForm({ ...form, priceListId: e.target.value || undefined })}>
              <option value="">— Sin lista —</option>
              {priceLists.filter(pl => pl.isActive).map((pl) => <option key={pl.id} value={pl.id}>{pl.name} ({pl.discountPercent}%)</option>)}
            </select>
          </div>
          <div>
            <label className="label">Descuento fijo (%)</label>
            <input className="input" type="number" min="0" max="100" step="0.5"
              value={form.defaultDiscount ?? ''}
              onChange={(e) => setForm({ ...form, defaultDiscount: parseFloat(e.target.value) || undefined })}
              placeholder="ej. 10" />
          </div>
          <div className="col-span-2">
            <label className="label">Notas internas</label>
            <textarea className="input resize-none" rows={3} placeholder="Observaciones, preferencias..."
              value={String(form.notes ?? '')}
              onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={() => {
            if (!form.name) return
            if (customer) updateCustomer({ ...customer, ...form } as Customer)
            else addCustomer({ ...(form as Customer), id: `c${Date.now()}` })
            onClose()
          }}>
            {customer ? 'Actualizar' : 'Crear cliente'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── CustomerCard ───────────────────────────────────────────────────────────

function CustomerCard({ customer, totalPurchases, pendingActivities, onClick, onEdit, onDelete, canEdit, canDelete }: {
  customer: Customer; totalPurchases: number; pendingActivities: number; onClick: () => void
  onEdit: () => void; onDelete: () => void; canEdit: boolean; canDelete: boolean
}) {
  return (
    <div className="card p-5 hover:border-blue-200 dark:hover:border-blue-700 border border-transparent transition-all cursor-pointer"
      onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            {pendingActivities > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center">
                {pendingActivities}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{customer.name}</h3>
            {customer.company && <p className="text-xs text-slate-500 dark:text-gray-400">{customer.company}</p>}
          </div>
        </div>
        <span className={`badge ${SEG_BADGE[customer.segment]}`}>{SEG_LABELS[customer.segment]}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
          <Mail size={11} />
          <span className="truncate flex-1">{customer.email}</span>
          {customer.email && (
            <a href={`mailto:${customer.email}`} onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-500 hover:text-blue-600 transition-colors">
              <Send size={11} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
          <Phone size={11} />
          <span className="flex-1">{customer.phone}</span>
          {customer.phone && (
            <a href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
              className="p-1 rounded hover:bg-green-50 dark:hover:bg-green-900/30 text-green-500 hover:text-green-600 transition-colors">
              <MessageCircle size={11} />
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
          <MapPin size={11} /><span>{customer.city}</span>
        </div>
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400 dark:text-gray-500">Total compras</p>
          <p className="font-bold text-slate-800 dark:text-white">{formatCOP(totalPurchases)}</p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <button className="btn btn-sm btn-secondary flex items-center gap-1"
              onClick={(e) => { e.stopPropagation(); onEdit() }}>
              <Pencil size={12} /> Editar
            </button>
          )}
          {canDelete && (
            <button className="btn btn-sm flex items-center gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
              onClick={(e) => { e.stopPropagation(); onDelete() }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── AddActivityForm ────────────────────────────────────────────────────────

function AddActivityForm({ customerId, onDone }: { customerId: string; onDone: () => void }) {
  const { addActivity } = useStore()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<{
    type: CustomerActivity['type']; date: string; subject: string; notes: string
  }>({ type: 'call', date: today, subject: '', notes: '' })

  const handleSave = async () => {
    if (!form.subject.trim()) return
    await addActivity({
      id: `a${Date.now()}`,
      customerId,
      type: form.type,
      date: form.date,
      subject: form.subject.trim(),
      notes: form.notes.trim() || undefined,
      done: false,
      createdAt: new Date().toISOString(),
    })
    onDone()
  }

  return (
    <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4 border border-slate-200 dark:border-gray-600 space-y-3">
      <div className="flex gap-2 flex-wrap">
        {(Object.keys(ACTIVITY_META) as CustomerActivity['type'][]).map((t) => {
          const meta = ACTIVITY_META[t]
          const Icon = meta.icon
          return (
            <button key={t} onClick={() => setForm({ ...form, type: t })}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                form.type === t
                  ? `${meta.bg} ${meta.color} border-current`
                  : 'bg-white dark:bg-gray-700 text-slate-500 dark:text-gray-400 border-slate-200 dark:border-gray-600'
              }`}>
              <Icon size={12} /> {meta.label}
            </button>
          )
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2">
          <input className="input text-sm" placeholder="Asunto *" value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })} />
        </div>
        <div>
          <input className="input text-sm" type="date" value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </div>
        <div>
          <textarea className="input text-sm resize-none" rows={1} placeholder="Notas (opcional)"
            value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn btn-sm btn-secondary" onClick={onDone}>Cancelar</button>
        <button className="btn btn-sm btn-primary" onClick={handleSave}>Guardar seguimiento</button>
      </div>
    </div>
  )
}

// ── CustomerDrawer ─────────────────────────────────────────────────────────

type DrawerTab = 'info' | 'history' | 'quotations' | 'activities'

function CustomerDrawer({ customer, onClose, onEdit, onDelete, canEdit, canDelete }: {
  customer: Customer
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  canEdit: boolean
  canDelete: boolean
}) {
  const { saleOrders, quotations, activities, updateActivity, deleteActivity, companySettings } = useStore()
  const [tab, setTab] = useState<DrawerTab>('info')
  const [showAddActivity, setShowAddActivity] = useState(false)

  const customerStats = useMemo(() => {
    let total = 0; let lastDate: string | null = null
    for (const o of saleOrders.filter((o) => o.customerId === customer.id)) {
      total += o.total
      if (!lastDate || o.date > lastDate) lastDate = o.date
    }
    const orders = saleOrders.filter((o) => o.customerId === customer.id)
    return { total, lastDate, orderCount: orders.length, pendingBalance: orders.filter((o) => o.paymentStatus !== 'paid').reduce((s, o) => s + o.total, 0) }
  }, [saleOrders, customer.id])

  const customerQuotes = useMemo(() =>
    quotations.filter((q) => q.customerId === customer.id).sort((a, b) => b.date.localeCompare(a.date)),
    [quotations, customer.id]
  )

  const customerActivities = useMemo(() =>
    activities.filter((a) => a.customerId === customer.id).sort((a, b) => b.date.localeCompare(a.date)),
    [activities, customer.id]
  )

  const pendingCount = customerActivities.filter((a) => !a.done).length

  const tabs: { id: DrawerTab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'info',        label: 'Info',         icon: Info },
    { id: 'history',     label: 'Compras',       icon: ShoppingBag,   count: customerStats.orderCount },
    { id: 'quotations',  label: 'Cotizaciones',  icon: FileText,      count: customerQuotes.length },
    { id: 'activities',  label: 'Seguimientos',  icon: Activity,      count: pendingCount || undefined },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50">
      <div className="bg-white dark:bg-gray-800 w-full max-w-md h-full overflow-y-auto animate-slideIn flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-bold">
                {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-800 dark:text-white truncate">{customer.name}</h3>
              <span className={`badge ${SEG_BADGE[customer.segment]} text-xs`}>{SEG_LABELS[customer.segment]}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            {canEdit && (
              <button className="btn btn-sm btn-secondary flex items-center gap-1" onClick={onEdit}>
                <Pencil size={12} /> Editar
              </button>
            )}
            {canDelete && (
              <button className="btn btn-sm flex items-center gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                onClick={onDelete}>
                <Trash2 size={12} />
              </button>
            )}
            <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-gray-700 border-b border-slate-100 dark:border-gray-700">
          {[
            { label: 'Total compras',  value: formatCOP(customerStats.total) },
            { label: 'Pedidos',        value: String(customerStats.orderCount) },
            { label: 'Saldo pend.',    value: customerStats.pendingBalance > 0 ? formatCOP(customerStats.pendingBalance) : '—' },
          ].map((s) => (
            <div key={s.label} className="px-4 py-3 text-center">
              <p className="text-xs text-slate-400 dark:text-gray-500">{s.label}</p>
              <p className="font-bold text-slate-800 dark:text-white text-sm">{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 dark:border-gray-700 sticky top-[73px] bg-white dark:bg-gray-800 z-10">
          {tabs.map(({ id, label, icon: Icon, count }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
                tab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
              }`}>
              <Icon size={13} />
              {label}
              {count !== undefined && count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  id === 'activities' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300' : 'bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300'
                }`}>{count}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="p-5 flex-1 space-y-5">

          {/* ── Info tab ── */}
          {tab === 'info' && (
            <>
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Contacto</h4>
                {/* Email */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Mail size={14} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 dark:text-gray-500">Email</p>
                    <p className="text-slate-700 dark:text-gray-200 font-medium truncate">{customer.email || '—'}</p>
                  </div>
                  {customer.email && (
                    <a href={`mailto:${customer.email}`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 text-xs font-medium transition-colors flex-shrink-0">
                      <Send size={12} /> Email
                    </a>
                  )}
                </div>
                {/* Phone */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <Phone size={14} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 dark:text-gray-500">Teléfono</p>
                    <p className="text-slate-700 dark:text-gray-200 font-medium">{customer.phone || '—'}</p>
                  </div>
                  {customer.phone && (
                    <a href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
                      target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-100 text-xs font-medium transition-colors flex-shrink-0">
                      <MessageCircle size={12} /> WhatsApp
                    </a>
                  )}
                </div>
                {/* City */}
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <MapPin size={14} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 dark:text-gray-500">Ciudad</p>
                    <p className="text-slate-700 dark:text-gray-200 font-medium">{customer.city || '—'}</p>
                  </div>
                </div>
              </div>

              {/* Last purchase */}
              {customerStats.lastDate && (
                <div className="flex items-center gap-2 text-sm bg-slate-50 dark:bg-gray-700 rounded-xl p-3">
                  <Clock size={14} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 dark:text-gray-500">Última compra</p>
                    <p className="font-medium text-slate-700 dark:text-gray-200">
                      {new Date(customerStats.lastDate + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {customer.notes && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-100 dark:border-amber-800">
                  <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider mb-2">Notas internas</h4>
                  <p className="text-sm text-slate-700 dark:text-gray-200 whitespace-pre-line">{customer.notes}</p>
                </div>
              )}

              {/* WhatsApp Quick Actions */}
              {customer.phone && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Acciones rápidas WhatsApp</h4>
                  <div className="flex flex-col gap-2">
                    {customerStats.lastDate && (
                      <button
                        className="w-full btn flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 text-sm"
                        onClick={() => {
                          const lastOrder = saleOrders.filter(o => o.customerId === customer.id).sort((a,b) => b.date.localeCompare(a.date))[0]
                          openWhatsApp(customer.phone, buildFollowUp({
                            companyName: companySettings.companyName,
                            customer: customer.name,
                            orderNumber: lastOrder?.orderNumber || '—',
                            date: lastOrder?.date || '—',
                          }))
                        }}>
                        <MessageCircle size={14} /> Seguimiento post-venta
                      </button>
                    )}
                    {customerStats.pendingBalance > 0 && (
                      <button
                        className="w-full btn flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 text-sm"
                        onClick={() => {
                          const unpaid = saleOrders.filter(o => o.customerId === customer.id && o.paymentStatus !== 'paid')
                          if (unpaid.length > 0) {
                            openWhatsApp(customer.phone, buildPaymentReminder({
                              companyName: companySettings.companyName,
                              customer: customer.name,
                              orderNumber: unpaid[0].orderNumber,
                              date: unpaid[0].date,
                              total: unpaid[0].total,
                              paymentStatus: unpaid[0].paymentStatus,
                              bankInfo: getBankInfo(companySettings),
                            }))
                          }
                        }}>
                        <Phone size={14} /> Recordar pago ({formatCOP(customerStats.pendingBalance)})
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── History tab ── */}
          {tab === 'history' && (
            <div>
              {saleOrders.filter((o) => o.customerId === customer.id).length === 0
                ? <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-8">Sin compras registradas</p>
                : saleOrders
                    .filter((o) => o.customerId === customer.id)
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .map((o) => (
                      <div key={o.id} className="flex items-start justify-between py-3 border-b border-slate-100 dark:border-gray-700 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{o.orderNumber}</p>
                          <p className="text-xs text-slate-400 dark:text-gray-500">{new Date(o.date + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })}</p>
                          <p className="text-xs text-slate-400 dark:text-gray-500 truncate">{o.items.map((i) => i.product).join(', ')}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold text-slate-800 dark:text-white">{formatCOP(o.total)}</p>
                          <span className={`badge ${o.paymentStatus === 'paid' ? 'badge-green' : 'badge-yellow'} text-xs`}>
                            {o.paymentStatus === 'paid' ? 'Pagado' : 'Pendiente'}
                          </span>
                        </div>
                      </div>
                    ))
              }
            </div>
          )}

          {/* ── Quotations tab ── */}
          {tab === 'quotations' && (
            <div>
              {customerQuotes.length === 0
                ? <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-8">Sin cotizaciones</p>
                : customerQuotes.map((q: Quotation) => {
                    const today = new Date().toISOString().split('T')[0]
                    const effStatus = (q.status === 'draft' || q.status === 'sent') && q.validUntil < today ? 'expired' : q.status
                    return (
                      <div key={q.id} className="flex items-start justify-between py-3 border-b border-slate-100 dark:border-gray-700 last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{q.quoteNumber}</p>
                          <p className="text-xs text-slate-400 dark:text-gray-500">{new Date(q.date + 'T12:00:00').toLocaleDateString('es-CO', { day:'numeric', month:'short', year:'numeric' })}</p>
                          <p className="text-xs text-slate-400 dark:text-gray-500">Válida hasta: {q.validUntil}</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-3">
                          <p className="font-bold text-slate-800 dark:text-white">{formatCOP(q.total)}</p>
                          <span className={`badge ${QUOTE_STATUS_BADGE[effStatus]} text-xs`}>{QUOTE_STATUS_LABEL[effStatus]}</span>
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          )}

          {/* ── Activities tab ── */}
          {tab === 'activities' && (
            <div className="space-y-4">
              {!showAddActivity
                ? (
                  <button className="btn btn-primary w-full flex items-center gap-2 justify-center"
                    onClick={() => setShowAddActivity(true)}>
                    <Plus size={15} /> Agregar seguimiento
                  </button>
                )
                : (
                  <AddActivityForm customerId={customer.id} onDone={() => setShowAddActivity(false)} />
                )
              }

              {customerActivities.length === 0
                ? <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-8">Sin seguimientos. ¡Agrega el primero!</p>
                : (
                  <div className="space-y-2">
                    {customerActivities.map((act) => {
                      const meta = ACTIVITY_META[act.type]
                      const Icon = meta.icon
                      return (
                        <div key={act.id} className={`flex gap-3 p-3 rounded-xl border transition-all ${
                          act.done
                            ? 'bg-slate-50 dark:bg-gray-700/40 border-slate-100 dark:border-gray-700 opacity-60'
                            : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-600'
                        }`}>
                          <button
                            onClick={() => updateActivity({ ...act, done: !act.done })}
                            className="flex-shrink-0 mt-0.5"
                            title={act.done ? 'Marcar pendiente' : 'Marcar completado'}>
                            {act.done
                              ? <CheckCircle2 size={18} className="text-emerald-500" />
                              : <Circle size={18} className="text-slate-300 dark:text-gray-600 hover:text-emerald-400 transition-colors" />
                            }
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className={`flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                                <Icon size={10} /> {meta.label}
                              </span>
                              <span className="text-xs text-slate-400 dark:text-gray-500">{act.date}</span>
                            </div>
                            <p className={`text-sm font-medium ${act.done ? 'line-through text-slate-400 dark:text-gray-500' : 'text-slate-700 dark:text-gray-200'}`}>
                              {act.subject}
                            </p>
                            {act.notes && (
                              <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5 whitespace-pre-line">{act.notes}</p>
                            )}
                          </div>
                          <button onClick={() => deleteActivity(act.id)}
                            className="flex-shrink-0 text-slate-300 dark:text-gray-600 hover:text-red-400 transition-colors mt-0.5">
                            <X size={14} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )
              }
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ── Main CRM ───────────────────────────────────────────────────────────────

export default function CRM() {
  const { customers, saleOrders, activities, deleteCustomer, loadAllData } = useStore()
  const { canEdit, canDelete } = usePermissions()
  const navigate = useNavigate()
  const [search, setSearch]       = useState('')
  const [segFilter, setSeg]       = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editCustomer, setEditCustomer] = useState<Customer | undefined>()
  const [selected, setSelected]   = useState<Customer | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [showImport, setShowImport]     = useState(false)
  const [page, setPage]                 = useState(1)
  const PAGE_SIZE = 12

  const customerStats = useMemo(() => {
    const map: Record<string, { total: number; lastDate: string | null }> = {}
    for (const order of saleOrders) {
      if (!map[order.customerId]) map[order.customerId] = { total: 0, lastDate: null }
      map[order.customerId].total += order.total
      if (!map[order.customerId].lastDate || order.date > map[order.customerId].lastDate!) {
        map[order.customerId].lastDate = order.date
      }
    }
    return map
  }, [saleOrders])

  const pendingActivitiesPerCustomer = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of activities) {
      if (!a.done) map[a.customerId] = (map[a.customerId] ?? 0) + 1
    }
    return map
  }, [activities])

  const totalPending = Object.values(pendingActivitiesPerCustomer).reduce((s, n) => s + n, 0)

  const filtered = customers.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                        (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
                        c.email.toLowerCase().includes(search.toLowerCase())
    const matchSeg = segFilter === 'all' || c.segment === segFilter
    return matchSearch && matchSeg && c.isActive
  })
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalRevenue = Object.values(customerStats).reduce((a, s) => a + s.total, 0)
  const vipCount     = customers.filter((c) => c.segment === 'vip').length

  // ── Customer Health & CLV Metrics ─────────────────────────────────────
  const clvMetrics = useMemo(() => {
    const today = new Date()
    const activeCustomers = customers.filter(c => c.isActive)
    // CLV = avg revenue per customer
    const avgCLV = activeCustomers.length > 0
      ? Object.values(customerStats).reduce((a, s) => a + s.total, 0) / activeCustomers.length
      : 0

    // Repeat purchase rate: customers with 2+ orders / total customers
    const orderCountByCustomer: Record<string, number> = {}
    saleOrders.forEach(o => { orderCountByCustomer[o.customerId] = (orderCountByCustomer[o.customerId] ?? 0) + 1 })
    const repeatBuyers = Object.values(orderCountByCustomer).filter(c => c >= 2).length
    const totalBuyers  = Object.keys(orderCountByCustomer).length
    const repeatRate   = totalBuyers > 0 ? (repeatBuyers / totalBuyers * 100) : 0

    // At-risk customers: active, had purchases but no activity/purchase in 30+ days
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 86400000).toISOString().split('T')[0]
    const atRisk = activeCustomers.filter(c => {
      const stats = customerStats[c.id]
      if (!stats || !stats.lastDate) return false
      return stats.lastDate < thirtyDaysAgo && stats.total > 0
    })

    // Avg order value
    const avgOrderValue = saleOrders.length > 0
      ? saleOrders.reduce((a, o) => a + o.total, 0) / saleOrders.length
      : 0

    // Avg orders per customer
    const avgOrdersPerCustomer = totalBuyers > 0
      ? saleOrders.length / totalBuyers
      : 0

    return { avgCLV, repeatRate, repeatBuyers, totalBuyers, atRisk, avgOrderValue, avgOrdersPerCustomer }
  }, [customers, saleOrders, customerStats])

  const handleExportExcel = () => {
    const data = filtered.map((c) => ({
      Código: c.code,
      Nombre: c.name,
      Empresa: c.company ?? '',
      Email: c.email,
      Teléfono: c.phone ?? '',
      Ciudad: c.city ?? '',
      Segmento: SEG_LABELS[c.segment],
      'Total Compras': customerStats[c.id]?.total ?? 0,
      'Última Compra': customerStats[c.id]?.lastDate ?? '',
      Notas: c.notes ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Clientes')
    XLSX.writeFile(wb, `Clientes-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        title="Clientes"
        subtitle="Base de clientes y seguimiento comercial"
        accent="rgba(244, 63, 94, 0.20)"
        actions={
          <>
            <button className="btn btn-sm btn-secondary" onClick={handleExportExcel}>
              <FileSpreadsheet size={13} /> Exportar
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={13} /> Importar
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => { setEditCustomer(undefined); setShowModal(true) }}>
              <Plus size={14} /> Nuevo cliente
            </button>
          </>
        }
      />

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard icon={Users}      label="Total clientes"      value={customers.length}        accent="#2563eb" />
        <StatCard icon={Star}       label="Clientes VIP"        value={vipCount}                accent="#8b5cf6" />
        <StatCard icon={Activity}   label="Seguimientos pend."  value={totalPending}            accent="#f59e0b" />
        <StatCard icon={TrendingUp} label="Revenue total"       value={formatCOP(totalRevenue)} accent="#10b981" />
      </div>

      {/* Customer Health & CLV */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Heart size={16} className="text-rose-500" />
          <h2 className="font-semibold text-slate-800 dark:text-white text-sm">Salud de clientes & Valor de vida (CLV)</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-gray-400">CLV promedio</p>
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{formatCOP(clvMetrics.avgCLV)}</p>
            <p className="text-xs text-slate-400 dark:text-gray-500">por cliente</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-gray-400">Tasa de recompra</p>
            <p className={`text-lg font-bold ${clvMetrics.repeatRate >= 50 ? 'text-emerald-600' : clvMetrics.repeatRate >= 25 ? 'text-amber-600' : 'text-red-600'}`}>
              {clvMetrics.repeatRate.toFixed(0)}%
            </p>
            <p className="text-xs text-slate-400 dark:text-gray-500 flex items-center justify-center gap-1">
              <Repeat size={10} /> {clvMetrics.repeatBuyers}/{clvMetrics.totalBuyers} repiten
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-gray-400">Ticket promedio</p>
            <p className="text-lg font-bold text-violet-600 dark:text-violet-400">{formatCOP(clvMetrics.avgOrderValue)}</p>
            <p className="text-xs text-slate-400 dark:text-gray-500">por orden</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-gray-400">Pedidos / cliente</p>
            <p className="text-lg font-bold text-teal-600 dark:text-teal-400">{clvMetrics.avgOrdersPerCustomer.toFixed(1)}</p>
            <p className="text-xs text-slate-400 dark:text-gray-500">promedio</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-gray-400">En riesgo</p>
            <p className={`text-lg font-bold ${clvMetrics.atRisk.length > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {clvMetrics.atRisk.length}
            </p>
            <p className="text-xs text-slate-400 dark:text-gray-500 flex items-center justify-center gap-1">
              <AlertCircle size={10} /> sin actividad 30d+
            </p>
          </div>
        </div>
        {clvMetrics.atRisk.length > 0 && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-gray-700">
            <p className="text-xs font-semibold text-red-600 dark:text-red-400 mb-2">Clientes en riesgo — sin compra ni actividad en 30+ días:</p>
            <div className="flex flex-wrap gap-2">
              {clvMetrics.atRisk.slice(0, 8).map(c => (
                <button key={c.id} onClick={() => navigate(`/crm/${c.id}`)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-xs font-medium text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                  <AlertCircle size={11} /> {c.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar cliente..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="flex gap-2">
          {[['all', 'Todos'], ['regular', 'Regular'], ['mayorista', 'Mayorista'], ['vip', 'VIP']].map(([v, l]) => (
            <button key={v} onClick={() => { setSeg(v); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                segFilter === v
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paginated.map((c) => (
          <CustomerCard key={c.id} customer={c}
            totalPurchases={customerStats[c.id]?.total ?? 0}
            pendingActivities={pendingActivitiesPerCustomer[c.id] ?? 0}
            canEdit={canEdit('customers')} canDelete={canDelete('customers')}
            onClick={() => navigate(`/crm/${c.id}`)}
            onEdit={() => { setEditCustomer(c); setShowModal(true) }}
            onDelete={() => setDeleteTarget(c)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-slate-400 dark:text-gray-600">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p>No se encontraron clientes</p>
          </div>
        )}
      </div>
      <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />

      {/* Drawer */}
      {selected && (
        <CustomerDrawer
          customer={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEditCustomer(selected); setShowModal(true) }}
          onDelete={() => { setDeleteTarget(selected); setSelected(null) }}
          canEdit={canEdit('customers')}
          canDelete={canDelete('customers')}
        />
      )}

      {showModal && <CustomerModal customer={editCustomer} onClose={() => { setShowModal(false); setEditCustomer(undefined) }} />}
      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deleteCustomer(deleteTarget.id)
              setDeleteTarget(null)
            } finally {
              setDeleting(false)
            }
          }}
        />
      )}
      {showImport && (
        <ImportModal
          entity="customers"
          onClose={() => setShowImport(false)}
          onSuccess={() => loadAllData(true)}
        />
      )}
    </div>
  )
}
