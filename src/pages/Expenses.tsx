import { useState } from 'react'
import {
  Receipt, Plus, Search, X, Trash2, Edit2, TrendingDown,
  Calendar, Tag, CreditCard, RefreshCw, ChevronDown, ChevronUp, CalendarDays, Repeat, PieChart,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Expense, ExpenseCategory } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import { formatCOP } from '../utils/currency'
import ConfirmDelete from '../components/ConfirmDelete'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import * as XLSX from 'xlsx'

// ── Constants ─────────────────────────────────────────────────────────────────
export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Nómina', 'Arriendo', 'Servicios públicos', 'Transporte',
  'Marketing', 'Materiales', 'Mantenimiento', 'Impuestos', 'Otros',
]

const PAYMENT_METHODS = ['Transferencia', 'Efectivo', 'Tarjeta', 'Cheque', 'Otro']

const PERIOD_LABELS: Record<string, string> = {
  once: 'Una vez', weekly: 'Semanal', monthly: 'Mensual', annual: 'Anual',
}

const CAT_COLOR: Record<string, string> = {
  'Nómina':            'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  'Arriendo':          'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
  'Servicios públicos':'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300',
  'Transporte':        'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300',
  'Marketing':         'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300',
  'Materiales':        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  'Mantenimiento':     'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300',
  'Impuestos':         'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  'Otros':             'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300',
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────
function ExpenseModal({ initial, onClose }: { initial?: Expense; onClose: () => void }) {
  const { addExpense, updateExpense } = useStore()
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState<Partial<Expense>>(initial ?? {
    date:          today,
    category:      'Nómina',
    paymentMethod: 'Transferencia',
    recurring:     false,
    period:        'once',
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.description?.trim()) e.description = 'Requerido'
    if (!form.amount || form.amount <= 0) e.amount = 'Debe ser mayor a 0'
    if (!form.date) e.date = 'Requerido'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const expense: Expense = {
        id:            initial?.id ?? `exp${Date.now()}`,
        date:          form.date!,
        category:      form.category as ExpenseCategory ?? 'Otros',
        description:   form.description!.trim(),
        amount:        Number(form.amount),
        beneficiary:   form.beneficiary ?? '',
        paymentMethod: form.paymentMethod ?? 'Transferencia',
        notes:         form.notes ?? '',
        recurring:     form.recurring ?? false,
        period:        form.period as Expense['period'] ?? 'once',
      }
      if (initial) await updateExpense(expense)
      else         await addExpense(expense)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const set = (k: keyof Expense, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="font-semibold text-slate-800 dark:text-white">
            {initial ? 'Editar gasto' : 'Registrar gasto'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Date */}
          <div>
            <label className="label">Fecha *</label>
            <input type="date" className={`input ${errors.date ? 'border-red-400' : ''}`}
              value={form.date ?? ''} onChange={(e) => set('date', e.target.value)} />
          </div>

          {/* Category */}
          <div>
            <label className="label">Categoría</label>
            <select className="input" value={form.category ?? 'Otros'} onChange={(e) => set('category', e.target.value)}>
              {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="label">Descripción *</label>
            <input className={`input ${errors.description ? 'border-red-400' : ''}`}
              placeholder="Ej: Pago nómina marzo, arriendo bodega..."
              value={form.description ?? ''} onChange={(e) => set('description', e.target.value)} />
            {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
          </div>

          {/* Amount */}
          <div>
            <label className="label">Monto *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input type="number" min="0" className={`input pl-7 ${errors.amount ? 'border-red-400' : ''}`}
                placeholder="0" value={form.amount ?? ''} onChange={(e) => set('amount', parseFloat(e.target.value) || 0)} />
            </div>
            {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount}</p>}
          </div>

          {/* Beneficiary + payment method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Beneficiario</label>
              <input className="input" placeholder="Nombre, empresa..." value={form.beneficiary ?? ''}
                onChange={(e) => set('beneficiary', e.target.value)} />
            </div>
            <div>
              <label className="label">Método de pago</label>
              <select className="input" value={form.paymentMethod ?? 'Transferencia'}
                onChange={(e) => set('paymentMethod', e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 accent-amazonia-600"
                checked={form.recurring ?? false}
                onChange={(e) => set('recurring', e.target.checked)} />
              <span className="text-sm text-slate-700 dark:text-gray-300">Gasto recurrente</span>
            </label>
            {form.recurring && (
              <select className="input flex-1 text-sm" value={form.period ?? 'monthly'}
                onChange={(e) => set('period', e.target.value)}>
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="annual">Anual</option>
              </select>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notas</label>
            <textarea className="input resize-none" rows={2} placeholder="Observaciones..."
              value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Registrar gasto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 20

export default function ExpensesPage() {
  const { expenses, deleteExpense } = useStore()
  const { canDelete } = usePermissions()
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.slice(0, 7)
  const lastMonth = (() => {
    const d = new Date(today)
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 7)
  })()

  const [search, setSearch]       = useState('')
  const [catFilter, setCat]       = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEdit]     = useState<Expense | null>(null)
  const [deleteTarget, setDelete] = useState<Expense | null>(null)
  const [deleting, setDeleting]   = useState(false)
  const [page, setPage]           = useState(1)
  const [expandedId, setExpanded] = useState<string | null>(null)
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')

  // ── Filters ──────────────────────────────────────────────────────────────
  const filtered = expenses.filter((e) => {
    const q = search.toLowerCase()
    const matchSearch = e.description.toLowerCase().includes(q) ||
                        (e.beneficiary ?? '').toLowerCase().includes(q)
    const matchCat    = catFilter === 'all' || e.category === catFilter
    const matchFrom   = !dateFrom || e.date >= dateFrom
    const matchTo     = !dateTo   || e.date <= dateTo
    return matchSearch && matchCat && matchFrom && matchTo
  })
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const totalMonth  = expenses.filter((e) => e.date.startsWith(thisMonth)).reduce((a, e) => a + e.amount, 0)
  const totalLast   = expenses.filter((e) => e.date.startsWith(lastMonth)).reduce((a, e) => a + e.amount, 0)
  const recurring   = expenses.filter((e) => e.recurring).reduce((a, e) => a + e.amount, 0)
  const totalAll    = expenses.reduce((a, e) => a + e.amount, 0)

  const topCategory = (() => {
    const bycat: Record<string, number> = {}
    expenses.filter((e) => e.date.startsWith(thisMonth)).forEach((e) => {
      bycat[e.category] = (bycat[e.category] ?? 0) + e.amount
    })
    const entries = Object.entries(bycat).sort((a,b) => b[1] - a[1])
    return entries[0] ? entries[0][0] : '—'
  })()

  const momChange = totalLast > 0 ? ((totalMonth - totalLast) / totalLast * 100) : 0

  // ── Export ───────────────────────────────────────────────────────────────
  const exportExcel = () => {
    const data = filtered.map((e) => ({
      'Fecha':           e.date,
      'Categoría':       e.category,
      'Descripción':     e.description,
      'Monto':           e.amount,
      'Beneficiario':    e.beneficiary ?? '',
      'Método de pago':  e.paymentMethod,
      'Recurrente':      e.recurring ? PERIOD_LABELS[e.period ?? 'once'] : 'No',
      'Notas':           e.notes ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Gastos')
    XLSX.writeFile(wb, `gastos_${thisMonth}.xlsx`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Receipt}
        title="Gastos Operativos"
        subtitle="Control de egresos y costos fijos"
        accent="rgba(245, 158, 11, 0.20)"
        actions={
          <>
            <button onClick={exportExcel} className="btn btn-sm btn-secondary flex items-center gap-1.5">
              <TrendingDown size={14} /> Exportar
            </button>
            <button onClick={() => setShowModal(true)} className="btn btn-sm btn-primary flex items-center gap-2">
              <Plus size={14} /> Registrar gasto
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard
          icon={Receipt}
          label="Gastos este mes"
          value={formatCOP(totalMonth)}
          accent="#f59e0b"
          hint={totalLast > 0 ? `${momChange > 0 ? '▲' : '▼'} ${Math.abs(momChange).toFixed(1)}% vs mes anterior` : undefined}
        />
        <StatCard icon={CalendarDays} label="Mes anterior" value={formatCOP(totalLast)} accent="#ef4444" hint={lastMonth} />
        <StatCard icon={Repeat} label="Gastos recurrentes" value={formatCOP(recurring)} accent="#2563eb" hint={`${expenses.filter((e) => e.recurring).length} registros activos`} />
        <StatCard icon={PieChart} label="Mayor categoría (mes)" value={topCategory} accent="#10b981" hint={`Total acumulado: ${formatCOP(totalAll)}`} />
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar descripción o beneficiario..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">Desde</label>
            <input type="date" className="input text-xs py-1.5 w-36" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)} />
            <label className="text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">Hasta</label>
            <input type="date" className="input text-xs py-1.5 w-36" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)} />
          </div>
          {(search || catFilter !== 'all' || dateFrom || dateTo) && (
            <button onClick={() => { setSearch(''); setCat('all'); setDateFrom(''); setDateTo(''); setPage(1) }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
              <X size={12} className="inline mr-1" />Limpiar
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setCat('all'); setPage(1) }}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
              catFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
            }`}>Todas</button>
          {EXPENSE_CATEGORIES.map((c) => (
            <button key={c} onClick={() => { setCat(c); setPage(1) }}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                catFilter === c ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
              }`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {paginated.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-gray-600">
            <Receipt size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay gastos registrados</p>
            <p className="text-xs mt-1">Empieza registrando el primer gasto operativo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
                {['Fecha', 'Categoría', 'Descripción', 'Beneficiario', 'Método', 'Monto', 'Acciones'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((e) => (
                <>
                  <tr key={e.id} className="table-row cursor-pointer" onClick={() => setExpanded(expandedId === e.id ? null : e.id)}>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-slate-300" />
                        {fmt(e.date)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CAT_COLOR[e.category] ?? CAT_COLOR['Otros']}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-gray-200">
                      <div className="flex items-center gap-2">
                        {e.description}
                        {e.recurring && (
                          <span title={PERIOD_LABELS[e.period ?? 'monthly']}
                            className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <RefreshCw size={10} /> {e.period === 'monthly' ? 'Mensual' : e.period === 'weekly' ? 'Sem.' : 'Anual'}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400">{e.beneficiary || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-gray-400">
                        <CreditCard size={11} />{e.paymentMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-red-600 dark:text-red-400 whitespace-nowrap">
                      — {formatCOP(e.amount)}
                    </td>
                    <td className="px-4 py-3" onClick={(ev) => ev.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button className="btn btn-sm btn-secondary flex items-center gap-1"
                          onClick={() => setEdit(e)}>
                          <Edit2 size={12} />
                        </button>
                        {canDelete('sales') && (
                          <button className="btn btn-sm flex items-center gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                            onClick={() => setDelete(e)}>
                            <Trash2 size={12} />
                          </button>
                        )}
                        {expandedId === e.id
                          ? <ChevronUp size={14} className="text-slate-400" />
                          : <ChevronDown size={14} className="text-slate-400" />
                        }
                      </div>
                    </td>
                  </tr>
                  {expandedId === e.id && e.notes && (
                    <tr key={`${e.id}-notes`} className="bg-slate-50 dark:bg-gray-700/30">
                      <td colSpan={7} className="px-6 pb-3 pt-1 text-xs text-slate-500 dark:text-gray-400 italic">
                        <Tag size={11} className="inline mr-1.5 text-slate-300" />{e.notes}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
          </div>
        )}
        {/* Total footer */}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-gray-700 flex justify-between items-center">
            <span className="text-xs text-slate-400 dark:text-gray-500">{filtered.length} registros</span>
            <span className="text-sm font-bold text-red-600 dark:text-red-400">
              Total: — {formatCOP(filtered.reduce((a, e) => a + e.amount, 0))}
            </span>
          </div>
        )}
        <div className="px-4 pb-2">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      {/* Modals */}
      {showModal    && <ExpenseModal onClose={() => setShowModal(false)} />}
      {editTarget   && <ExpenseModal initial={editTarget} onClose={() => setEdit(null)} />}
      {deleteTarget && (
        <ConfirmDelete
          name={`${deleteTarget.description} — ${formatCOP(deleteTarget.amount)}`}
          loading={deleting}
          onCancel={() => setDelete(null)}
          onConfirm={async () => {
            setDeleting(true)
            await deleteExpense(deleteTarget.id)
            setDeleting(false)
            setDelete(null)
          }}
        />
      )}
    </div>
  )
}
