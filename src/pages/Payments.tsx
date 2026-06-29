import { useState, useMemo } from 'react'
import {
  Banknote, Plus, Search, Trash2, AlertCircle, ChevronDown, ChevronUp,
  TrendingUp, Calendar, CreditCard, DollarSign, Clock,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Payment } from '../data/mockData'
import { formatCOP } from '../utils/currency'
import ConfirmDelete from '../components/ConfirmDelete'
import Pagination from '../components/Pagination'
import DateRangeFilter from '../components/DateRangeFilter'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import * as XLSX from 'xlsx'

const METHODS = ['Transferencia', 'Efectivo', 'Tarjeta', 'Cheque', 'Nequi', 'Daviplata', 'Otro']

const METHOD_COLORS: Record<string, string> = {
  'Transferencia': 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'Efectivo':      'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  'Tarjeta':       'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  'Cheque':        'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  'Nequi':         'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  'Daviplata':     'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  'Otro':          'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── New Payment Modal ────────────────────────────────────────────────────────
function PaymentModal({ onClose, prefill }: { onClose: () => void; prefill?: { saleOrderId: string; saleOrderNumber: string; customer: string; customerId: string; remaining: number } }) {
  const { addPayment, saleOrders, customers } = useStore()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    saleOrderId: prefill?.saleOrderId ?? '',
    saleOrderNumber: prefill?.saleOrderNumber ?? '',
    customer: prefill?.customer ?? '',
    customerId: prefill?.customerId ?? '',
    date: today,
    amount: prefill?.remaining ?? 0,
    method: 'Transferencia',
    reference: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleOrderChange = (orderId: string) => {
    const order = saleOrders.find(o => o.id === orderId)
    if (order) {
      setForm(f => ({
        ...f,
        saleOrderId: order.id,
        saleOrderNumber: order.orderNumber,
        customer: order.customer,
        customerId: order.customerId,
      }))
    }
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.amount || form.amount <= 0) e.amount = 'Monto requerido'
    if (!form.date) e.date = 'Fecha requerida'
    if (!form.customer.trim() && !form.saleOrderId) e.customer = 'Cliente o orden requerido'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const payment: Payment = {
        id: `pay${Date.now()}`,
        saleOrderId: form.saleOrderId,
        saleOrderNumber: form.saleOrderNumber,
        customer: form.customer,
        customerId: form.customerId,
        date: form.date,
        amount: Number(form.amount),
        method: form.method,
        reference: form.reference,
        notes: form.notes,
      }
      await addPayment(payment)
      onClose()
    } catch { /* handled */ } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Banknote size={18} className="text-emerald-500" /> Registrar Pago
          </h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Orden de venta</label>
            <select className="input" value={form.saleOrderId} onChange={e => handleOrderChange(e.target.value)}>
              <option value="">— Sin vincular a orden —</option>
              {saleOrders.filter(o => o.paymentStatus !== 'paid').map(o => (
                <option key={o.id} value={o.id}>{o.orderNumber} — {o.customer} ({formatCOP(o.total)})</option>
              ))}
            </select>
          </div>
          {!form.saleOrderId && (
            <div>
              <label className="label">Cliente *</label>
              <input className={`input ${errors.customer ? 'border-red-400' : ''}`} value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Monto *</label>
              <input type="number" className={`input ${errors.amount ? 'border-red-400' : ''}`} value={form.amount || ''} onChange={e => setForm(f => ({ ...f, amount: Number(e.target.value) }))} placeholder="0" />
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className={`input ${errors.date ? 'border-red-400' : ''}`} value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Método</label>
              <select className="input" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Referencia</label>
              <input className="input" value={form.reference} onChange={e => setForm(f => ({ ...f, reference: e.target.value }))} placeholder="# comprobante" />
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <input className="input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 dark:border-gray-700 flex gap-3">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 12

export default function PaymentsPage() {
  const { payments, deletePayment, saleOrders } = useStore()
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [modal, setModal] = useState(false)
  const [deleting, setDeleting] = useState<Payment | null>(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<'date' | 'amount'>('date')
  const [sortAsc, setSortAsc] = useState(false)

  const filtered = payments
    .filter(p => {
      const q = search.toLowerCase()
      const match = !q || p.customer.toLowerCase().includes(q) || p.saleOrderNumber?.toLowerCase().includes(q) || p.reference?.toLowerCase().includes(q)
      const methodMatch = !methodFilter || p.method === methodFilter
      const dateMatch = (!dateFrom || p.date >= dateFrom) && (!dateTo || p.date <= dateTo)
      return match && methodMatch && dateMatch
    })
    .sort((a, b) => {
      const mul = sortAsc ? 1 : -1
      if (sortKey === 'date') return mul * a.date.localeCompare(b.date)
      return mul * (a.amount - b.amount)
    })

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // KPIs
  const totalReceived = payments.reduce((s, p) => s + p.amount, 0)
  const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
  const monthPayments = payments.filter(p => p.date?.startsWith(thisMonth))
  const monthTotal = monthPayments.reduce((s, p) => s + p.amount, 0)
  const pendingOrders = saleOrders.filter(o => o.paymentStatus !== 'paid' && o.status !== 'cancelled')
  const totalPending = pendingOrders.reduce((s, o) => s + o.total, 0) - payments.filter(p => pendingOrders.some(o => o.id === p.saleOrderId)).reduce((s, p) => s + p.amount, 0)

  // Method breakdown
  const byMethod = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of payments) {
      map[p.method] = (map[p.method] ?? 0) + p.amount
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [payments])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const handleDelete = async () => {
    if (!deleting) return
    await deletePayment(deleting.id)
    setDeleting(null)
  }

  const exportExcel = () => {
    const data = filtered.map(p => ({
      'Fecha': p.date, 'Cliente': p.customer, 'Orden': p.saleOrderNumber,
      'Monto': p.amount, 'Método': p.method, 'Referencia': p.reference, 'Notas': p.notes,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Pagos')
    XLSX.writeFile(wb, 'pagos.xlsx')
  }

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-30" />

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Banknote}
        title="Pagos"
        subtitle="Tesorería y recaudos"
        accent="rgba(16, 185, 129, 0.20)"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard icon={DollarSign} label="Total recibido"      value={formatCOP(totalReceived)}             accent="#10b981" />
        <StatCard icon={Calendar}   label="Este mes"            value={formatCOP(monthTotal)}                accent="#2563eb" />
        <StatCard icon={Clock}      label="Pendiente cobrar"    value={formatCOP(Math.max(0, totalPending))} accent="#f59e0b" />
        <StatCard icon={CreditCard} label="Pagos registrados"   value={payments.length}                       accent="#8b5cf6" />
      </div>

      {/* Method breakdown */}
      {byMethod.length > 0 && (
        <div className="card p-5">
          <h3 className="font-bold text-sm text-slate-700 dark:text-gray-200 mb-4">Recaudo por método de pago</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {byMethod.map(([method, total]) => {
              const pct = totalReceived > 0 ? (total / totalReceived * 100).toFixed(0) : '0'
              return (
                <div key={method} className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${METHOD_COLORS[method] ?? METHOD_COLORS['Otro']}`}>{method}</span>
                    <span className="text-[10px] text-slate-400 dark:text-gray-500">{pct}%</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{formatCOP(total)}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9 w-full" placeholder="Buscar por cliente, orden, referencia..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="input w-40" value={methodFilter} onChange={e => { setMethodFilter(e.target.value); setPage(1) }}>
            <option value="">Todos los métodos</option>
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <DateRangeFilter from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1) }} />
          <button className="btn btn-secondary text-xs" onClick={exportExcel}>Excel</button>
          <button className="btn btn-primary flex items-center gap-1.5" onClick={() => setModal(true)}>
            <Plus size={16} /> Registrar Pago
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 dark:text-gray-400 border-b border-slate-100 dark:border-gray-700">
              <th className="pb-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                <span className="flex items-center gap-1">Fecha <SortIcon k="date" /></span>
              </th>
              <th className="pb-3 px-4">Cliente</th>
              <th className="pb-3 px-4">Orden</th>
              <th className="pb-3 px-4">Método</th>
              <th className="pb-3 px-4">Referencia</th>
              <th className="pb-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('amount')}>
                <span className="flex items-center gap-1">Monto <SortIcon k="amount" /></span>
              </th>
              <th className="pb-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400 dark:text-gray-500">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
                No se encontraron pagos
              </td></tr>
            )}
            {paged.map(p => (
              <tr key={p.id} className="border-b border-slate-50 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="py-3 px-4 text-slate-500 dark:text-gray-400">{fmt(p.date)}</td>
                <td className="py-3 px-4 font-medium text-slate-700 dark:text-gray-200">{p.customer || '—'}</td>
                <td className="py-3 px-4 text-slate-500 dark:text-gray-400">{p.saleOrderNumber || '—'}</td>
                <td className="py-3 px-4">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${METHOD_COLORS[p.method] ?? METHOD_COLORS['Otro']}`}>
                    {p.method}
                  </span>
                </td>
                <td className="py-3 px-4 text-slate-500 dark:text-gray-400">{p.reference || '—'}</td>
                <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(p.amount)}</td>
                <td className="py-3 px-4 text-right">
                  <button className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" onClick={() => setDeleting(p)} title="Eliminar">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-3">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      {/* Modals */}
      {modal && <PaymentModal onClose={() => setModal(false)} />}
      {deleting && <ConfirmDelete name={`${formatCOP(deleting.amount)} — ${deleting.customer}`} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />}
    </div>
  )
}

// Export the modal for use in Sales page
export { PaymentModal }
