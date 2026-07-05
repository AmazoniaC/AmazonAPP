import { useState } from 'react'
import {
  Truck, Plus, Search, X, Trash2, Edit2, AlertCircle,
  Phone, Mail, MapPin, CheckCircle, XCircle, Building2, Layers,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Supplier } from '../data/mockData'
import ConfirmDelete from '../components/ConfirmDelete'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { formatCOP } from '../utils/currency'
import * as XLSX from 'xlsx'

const CATEGORIES = ['Cementos', 'Agregados', 'Pigmentos', 'Refuerzos', 'Acabados', 'Auxiliares', 'Sustratos', 'Otro']

// ── Modal ───────────────────────────────────────────────────────────────────
function SupplierModal({ initial, onClose }: { initial?: Supplier; onClose: () => void }) {
  const { addSupplier, updateSupplier } = useStore()
  const [form, setForm] = useState<Partial<Supplier>>(initial ?? { isActive: true, category: '' })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name?.trim()) e.name = 'Requerido'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const supplier: Supplier = {
        id:          initial?.id ?? `sup${Date.now()}`,
        name:        form.name!.trim(),
        contactName: form.contactName ?? '',
        email:       form.email ?? '',
        phone:       form.phone ?? '',
        address:     form.address ?? '',
        city:        form.city ?? '',
        category:    form.category ?? '',
        notes:       form.notes ?? '',
        isActive:    form.isActive ?? true,
        leadTimeDays:  form.leadTimeDays ?? 0,
        paymentTerms:  form.paymentTerms ?? 0,
        minOrderValue: form.minOrderValue ?? 0,
      }
      if (initial) await updateSupplier(supplier)
      else await addSupplier(supplier)
      onClose()
    } catch { /* handled */ } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fadeIn" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="font-bold text-slate-800 dark:text-white">{initial ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="label">Nombre / Razón social *</label>
            <input className={`input ${errors.name ? 'border-red-400' : ''}`} value={form.name ?? ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contacto</label>
              <input className="input" value={form.contactName ?? ''} onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <select className="input" value={form.category ?? ''} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                <option value="">— Sin categoría —</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" value={form.email ?? ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="label">Teléfono</label>
              <input className="input" value={form.phone ?? ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Dirección</label>
              <input className="input" value={form.address ?? ''} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div>
              <label className="label">Ciudad</label>
              <input className="input" value={form.city ?? ''} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
            </div>
          </div>
          {/* ── Términos comerciales ── */}
          <div className="pt-4 border-t border-slate-100 dark:border-gray-700">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 mb-3">Términos comerciales</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Lead time (días)</label>
                <input className="input" type="number" min="0" max="180"
                  value={form.leadTimeDays ?? ''}
                  onChange={e => setForm(f => ({ ...f, leadTimeDays: parseInt(e.target.value) || 0 }))}
                  placeholder="0" />
                <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">Días típicos de entrega</p>
              </div>
              <div>
                <label className="label">Plazo pago (días)</label>
                <input className="input" type="number" min="0" max="365"
                  value={form.paymentTerms ?? ''}
                  onChange={e => setForm(f => ({ ...f, paymentTerms: parseInt(e.target.value) || 0 }))}
                  placeholder="0 = contado" />
              </div>
              <div>
                <label className="label">Compra mínima ($)</label>
                <input className="input" type="number" min="0" step="10000"
                  value={form.minOrderValue ?? ''}
                  onChange={e => setForm(f => ({ ...f, minOrderValue: parseFloat(e.target.value) || 0 }))}
                  placeholder="0 = sin mínimo" />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Notas</label>
            <textarea className="input" rows={2} value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isActive ?? true} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 rounded text-blue-600" />
            <span className="text-sm text-slate-700 dark:text-gray-300">Proveedor activo</span>
          </label>
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

export default function SuppliersPage() {
  const { suppliers, deleteSupplier, purchaseOrders } = useStore()
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState('')
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('')
  const [modal, setModal] = useState<Supplier | 'new' | null>(null)
  const [deleting, setDeleting] = useState<Supplier | null>(null)
  const [detail, setDetail] = useState<Supplier | null>(null)
  const [page, setPage] = useState(1)

  const filtered = suppliers.filter(s => {
    const q = search.toLowerCase()
    const match = !q || s.name.toLowerCase().includes(q) || s.contactName?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q)
    const catMatch = !catFilter || s.category === catFilter
    const actMatch = activeFilter === '' || String(s.isActive) === activeFilter
    return match && catMatch && actMatch
  })

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const totalActive = suppliers.filter(s => s.isActive).length
  const categories = [...new Set(suppliers.map(s => s.category).filter(Boolean))]

  const handleDelete = async () => {
    if (!deleting) return
    await deleteSupplier(deleting.id)
    setDeleting(null)
  }

  const exportExcel = () => {
    const data = filtered.map(s => ({
      'Nombre': s.name, 'Contacto': s.contactName, 'Email': s.email,
      'Teléfono': s.phone, 'Ciudad': s.city, 'Categoría': s.category,
      'Activo': s.isActive ? 'Sí' : 'No',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Proveedores')
    XLSX.writeFile(wb, 'proveedores.xlsx')
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Building2}
        title="Proveedores"
        subtitle="Directorio de proveedores y aliados"
        accent="rgba(15, 118, 110, 0.20)"
        actions={
          <>
            <button className="btn btn-sm btn-secondary" onClick={exportExcel}>Excel</button>
            <button className="btn btn-sm btn-primary flex items-center gap-1.5" onClick={() => setModal('new')}>
              <Plus size={14} /> Nuevo Proveedor
            </button>
          </>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 stagger-children">
        <StatCard icon={Building2} label="Total proveedores" value={suppliers.length} accent="#0f766e" />
        <StatCard icon={CheckCircle} label="Activos" value={totalActive} accent="#2563eb" />
        <StatCard icon={Layers} label="Categorías" value={categories.length} accent="#8b5cf6" />
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9 w-full" placeholder="Buscar proveedor..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="input w-40" value={catFilter} onChange={e => { setCatFilter(e.target.value); setPage(1) }}>
            <option value="">Todas las categorías</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className="input w-32" value={activeFilter} onChange={e => { setActiveFilter(e.target.value as '' | 'true' | 'false'); setPage(1) }}>
            <option value="">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Grid cards */}
      {paged.length === 0 ? (
        <div className="card p-12 text-center text-slate-400 dark:text-gray-500">
          <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
          No se encontraron proveedores
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paged.map(s => (
            <div key={s.id} className="card p-5 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">{s.name}</h3>
                  {s.contactName && <p className="text-xs text-slate-500 dark:text-gray-400">{s.contactName}</p>}
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'}`}>
                  {s.isActive ? <CheckCircle size={10} /> : <XCircle size={10} />}
                  {s.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
              {s.category && (
                <span className="inline-block mb-3 px-2 py-0.5 bg-slate-100 dark:bg-gray-700 text-slate-600 dark:text-gray-300 rounded text-xs">{s.category}</span>
              )}
              <div className="space-y-1.5 text-xs text-slate-500 dark:text-gray-400">
                {s.email && <div className="flex items-center gap-1.5"><Mail size={12} /> {s.email}</div>}
                {s.phone && <div className="flex items-center gap-1.5"><Phone size={12} /> {s.phone}</div>}
                {s.city && <div className="flex items-center gap-1.5"><MapPin size={12} /> {s.city}{s.address ? ` — ${s.address}` : ''}</div>}
              </div>
              {s.notes && <p className="mt-2 text-xs text-slate-400 dark:text-gray-500 line-clamp-2">{s.notes}</p>}
              {/* Commercial terms chips */}
              {(s.leadTimeDays || s.paymentTerms || s.minOrderValue) ? (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {s.leadTimeDays ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      Lead {s.leadTimeDays}d
                    </span>
                  ) : null}
                  {s.paymentTerms ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300">
                      Net-{s.paymentTerms}
                    </span>
                  ) : null}
                  {s.minOrderValue ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                      Mín ${(s.minOrderValue / 1000).toFixed(0)}k
                    </span>
                  ) : null}
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-1 mt-4 pt-3 border-t border-slate-100 dark:border-gray-700">
                <button className="text-xs text-amazonia-700 dark:text-amazonia-400 hover:underline font-semibold" onClick={() => setDetail(s)}>
                  Ver historial →
                </button>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-600 transition-colors" onClick={() => setModal(s)} title="Editar">
                    <Edit2 size={14} className="text-slate-500 dark:text-gray-400" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" onClick={() => setDeleting(s)} title="Eliminar">
                    <Trash2 size={14} className="text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />

      {/* Modals */}
      {modal && <SupplierModal initial={modal === 'new' ? undefined : modal} onClose={() => setModal(null)} />}
      {deleting && <ConfirmDelete name={deleting.name} onConfirm={handleDelete} onCancel={() => setDeleting(null)} />}
      {detail && <SupplierDetailModal supplier={detail} purchaseOrders={purchaseOrders} onClose={() => setDetail(null)} onEdit={() => { setModal(detail); setDetail(null) }} />}
    </div>
  )
}

// ── Supplier detail modal — history, spend, lead-time performance ──────────
function SupplierDetailModal({ supplier, purchaseOrders, onClose, onEdit }: {
  supplier: Supplier
  purchaseOrders: any[]
  onClose: () => void
  onEdit: () => void
}) {
  // POs by this supplier (matched by name — loose)
  const supplierPOs = purchaseOrders.filter(
    (po: any) => (po.supplier || '').toLowerCase() === supplier.name.toLowerCase()
  )
  const activePOs   = supplierPOs.filter((po: any) => po.status !== 'cancelled')
  const receivedPOs = supplierPOs.filter((po: any) => po.status === 'received')

  const totalSpend = activePOs.reduce((sum: number, po: any) => sum + (po.total || 0), 0)
  const orderCount = supplierPOs.length
  const avgOrderValue = orderCount > 0 ? totalSpend / activePOs.length : 0

  // Actual lead-time performance (only for received orders where we know both dates)
  const leadTimes = receivedPOs
    .filter((po: any) => po.date && po.receivedDate)
    .map((po: any) => {
      const start = new Date(po.date + 'T12:00:00').getTime()
      const end   = new Date(po.receivedDate + 'T12:00:00').getTime()
      return Math.round((end - start) / 86400000)
    })
    .filter((n: number) => !isNaN(n) && n >= 0)
  const avgActualLead = leadTimes.length > 0
    ? Math.round(leadTimes.reduce((a: number, b: number) => a + b, 0) / leadTimes.length)
    : null

  // On-time %: received on or before expectedDate
  const onTimeStats = receivedPOs
    .filter((po: any) => po.expectedDate && po.receivedDate)
    .map((po: any) => po.receivedDate <= po.expectedDate)
  const onTimePct = onTimeStats.length > 0
    ? (onTimeStats.filter(Boolean).length / onTimeStats.length) * 100
    : null

  // Items supplied — flatten from PO line items, dedupe by supply name
  const items: Record<string, { qty: number; lastPrice: number; count: number; lastDate: string }> = {}
  activePOs.forEach((po: any) => {
    (po.items || []).forEach((it: any) => {
      const key = it.supplyName || it.productName || 'Sin nombre'
      if (!items[key]) items[key] = { qty: 0, lastPrice: it.unitCost || 0, count: 0, lastDate: po.date }
      items[key].qty += it.qty || it.quantity || 0
      items[key].count += 1
      if (po.date > items[key].lastDate) {
        items[key].lastDate = po.date
        items[key].lastPrice = it.unitCost || items[key].lastPrice
      }
    })
  })
  const topItems = Object.entries(items)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 8)

  // Recent POs — last 6
  const recentPOs = [...supplierPOs]
    .sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 6)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-slate-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #0f766e 0%, #134e4a 100%)', boxShadow: '0 4px 12px -2px rgba(15, 118, 110, 0.4)' }}>
              <Building2 size={18} className="text-white" strokeWidth={2.3} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 dark:text-white">{supplier.name}</h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                {supplier.contactName || '—'} · {supplier.city || 'Sin ciudad'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm btn-secondary" onClick={onEdit}>
              <Edit2 size={12} /> Editar
            </button>
            <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* KPI row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-slate-200 dark:border-gray-700 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Órdenes</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white tabular-nums mt-0.5">{orderCount}</p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500">{receivedPOs.length} recibidas</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-gray-700 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Gasto acumulado</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white tabular-nums mt-0.5">{formatCOP(totalSpend)}</p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500">promedio {formatCOP(avgOrderValue)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-gray-700 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Lead time real</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white tabular-nums mt-0.5">
                {avgActualLead !== null ? `${avgActualLead}d` : '—'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500">
                {supplier.leadTimeDays ? `esperado ${supplier.leadTimeDays}d` : 'sin esperado'}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-gray-700 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Cumplimiento</p>
              <p className={`text-lg font-bold tabular-nums mt-0.5 ${
                onTimePct === null ? 'text-slate-400' : onTimePct >= 80 ? 'text-emerald-600' : onTimePct >= 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {onTimePct !== null ? `${onTimePct.toFixed(0)}%` : '—'}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-gray-500">
                {onTimeStats.length > 0 ? `${onTimeStats.length} muestras` : 'sin datos'}
              </p>
            </div>
          </div>

          {/* Items supplied */}
          {topItems.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 mb-2">Insumos que provee</p>
              <div className="rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-gray-700/50">
                    <tr>
                      {['Insumo', 'Compras', 'Última compra', 'Último precio', 'Cant. acum.'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {topItems.map(([name, d]) => (
                      <tr key={name} className="border-t border-slate-100 dark:border-gray-700/60">
                        <td className="px-3 py-2 font-medium text-slate-700 dark:text-gray-200">{name}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-gray-400 tabular-nums text-xs">{d.count}×</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-gray-400 text-xs">{d.lastDate}</td>
                        <td className="px-3 py-2 tabular-nums font-semibold text-slate-800 dark:text-white">{formatCOP(d.lastPrice)}</td>
                        <td className="px-3 py-2 text-slate-500 dark:text-gray-400 tabular-nums text-xs">{d.qty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recent POs */}
          {recentPOs.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400 mb-2">Órdenes recientes</p>
              <div className="space-y-2">
                {recentPOs.map((po: any) => {
                  const statusColor: Record<string, string> = {
                    draft: 'bg-slate-100 text-slate-600', sent: 'bg-blue-100 text-blue-700',
                    partial: 'bg-amber-100 text-amber-700', received: 'bg-emerald-100 text-emerald-700',
                    cancelled: 'bg-red-100 text-red-700',
                  }
                  return (
                    <div key={po.id} className="rounded-xl border border-slate-200 dark:border-gray-700 p-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-mono text-xs text-slate-500 dark:text-gray-400">{po.orderNumber || po.id}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${statusColor[po.status] || 'bg-slate-100 text-slate-600'}`}>
                            {po.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                          {po.date} {po.expectedDate ? `· esperado ${po.expectedDate}` : ''} {po.receivedDate ? `· recibido ${po.receivedDate}` : ''}
                        </p>
                      </div>
                      <p className="font-bold text-slate-800 dark:text-white tabular-nums">{formatCOP(po.total || 0)}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {recentPOs.length === 0 && (
            <div className="text-center py-10 text-slate-400 dark:text-gray-500 text-sm">
              <AlertCircle size={28} className="mx-auto mb-2 opacity-40" />
              Este proveedor aún no tiene órdenes de compra registradas.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
