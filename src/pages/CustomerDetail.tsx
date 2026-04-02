import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, MapPin, MessageCircle, Send, Pencil,
  ShoppingBag, FileText, Activity, CreditCard, RotateCcw,
  TrendingUp, Clock, Star, AlertTriangle, DollarSign,
  ChevronRight, CheckCircle2, Circle, Plus, X,
  PhoneCall, AtSign, Navigation, StickyNote, Calendar,
  Banknote, ExternalLink,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Customer, CustomerActivity, SaleOrder, Quotation, Payment, Return } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import { formatCOP } from '../utils/currency'
import { openWhatsApp, buildFollowUp, buildPaymentReminder, getBankInfo } from '../utils/whatsapp'

// ── Constants ──────────────────────────────────────────────────────────────

const SEG_BADGE: Record<string, string> = {
  vip: 'badge-purple', mayorista: 'badge-blue', regular: 'badge-gray',
}
const SEG_LABELS: Record<string, string> = {
  vip: 'VIP', mayorista: 'Mayorista', regular: 'Regular',
}

const ACTIVITY_META: Record<CustomerActivity['type'], { label: string; icon: React.ElementType; color: string; bg: string }> = {
  call:     { label: 'Llamada',  icon: PhoneCall,      color: 'text-blue-600 dark:text-blue-400',     bg: 'bg-blue-50 dark:bg-blue-900/30' },
  email:    { label: 'Email',    icon: AtSign,         color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
  visit:    { label: 'Visita',   icon: Navigation,     color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  note:     { label: 'Nota',     icon: StickyNote,     color: 'text-amber-600 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/30' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle,  color: 'text-green-600 dark:text-green-400',  bg: 'bg-green-50 dark:bg-green-900/30' },
}

const PAY_STATUS: Record<string, { label: string; badge: string }> = {
  paid:    { label: 'Pagado',  badge: 'badge-green' },
  partial: { label: 'Parcial', badge: 'badge-yellow' },
  pending: { label: 'Pendiente', badge: 'badge-red' },
}

const QUOTE_STATUS: Record<string, { label: string; badge: string }> = {
  draft:    { label: 'Borrador',   badge: 'badge-gray' },
  sent:     { label: 'Enviada',    badge: 'badge-blue' },
  accepted: { label: 'Aceptada',   badge: 'badge-green' },
  rejected: { label: 'Rechazada',  badge: 'badge-red' },
  expired:  { label: 'Vencida',    badge: 'badge-yellow' },
}

const RETURN_STATUS: Record<string, { label: string; badge: string }> = {
  pending:   { label: 'Pendiente',  badge: 'badge-yellow' },
  approved:  { label: 'Aprobada',   badge: 'badge-blue' },
  completed: { label: 'Completada', badge: 'badge-green' },
  rejected:  { label: 'Rechazada',  badge: 'badge-red' },
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Inline Activity Form ──────────────────────────────────────────────────

function AddActivityInline({ customerId, onDone }: { customerId: string; onDone: () => void }) {
  const { addActivity } = useStore()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<{
    type: CustomerActivity['type']; date: string; subject: string; notes: string
  }>({ type: 'call', date: today, subject: '', notes: '' })

  const handleSave = async () => {
    if (!form.subject.trim()) return
    await addActivity({
      id: `a${Date.now()}`, customerId,
      type: form.type, date: form.date,
      subject: form.subject.trim(),
      notes: form.notes.trim() || undefined,
      done: false, createdAt: new Date().toISOString(),
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
        <input className="input text-sm" type="date" value={form.date}
          onChange={(e) => setForm({ ...form, date: e.target.value })} />
        <textarea className="input text-sm resize-none" rows={1} placeholder="Notas (opcional)"
          value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
      </div>
      <div className="flex gap-2 justify-end">
        <button className="btn btn-sm btn-secondary" onClick={onDone}>Cancelar</button>
        <button className="btn btn-sm btn-primary" onClick={handleSave}>Guardar</button>
      </div>
    </div>
  )
}

// ── Section Header ────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, count, action }: {
  icon: React.ElementType; title: string; count?: number
  action?: { label: string; onClick: () => void }
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon size={16} className="text-slate-400 dark:text-gray-500" />
        <h3 className="font-semibold text-slate-800 dark:text-white text-sm">{title}</h3>
        {count !== undefined && (
          <span className="text-xs bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">
            {count}
          </span>
        )}
      </div>
      {action && (
        <button className="btn btn-sm btn-primary flex items-center gap-1" onClick={action.onClick}>
          <Plus size={12} /> {action.label}
        </button>
      )}
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const {
    customers, saleOrders, quotations, activities, payments, returns,
    opportunities, updateActivity, deleteActivity, companySettings,
  } = useStore()
  const { canEdit } = usePermissions()
  const [showAddActivity, setShowAddActivity] = useState(false)

  const customer = customers.find((c) => c.id === id)

  // ── Derived data ──────────────────────────────────────────────────────

  const customerOrders = useMemo(() =>
    saleOrders.filter((o) => o.customerId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [saleOrders, id]
  )

  const customerQuotes = useMemo(() =>
    quotations.filter((q) => q.customerId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [quotations, id]
  )

  const customerPayments = useMemo(() =>
    payments.filter((p) => p.customerId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [payments, id]
  )

  const customerReturns = useMemo(() =>
    returns.filter((r) => r.customerId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [returns, id]
  )

  const customerActivities = useMemo(() =>
    activities.filter((a) => a.customerId === id).sort((a, b) => b.date.localeCompare(a.date)),
    [activities, id]
  )

  const customerOpportunities = useMemo(() =>
    opportunities.filter((o) => o.customerId === id),
    [opportunities, id]
  )

  const stats = useMemo(() => {
    const totalRevenue = customerOrders.reduce((s, o) => s + o.total, 0)
    const paidAmount = customerPayments.reduce((s, p) => s + p.amount, 0)
    const pendingBalance = totalRevenue - paidAmount
    const avgOrderValue = customerOrders.length > 0 ? totalRevenue / customerOrders.length : 0
    const lastOrder = customerOrders[0]
    const pipelineValue = customerOpportunities
      .filter(o => !['won', 'lost'].includes(o.stage))
      .reduce((s, o) => s + o.value, 0)
    const pendingActivities = customerActivities.filter(a => !a.done).length

    // Days since last order
    let daysSinceLast = null as number | null
    if (lastOrder) {
      daysSinceLast = Math.floor(
        (Date.now() - new Date(lastOrder.date + 'T12:00:00').getTime()) / 86400000
      )
    }

    return {
      totalRevenue, paidAmount, pendingBalance: Math.max(0, pendingBalance),
      avgOrderValue, orderCount: customerOrders.length,
      lastOrder, daysSinceLast, pipelineValue, pendingActivities,
    }
  }, [customerOrders, customerPayments, customerOpportunities, customerActivities])

  // ── Not found ─────────────────────────────────────────────────────────

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle size={48} className="text-slate-300 dark:text-gray-600 mb-4" />
        <h2 className="text-lg font-semibold text-slate-700 dark:text-gray-200 mb-1">Cliente no encontrado</h2>
        <p className="text-sm text-slate-400 dark:text-gray-500 mb-4">El cliente solicitado no existe o fue eliminado.</p>
        <button className="btn btn-primary" onClick={() => navigate('/crm')}>
          <ArrowLeft size={14} className="mr-2" /> Volver a CRM
        </button>
      </div>
    )
  }

  // ── Health indicator ──────────────────────────────────────────────────

  const healthStatus = (() => {
    if (!stats.daysSinceLast) return { label: 'Nuevo', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' }
    if (stats.daysSinceLast <= 30) return { label: 'Activo', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' }
    if (stats.daysSinceLast <= 60) return { label: 'Tibio', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' }
    return { label: 'En riesgo', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' }
  })()

  // ── Timeline data ─────────────────────────────────────────────────────

  const timeline = useMemo(() => {
    const items: { date: string; type: string; icon: React.ElementType; color: string; title: string; subtitle: string; amount?: number }[] = []

    customerOrders.slice(0, 5).forEach(o => items.push({
      date: o.date, type: 'order', icon: ShoppingBag, color: 'text-blue-500',
      title: `Pedido ${o.orderNumber}`, subtitle: `${o.items.length} producto(s)`, amount: o.total,
    }))
    customerPayments.slice(0, 5).forEach(p => items.push({
      date: p.date, type: 'payment', icon: Banknote, color: 'text-emerald-500',
      title: `Pago — ${p.method}`, subtitle: p.reference || p.saleOrderNumber || '—', amount: p.amount,
    }))
    customerQuotes.slice(0, 5).forEach(q => items.push({
      date: q.date, type: 'quote', icon: FileText, color: 'text-violet-500',
      title: `Cotización ${q.quoteNumber}`, subtitle: q.status, amount: q.total,
    }))
    customerReturns.slice(0, 3).forEach(r => items.push({
      date: r.date, type: 'return', icon: RotateCcw, color: 'text-red-500',
      title: `Devolución ${r.returnNumber}`, subtitle: r.reason, amount: r.total,
    }))

    return items.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10)
  }, [customerOrders, customerPayments, customerQuotes, customerReturns])

  return (
    <div className="space-y-6">
      {/* ── Back + Header ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <button onClick={() => navigate('/crm')}
          className="mt-1 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors flex-shrink-0">
          <ArrowLeft size={20} className="text-slate-500 dark:text-gray-400" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-lg">
                {customer.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-slate-800 dark:text-white">{customer.name}</h1>
                <span className={`badge ${SEG_BADGE[customer.segment]}`}>{SEG_LABELS[customer.segment]}</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${healthStatus.bg} ${healthStatus.color}`}>
                  {healthStatus.label}
                </span>
              </div>
              {customer.company && (
                <p className="text-sm text-slate-500 dark:text-gray-400">{customer.company}</p>
              )}
              <p className="text-xs text-slate-400 dark:text-gray-500">{customer.code}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {customer.phone && (
            <a href={`https://wa.me/${customer.phone.replace(/\D/g, '')}`}
              target="_blank" rel="noopener noreferrer"
              className="btn btn-sm flex items-center gap-1.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40">
              <MessageCircle size={14} /> WhatsApp
            </a>
          )}
          {canEdit('customers') && (
            <button className="btn btn-sm btn-secondary flex items-center gap-1"
              onClick={() => navigate('/crm', { state: { editId: customer.id } })}>
              <Pencil size={12} /> Editar
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Ingresos totales', value: formatCOP(stats.totalRevenue), icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
          { label: 'Saldo pendiente', value: formatCOP(stats.pendingBalance), icon: DollarSign, color: stats.pendingBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400', bg: stats.pendingBalance > 0 ? 'bg-red-50 dark:bg-red-900/30' : 'bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Pedidos', value: String(stats.orderCount), icon: ShoppingBag, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
          { label: 'Ticket promedio', value: formatCOP(stats.avgOrderValue), icon: CreditCard, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
          { label: 'Pipeline', value: formatCOP(stats.pipelineValue), icon: Star, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
          { label: 'Última compra', value: stats.daysSinceLast !== null ? `Hace ${stats.daysSinceLast}d` : 'Nunca', icon: Clock, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-gray-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center flex-shrink-0`}>
                <kpi.icon size={16} className={kpi.color} />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-gray-500">{kpi.label}</p>
            <p className="text-lg font-bold text-slate-800 dark:text-white truncate">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: Contact + Activities ─────────────────────── */}
        <div className="space-y-6">
          {/* Contact info */}
          <div className="card p-5 space-y-4">
            <SectionHeader icon={Mail} title="Información de contacto" />
            <div className="space-y-3">
              {[
                { icon: Mail, label: 'Email', value: customer.email, action: customer.email ? () => window.open(`mailto:${customer.email}`) : undefined },
                { icon: Phone, label: 'Teléfono', value: customer.phone },
                { icon: MapPin, label: 'Ciudad', value: customer.city },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3 text-sm">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                    <item.icon size={14} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 dark:text-gray-500">{item.label}</p>
                    <p className="text-slate-700 dark:text-gray-200 font-medium truncate">{item.value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
            {customer.notes && (
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-100 dark:border-amber-800">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Notas</p>
                <p className="text-sm text-slate-700 dark:text-gray-200 whitespace-pre-line">{customer.notes}</p>
              </div>
            )}

            {/* WhatsApp Quick Actions */}
            {customer.phone && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Acciones rápidas</p>
                {stats.lastOrder && (
                  <button className="w-full btn btn-sm flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                    onClick={() => openWhatsApp(customer.phone, buildFollowUp({
                      companyName: companySettings.companyName,
                      customer: customer.name,
                      orderNumber: stats.lastOrder!.orderNumber,
                      date: stats.lastOrder!.date,
                    }))}>
                    <MessageCircle size={12} /> Seguimiento post-venta
                  </button>
                )}
                {stats.pendingBalance > 0 && (
                  <button className="w-full btn btn-sm flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    onClick={() => {
                      const unpaid = customerOrders.find(o => o.paymentStatus !== 'paid')
                      if (unpaid) {
                        openWhatsApp(customer.phone, buildPaymentReminder({
                          companyName: companySettings.companyName,
                          customer: customer.name,
                          orderNumber: unpaid.orderNumber,
                          date: unpaid.date,
                          total: unpaid.total,
                          paymentStatus: unpaid.paymentStatus,
                          bankInfo: getBankInfo(companySettings),
                        }))
                      }
                    }}>
                    <Phone size={12} /> Recordar pago ({formatCOP(stats.pendingBalance)})
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Activities */}
          <div className="card p-5">
            <SectionHeader
              icon={Activity} title="Seguimientos"
              count={stats.pendingActivities}
              action={{ label: 'Agregar', onClick: () => setShowAddActivity(true) }}
            />
            {showAddActivity && (
              <div className="mb-4">
                <AddActivityInline customerId={customer.id} onDone={() => setShowAddActivity(false)} />
              </div>
            )}
            {customerActivities.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-6">Sin seguimientos registrados</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {customerActivities.map((act) => {
                  const meta = ACTIVITY_META[act.type]
                  const Icon = meta.icon
                  return (
                    <div key={act.id} className={`flex gap-3 p-3 rounded-xl border transition-all ${
                      act.done
                        ? 'bg-slate-50 dark:bg-gray-700/40 border-slate-100 dark:border-gray-700 opacity-60'
                        : 'bg-white dark:bg-gray-800 border-slate-200 dark:border-gray-600'
                    }`}>
                      <button onClick={() => updateActivity({ ...act, done: !act.done })} className="flex-shrink-0 mt-0.5">
                        {act.done
                          ? <CheckCircle2 size={16} className="text-emerald-500" />
                          : <Circle size={16} className="text-slate-300 dark:text-gray-600 hover:text-emerald-400 transition-colors" />
                        }
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                            <Icon size={9} /> {meta.label}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-gray-500">{fmt(act.date)}</span>
                        </div>
                        <p className={`text-xs font-medium ${act.done ? 'line-through text-slate-400 dark:text-gray-500' : 'text-slate-700 dark:text-gray-200'}`}>
                          {act.subject}
                        </p>
                      </div>
                      <button onClick={() => deleteActivity(act.id)}
                        className="flex-shrink-0 text-slate-300 dark:text-gray-600 hover:text-red-400 transition-colors">
                        <X size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Center column: Timeline + Orders ──────────────────────── */}
        <div className="space-y-6">
          {/* Timeline */}
          <div className="card p-5">
            <SectionHeader icon={Calendar} title="Línea de tiempo" count={timeline.length} />
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-6">Sin actividad registrada</p>
            ) : (
              <div className="relative pl-6 space-y-4">
                <div className="absolute left-2.5 top-1 bottom-1 w-px bg-slate-200 dark:bg-gray-700" />
                {timeline.map((item, i) => {
                  const Icon = item.icon
                  return (
                    <div key={`${item.type}-${i}`} className="relative flex gap-3">
                      <div className="absolute -left-[14px] w-5 h-5 rounded-full bg-white dark:bg-gray-800 border-2 border-slate-200 dark:border-gray-700 flex items-center justify-center">
                        <Icon size={10} className={item.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-400 dark:text-gray-500">{fmt(item.date)}</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{item.title}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-500">{item.subtitle}</p>
                      </div>
                      {item.amount !== undefined && (
                        <span className="text-sm font-bold text-slate-800 dark:text-white flex-shrink-0">
                          {formatCOP(item.amount)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Orders */}
          <div className="card p-5">
            <SectionHeader icon={ShoppingBag} title="Pedidos" count={customerOrders.length} />
            {customerOrders.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-6">Sin pedidos</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {customerOrders.map((o) => {
                  const ps = PAY_STATUS[o.paymentStatus] || PAY_STATUS.pending
                  return (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{o.orderNumber}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-500">{fmt(o.date)} · {o.items.length} ítem(s)</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{formatCOP(o.total)}</p>
                        <span className={`badge ${ps.badge} text-[10px]`}>{ps.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: Payments, Quotations, Returns ───────────── */}
        <div className="space-y-6">
          {/* Payments */}
          <div className="card p-5">
            <SectionHeader icon={Banknote} title="Pagos" count={customerPayments.length} />
            {customerPayments.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-6">Sin pagos registrados</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {customerPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-gray-700">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{p.method}</p>
                      <p className="text-xs text-slate-400 dark:text-gray-500">{fmt(p.date)} · {p.reference || p.saleOrderNumber || '—'}</p>
                    </div>
                    <p className="font-bold text-emerald-600 dark:text-emerald-400 text-sm flex-shrink-0 ml-3">
                      +{formatCOP(p.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {/* Payment summary */}
            {customerPayments.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-700 flex justify-between text-sm">
                <span className="text-slate-400 dark:text-gray-500">Total pagado</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(stats.paidAmount)}</span>
              </div>
            )}
          </div>

          {/* Quotations */}
          <div className="card p-5">
            <SectionHeader icon={FileText} title="Cotizaciones" count={customerQuotes.length} />
            {customerQuotes.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-6">Sin cotizaciones</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {customerQuotes.map((q) => {
                  const today = new Date().toISOString().split('T')[0]
                  const effStatus = (q.status === 'draft' || q.status === 'sent') && q.validUntil < today ? 'expired' : q.status
                  const qs = QUOTE_STATUS[effStatus] || QUOTE_STATUS.draft
                  return (
                    <div key={q.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-gray-700">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{q.quoteNumber}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-500">{fmt(q.date)} · Válida: {fmt(q.validUntil)}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="font-bold text-slate-800 dark:text-white text-sm">{formatCOP(q.total)}</p>
                        <span className={`badge ${qs.badge} text-[10px]`}>{qs.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Returns */}
          <div className="card p-5">
            <SectionHeader icon={RotateCcw} title="Devoluciones" count={customerReturns.length} />
            {customerReturns.length === 0 ? (
              <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-6">Sin devoluciones</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {customerReturns.map((r) => {
                  const rs = RETURN_STATUS[r.status] || RETURN_STATUS.pending
                  return (
                    <div key={r.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-gray-700">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{r.returnNumber}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-500">{fmt(r.date)} · {r.reason}</p>
                      </div>
                      <div className="text-right flex-shrink-0 ml-3">
                        <p className="font-bold text-red-600 dark:text-red-400 text-sm">{formatCOP(r.total)}</p>
                        <span className={`badge ${rs.badge} text-[10px]`}>{rs.label}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
