import { useState, useMemo, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, Search, X, ShoppingCart, Clock, CheckCircle, AlertTriangle,
  Pencil, Trash2, FileSpreadsheet, PackageCheck, ChevronDown, ChevronUp, Building2, Truck,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { PurchaseOrder, PurchaseOrderItem } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmDelete from '../components/ConfirmDelete'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { formatCOP } from '../utils/currency'
import * as XLSX from 'xlsx'

// ── Constants ──────────────────────────────────────────────────────────────

type Status = PurchaseOrder['status']

const STATUS_META: Record<Status, { label: string; badge: string; icon: React.ElementType }> = {
  draft:     { label: 'Borrador',  badge: 'badge-gray',   icon: Clock },
  sent:      { label: 'Enviada',   badge: 'badge-blue',   icon: Clock },
  partial:   { label: 'Parcial',   badge: 'badge-yellow', icon: AlertTriangle },
  received:  { label: 'Recibida',  badge: 'badge-green',  icon: CheckCircle },
  cancelled: { label: 'Cancelada', badge: 'badge-red',    icon: X },
}

// ── PO Modal (create / edit) ───────────────────────────────────────────────

function POModal({ order, onClose }: { order?: PurchaseOrder; onClose: () => void }) {
  const { supplies, purchaseOrders, addPurchaseOrder, updatePurchaseOrder } = useStore()
  const nextNum = String(purchaseOrders.length + 1).padStart(3, '0')
  const today   = new Date().toISOString().split('T')[0]

  const [supplier, setSupplier] = useState(order?.supplier ?? '')
  const [date,     setDate]     = useState(order?.date     ?? today)
  const [expected, setExpected] = useState(order?.expectedDate ?? '')
  const [status,   setStatus]   = useState<Status>(order?.status ?? 'draft')
  const [notes,    setNotes]    = useState(order?.notes ?? '')
  const [items,    setItems]    = useState<PurchaseOrderItem[]>(
    order?.items ?? [{ supplyId: '', supplyName: '', unit: '', qty: 1, unitCost: 0, subtotal: 0 }]
  )

  const addItem = () => setItems([...items, { supplyId: '', supplyName: '', unit: '', qty: 1, unitCost: 0, subtotal: 0 }])
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i))

  const setItemField = (i: number, field: string, value: string | number) => {
    setItems(items.map((item, idx) => {
      if (idx !== i) return item
      const updated = { ...item, [field]: value }
      if (field === 'supplyId') {
        const sup = supplies.find((s) => s.id === value)
        if (sup) {
          updated.supplyName = sup.name
          updated.unit       = sup.unit
          updated.unitCost   = sup.cost
          updated.subtotal   = parseFloat((updated.qty * sup.cost).toFixed(0))
        }
      }
      if (field === 'qty' || field === 'unitCost') {
        const qty     = field === 'qty'     ? Number(value) : item.qty
        const cost    = field === 'unitCost' ? Number(value) : item.unitCost
        updated.subtotal = parseFloat((qty * cost).toFixed(0))
      }
      return updated
    }))
  }

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)

  const handleSave = async () => {
    if (!supplier.trim() || items.some((i) => !i.supplyId)) return
    const po: PurchaseOrder = {
      id:          order?.id ?? `oc${Date.now()}`,
      orderNumber: order?.orderNumber ?? `OC-${new Date().getFullYear()}-${nextNum}`,
      supplier:    supplier.trim(),
      status,
      date,
      expectedDate: expected || undefined,
      receivedDate: order?.receivedDate,
      items,
      subtotal,
      total: subtotal,
      notes: notes.trim() || undefined,
    }
    if (order) await updatePurchaseOrder(po)
    else        await addPurchaseOrder(po)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
          <h3 className="font-semibold text-slate-800 dark:text-white">
            {order ? 'Editar orden de compra' : 'Nueva orden de compra'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Proveedor *</label>
              <input className="input" placeholder="Nombre del proveedor" value={supplier}
                onChange={(e) => setSupplier(e.target.value)} />
            </div>
            <div>
              <label className="label">Fecha</label>
              <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Fecha esperada</label>
              <input className="input" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
                {(Object.keys(STATUS_META) as Status[]).map((s) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Insumos *</label>
              <button className="btn btn-sm btn-secondary flex items-center gap-1" onClick={addItem}>
                <Plus size={13} /> Agregar insumo
              </button>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 dark:bg-gray-700 rounded-xl p-3">
                  <div className="col-span-5">
                    <select className="input text-sm" value={item.supplyId}
                      onChange={(e) => setItemField(i, 'supplyId', e.target.value)}>
                      <option value="">Seleccionar insumo...</option>
                      {supplies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input className="input text-sm" type="number" min={0.01} step={0.01} placeholder="Cant."
                      value={item.qty}
                      onChange={(e) => setItemField(i, 'qty', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-3">
                    <input className="input text-sm" type="number" min={0} placeholder="Costo unit."
                      value={item.unitCost}
                      onChange={(e) => setItemField(i, 'unitCost', parseFloat(e.target.value) || 0)} />
                  </div>
                  <div className="col-span-1 text-right">
                    <p className="text-xs text-slate-500 dark:text-gray-400">{item.unit}</p>
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)}
                        className="text-slate-300 hover:text-red-400 transition-colors">
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  {item.supplyId && (
                    <div className="col-span-12 flex justify-end">
                      <span className="text-xs text-slate-400 dark:text-gray-500">
                        Subtotal: {formatCOP(item.subtotal)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes + total */}
          <div>
            <label className="label">Notas</label>
            <textarea className="input resize-none" rows={2} placeholder="Observaciones..."
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex justify-end">
            <div className="bg-slate-50 dark:bg-gray-700 rounded-xl px-4 py-3 text-right">
              <p className="text-xs text-slate-400 dark:text-gray-500">Total orden</p>
              <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCOP(subtotal)}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}>
            {order ? 'Actualizar' : 'Crear orden'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Receive Modal ──────────────────────────────────────────────────────────

function ReceiveModal({ order, onClose }: { order: PurchaseOrder; onClose: () => void }) {
  const { receivePurchaseOrder, supplies } = useStore()
  const [qtyMap, setQtyMap] = useState<Record<string, number>>(
    Object.fromEntries(order.items.map((i) => [i.supplyId, i.qty - (i.receivedQty ?? 0)]))
  )
  const [saving, setSaving] = useState(false)

  const handleReceive = async () => {
    setSaving(true)
    await receivePurchaseOrder(order.id, qtyMap)
    setSaving(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Recibir orden</h3>
            <p className="text-xs text-slate-400 dark:text-gray-500">{order.orderNumber} — {order.supplier}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-3">
          {order.items.map((item) => {
            const pending   = item.qty - (item.receivedQty ?? 0)
            const curSupply = supplies.find((s) => s.id === item.supplyId)
            return (
              <div key={item.supplyId} className="bg-slate-50 dark:bg-gray-700 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{item.supplyName}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-500">
                      Pedido: {item.qty} {item.unit} · Ya recibido: {item.receivedQty ?? 0} · Pendiente: {pending}
                    </p>
                    {curSupply && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400">
                        Stock actual: {curSupply.stock} {curSupply.unit}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-slate-500 dark:text-gray-400 flex-shrink-0">Cant. a recibir:</label>
                  <input className="input text-sm flex-1" type="number" min={0} max={pending}
                    value={qtyMap[item.supplyId] ?? 0}
                    onChange={(e) => setQtyMap({ ...qtyMap, [item.supplyId]: Math.min(pending, parseFloat(e.target.value) || 0) })} />
                  <span className="text-xs text-slate-400 dark:text-gray-500 flex-shrink-0">{item.unit}</span>
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1 flex items-center gap-2 justify-center"
            onClick={handleReceive} disabled={saving}>
            <PackageCheck size={15} />
            {saving ? 'Guardando...' : 'Confirmar recepción'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PO Row / Card ──────────────────────────────────────────────────────────

function POCard({ order, onEdit, onDelete, onReceive, canEdit, canDelete }: {
  order: PurchaseOrder
  onEdit: () => void; onDelete: () => void; onReceive: () => void
  canEdit: boolean; canDelete: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const meta = STATUS_META[order.status]
  const Icon = meta.icon
  const canReceive = order.status === 'sent' || order.status === 'partial'

  return (
    <div className="card overflow-hidden">
      {/* Header row */}
      <div className="p-4 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
          <Building2 size={18} className="text-slate-500 dark:text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 dark:text-white text-sm">{order.orderNumber}</span>
            <span className={`badge ${meta.badge} flex items-center gap-1`}>
              <Icon size={10} /> {meta.label}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-gray-300 font-medium">{order.supplier}</p>
          <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-gray-500 mt-0.5">
            <span>Fecha: {order.date}</span>
            {order.expectedDate && <span>Esperada: {order.expectedDate}</span>}
            {order.receivedDate && <span className="text-emerald-600 dark:text-emerald-400">Recibida: {order.receivedDate}</span>}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-bold text-slate-800 dark:text-white">{formatCOP(order.total)}</p>
          <p className="text-xs text-slate-400 dark:text-gray-500">{order.items.length} insumo{order.items.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Expanded items */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-gray-700 px-4 py-3 space-y-2">
          {order.items.map((item) => (
            <div key={item.supplyId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-slate-600 dark:text-gray-300 truncate">{item.supplyName}</span>
                <span className="text-xs text-slate-400 dark:text-gray-500">× {item.qty} {item.unit}</span>
              </div>
              <div className="text-right flex-shrink-0 ml-4">
                <span className="font-medium text-slate-700 dark:text-gray-200">{formatCOP(item.subtotal)}</span>
                {item.receivedQty !== undefined && (
                  <div className="text-xs text-slate-400 dark:text-gray-500">
                    Rec: {item.receivedQty}/{item.qty}
                  </div>
                )}
              </div>
            </div>
          ))}
          {order.notes && (
            <p className="text-xs text-slate-400 dark:text-gray-500 italic mt-1">{order.notes}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-slate-100 dark:border-gray-700 px-4 py-2.5 flex items-center gap-2">
        <button className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 flex items-center gap-1 transition-colors"
          onClick={() => setExpanded(!expanded)}>
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Ocultar' : 'Ver insumos'}
        </button>
        <div className="flex-1" />
        {canReceive && (
          <button className="btn btn-sm flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
            onClick={onReceive}>
            <PackageCheck size={12} /> Recibir
          </button>
        )}
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
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────

export default function PurchaseOrders() {
  const { purchaseOrders, deletePurchaseOrder } = useStore()
  const { canEdit, canDelete } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search,     setSearch]     = useState('')
  const [statusFilter, setStatus]   = useState<'all' | Status>('all')
  const [showModal,  setShowModal]  = useState(false)
  const [editOrder,  setEditOrder]  = useState<PurchaseOrder | undefined>()
  const [receiveOrder, setReceive]  = useState<PurchaseOrder | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PurchaseOrder | null>(null)
  const [deleting,   setDeleting]   = useState(false)
  const [page,       setPage]       = useState(1)

  // Deep link: ?open=ID → auto-open the order modal
  useEffect(() => {
    const id = searchParams.get('open')
    if (!id || purchaseOrders.length === 0) return
    const order = purchaseOrders.find((o) => o.id === id)
    if (order) {
      setEditOrder(order)
      setShowModal(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, purchaseOrders, setSearchParams])
  const PAGE_SIZE = 10

  const filtered = useMemo(() =>
    purchaseOrders.filter((o) => {
      const q = search.toLowerCase()
      const matchSearch = o.supplier.toLowerCase().includes(q) || o.orderNumber.toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || o.status === statusFilter
      return matchSearch && matchStatus
    }),
    [purchaseOrders, search, statusFilter]
  )
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // KPIs
  const total        = purchaseOrders.length
  const pending      = purchaseOrders.filter((o) => o.status === 'sent' || o.status === 'partial').length
  const totalCost    = purchaseOrders.filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0)
  const received     = purchaseOrders.filter((o) => o.status === 'received').length

  const handleExcel = () => {
    const data = filtered.map((o) => ({
      'N° Orden':        o.orderNumber,
      Proveedor:         o.supplier,
      Estado:            STATUS_META[o.status].label,
      Fecha:             o.date,
      'Fecha Esperada':  o.expectedDate ?? '',
      'Fecha Recibida':  o.receivedDate ?? '',
      Total:             o.total,
      Notas:             o.notes ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Compras')
    XLSX.writeFile(wb, `OC-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Truck}
        title="Órdenes de Compra"
        subtitle="Gestión de compras a proveedores"
        accent="rgba(139, 92, 246, 0.20)"
        actions={
          <>
            <button className="btn btn-sm btn-secondary flex items-center gap-2" onClick={handleExcel}>
              <FileSpreadsheet size={14} /> Exportar
            </button>
            <button className="btn btn-sm btn-primary flex items-center gap-2"
              onClick={() => { setEditOrder(undefined); setShowModal(true) }}>
              <Plus size={14} /> Nueva orden
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard icon={ShoppingCart} label="Total OC" value={total} accent="#8b5cf6" />
        <StatCard icon={Clock} label="Por recibir" value={pending} accent="#2563eb" />
        <StatCard icon={CheckCircle} label="Recibidas" value={received} accent="#10b981" />
        <StatCard icon={Building2} label="Costo total" value={formatCOP(totalCost)} accent="#f59e0b" />
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por proveedor u orden..."
            value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {([['all', 'Todos'], ...Object.entries(STATUS_META).map(([k, v]) => [k, v.label])] as [string, string][]).map(([v, l]) => (
            <button key={v} onClick={() => { setStatus(v as 'all' | Status); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === v
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {paginated.map((o) => (
          <POCard key={o.id} order={o}
            canEdit={canEdit('supplies')} canDelete={canDelete('supplies')}
            onEdit={() => { setEditOrder(o); setShowModal(true) }}
            onDelete={() => setDeleteTarget(o)}
            onReceive={() => setReceive(o)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400 dark:text-gray-600">
            <ShoppingCart size={40} className="mx-auto mb-3 opacity-30" />
            <p>No se encontraron órdenes de compra</p>
          </div>
        )}
      </div>
      <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />

      {/* Modals */}
      {showModal && <POModal order={editOrder} onClose={() => { setShowModal(false); setEditOrder(undefined) }} />}
      {receiveOrder && <ReceiveModal order={receiveOrder} onClose={() => setReceive(null)} />}
      {deleteTarget && (
        <ConfirmDelete
          name={`${deleteTarget.orderNumber} — ${deleteTarget.supplier}`}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deletePurchaseOrder(deleteTarget.id)
              setDeleteTarget(null)
            } finally {
              setDeleting(false)
            }
          }}
        />
      )}
    </div>
  )
}
