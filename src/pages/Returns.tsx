import { useState } from 'react'
import {
  RotateCcw, Plus, Search, X, Trash2, Edit2, ChevronDown, ChevronUp,
  FileText, AlertCircle, CheckCircle, Clock, XCircle,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Return } from '../data/mockData'
import { formatCOP } from '../utils/currency'
import ConfirmDelete from '../components/ConfirmDelete'
import Pagination from '../components/Pagination'
import DateRangeFilter from '../components/DateRangeFilter'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import * as XLSX from 'xlsx'

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending:  { label: 'Pendiente',  color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',    icon: Clock },
  approved: { label: 'Aprobada',   color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',        icon: CheckCircle },
  refunded: { label: 'Reembolsada',color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',    icon: CheckCircle },
  rejected: { label: 'Rechazada',  color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',            icon: XCircle },
}

const REFUND_METHODS = ['Nota crédito', 'Transferencia', 'Efectivo', 'Otro']

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Modal ───────────────────────────────────────────────────────────────────
function ReturnModal({ initial, onClose }: { initial?: Return; onClose: () => void }) {
  const { addReturn, updateReturn, saleOrders, customers } = useStore()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<Partial<Return>>(initial ?? {
    date: today, status: 'pending', items: [], refundMethod: 'Nota crédito',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.customer?.trim()) e.customer = 'Requerido'
    if (!form.reason?.trim()) e.reason = 'Motivo requerido'
    if (!form.date) e.date = 'Requerido'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const ret: Return = {
        id:              initial?.id ?? `ret${Date.now()}`,
        returnNumber:    form.returnNumber || `DEV-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
        saleOrderId:     form.saleOrderId ?? '',
        saleOrderNumber: form.saleOrderNumber ?? '',
        customer:        form.customer!,
        customerId:      form.customerId ?? '',
        date:            form.date!,
        reason:          form.reason ?? '',
        status:          (form.status as Return['status']) ?? 'pending',
        items:           form.items ?? [],
        subtotal:        Number(form.subtotal ?? 0),
        tax:             Number(form.tax ?? 0),
        total:           Number(form.total ?? 0),
        creditNoteNumber:form.creditNoteNumber ?? '',
        refundMethod:    form.refundMethod ?? '',
        notes:           form.notes ?? '',
      }
      if (initial) await updateReturn(ret)
      else await addReturn(ret)
      onClose()
    } catch { /* handled */ } finally { setSaving(false) }
  }

  const selectedOrder = saleOrders.find(o => o.id === form.saleOrderId)

  const handleOrderChange = (orderId: string) => {
    const order = saleOrders.find(o => o.id === orderId)
    if (order) {
      setForm(f => ({
        ...f,
        saleOrderId: order.id,
        saleOrderNumber: order.orderNumber,
        customer: order.customer,
        customerId: order.customerId,
        items: order.items.map(i => ({ product: i.product, productId: i.productId, qty: i.qty, price: i.price, subtotal: i.subtotal })),
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
      }))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="font-bold text-slate-800 dark:text-white">{initial ? 'Editar Devolución' : 'Nueva Devolución'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Orden de venta vinculada</label>
            <select className="input" value={form.saleOrderId ?? ''} onChange={e => handleOrderChange(e.target.value)}>
              <option value="">— Seleccionar orden —</option>
              {saleOrders.map(o => <option key={o.id} value={o.id}>{o.orderNumber} — {o.customer}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente *</label>
              <input className={`input ${errors.customer ? 'border-red-400' : ''}`} value={form.customer ?? ''} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))} />
            </div>
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className={`input ${errors.date ? 'border-red-400' : ''}`} value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Motivo *</label>
            <textarea className={`input ${errors.reason ? 'border-red-400' : ''}`} rows={2} value={form.reason ?? ''} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Razón de la devolución..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.status ?? 'pending'} onChange={e => setForm(f => ({ ...f, status: e.target.value as Return['status'] }))}>
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobada</option>
                <option value="refunded">Reembolsada</option>
                <option value="rejected">Rechazada</option>
              </select>
            </div>
            <div>
              <label className="label">Método de reembolso</label>
              <select className="input" value={form.refundMethod ?? ''} onChange={e => setForm(f => ({ ...f, refundMethod: e.target.value }))}>
                <option value="">— Seleccionar —</option>
                {REFUND_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          {selectedOrder && (
            <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-4">
              <p className="text-xs font-medium text-slate-500 dark:text-gray-400 mb-2">Productos de la orden</p>
              {(form.items ?? []).map((item, i) => (
                <div key={i} className="flex justify-between text-sm py-1 border-b border-slate-100 dark:border-gray-600 last:border-0">
                  <span className="text-slate-700 dark:text-gray-200">{item.product} × {item.qty}</span>
                  <span className="text-slate-500 dark:text-gray-400">{formatCOP(item.subtotal)}</span>
                </div>
              ))}
              <div className="flex justify-between font-bold text-sm mt-2 text-slate-800 dark:text-white">
                <span>Total</span>
                <span>{formatCOP(form.total ?? 0)}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Subtotal</label>
              <input type="number" className="input" value={form.subtotal ?? 0} onChange={e => setForm(f => ({ ...f, subtotal: Number(e.target.value), total: Number(e.target.value) + (f.tax ?? 0) }))} />
            </div>
            <div>
              <label className="label">IVA</label>
              <input type="number" className="input" value={form.tax ?? 0} onChange={e => setForm(f => ({ ...f, tax: Number(e.target.value), total: (f.subtotal ?? 0) + Number(e.target.value) }))} />
            </div>
            <div>
              <label className="label">Total</label>
              <input type="number" className="input bg-slate-50 dark:bg-gray-700" value={form.total ?? 0} readOnly />
            </div>
          </div>
          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
        </div>
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 px-6 py-4 border-t border-slate-100 dark:border-gray-700 flex gap-3 rounded-b-2xl">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Crear'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 10

export default function ReturnsPage() {
  const { returns, deleteReturn } = useStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [modal, setModal] = useState<Return | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Return | null>(null)
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<'date' | 'total'>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = returns
    .filter(r => {
      const q = search.toLowerCase()
      const match = !q || r.customer.toLowerCase().includes(q) || r.returnNumber?.toLowerCase().includes(q) || r.saleOrderNumber?.toLowerCase().includes(q)
      const statusMatch = !statusFilter || r.status === statusFilter
      const dateMatch = (!dateFrom || (r.date ?? '') >= dateFrom) && (!dateTo || (r.date ?? '') <= dateTo)
      return match && statusMatch && dateMatch
    })
    .sort((a, b) => {
      const mul = sortAsc ? 1 : -1
      if (sortKey === 'date') return mul * ((a.date ?? '').localeCompare(b.date ?? ''))
      return mul * ((a.total ?? 0) - (b.total ?? 0))
    })

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalReturns = returns.length
  const totalValue = returns.reduce((s, r) => s + (r.total ?? 0), 0)
  const pendingCount = returns.filter(r => r.status === 'pending').length
  const refundedCount = returns.filter(r => r.status === 'refunded').length

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const handleDelete = async () => {
    if (!deleting) return
    await deleteReturn(deleting.id)
    setDeleting(null)
  }

  const exportExcel = () => {
    const data = filtered.map(r => ({
      '#': r.returnNumber,
      'Orden Venta': r.saleOrderNumber,
      'Cliente': r.customer,
      'Fecha': r.date,
      'Motivo': r.reason,
      'Estado': STATUS_MAP[r.status]?.label ?? r.status,
      'Total': r.total,
      'Método Reembolso': r.refundMethod,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Devoluciones')
    XLSX.writeFile(wb, 'devoluciones.xlsx')
  }

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-30" />

  return (
    <div className="space-y-5">
      <PageHeader
        icon={RotateCcw}
        title="Devoluciones"
        subtitle="Gestión de devoluciones y reembolsos"
        accent="rgba(244, 63, 94, 0.20)"
        actions={
          <>
            <button className="btn btn-sm btn-secondary" onClick={exportExcel}>Excel</button>
            <button className="btn btn-sm btn-primary flex items-center gap-1.5" onClick={() => setModal('new')}>
              <Plus size={14} /> Nueva Devolución
            </button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard icon={RotateCcw} label="Total devoluciones" value={totalReturns} accent="#f43f5e" />
        <StatCard icon={FileText} label="Valor total" value={formatCOP(totalValue)} accent="#f59e0b" />
        <StatCard icon={Clock} label="Pendientes" value={pendingCount} accent="#10b981" />
        <StatCard icon={CheckCircle} label="Reembolsadas" value={refundedCount} accent="#2563eb" />
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9 w-full" placeholder="Buscar por cliente, # devolución..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="input w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}>
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <DateRangeFilter from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1) }} />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 dark:text-gray-400 border-b border-slate-100 dark:border-gray-700">
              <th className="pb-3 px-4">#</th>
              <th className="pb-3 px-4">Orden Venta</th>
              <th className="pb-3 px-4">Cliente</th>
              <th className="pb-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                <span className="flex items-center gap-1">Fecha <SortIcon k="date" /></span>
              </th>
              <th className="pb-3 px-4">Motivo</th>
              <th className="pb-3 px-4">Estado</th>
              <th className="pb-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('total')}>
                <span className="flex items-center gap-1">Total <SortIcon k="total" /></span>
              </th>
              <th className="pb-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400 dark:text-gray-500">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
                No se encontraron devoluciones
              </td></tr>
            )}
            {paged.map(r => {
              const st = STATUS_MAP[r.status] ?? STATUS_MAP.pending
              return (
                <tr key={r.id} className="border-b border-slate-50 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-700 dark:text-gray-200">{r.returnNumber || '—'}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-gray-400">{r.saleOrderNumber || '—'}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-gray-200">{r.customer}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-gray-400">{fmt(r.date)}</td>
                  <td className="py-3 px-4 text-slate-500 dark:text-gray-400 max-w-[200px] truncate">{r.reason || '—'}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                      <st.icon size={12} /> {st.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-700 dark:text-gray-200">{formatCOP(r.total)}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors" onClick={() => setModal(r)} title="Editar">
                        <Edit2 size={14} className="text-slate-500 dark:text-gray-400" />
                      </button>
                      <button className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" onClick={() => setDeleting(r)} title="Eliminar">
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-4 py-3">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      {/* Modals */}
      {modal && <ReturnModal initial={modal === 'new' ? undefined : modal} onClose={() => setModal(null)} />}
      {deleting && <ConfirmDelete name={`${deleting.returnNumber} — ${deleting.customer}`} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />}
    </div>
  )
}
