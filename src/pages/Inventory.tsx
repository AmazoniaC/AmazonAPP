import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Plus, AlertTriangle, Search, Package, ArrowUpCircle, ArrowDownCircle, X, Trash2, Pencil, ShoppingCart, ChevronDown, ChevronUp, Upload, Layers, Boxes } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Supply } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmDelete from '../components/ConfirmDelete'
import ImportModal from '../components/ImportModal'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { formatCOP } from '../utils/currency'

const UNITS = ['u','kg','g','lb','oz','L','mL','m','cm','mm','m²','m³','rollo','par','caja','doc','bolsa']

function StockBar({ value, min }: { value: number; min: number }) {
  const pct = Math.min((value / (min * 2)) * 100, 100)
  const color = value < min ? 'bg-red-500' : value < min * 1.5 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="w-20 h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

function MovementModal({ supply, onClose }: { supply: Supply; onClose: () => void }) {
  const { updateSupply, addInventoryMovement, user } = useStore()
  const [type, setType] = useState<'entry' | 'exit'>('entry')
  const [qty, setQty] = useState('')
  const [notes, setNotes] = useState('')

  const handleSave = async () => {
    const n = parseFloat(qty)
    if (!n || n <= 0) return
    const newStock = type === 'entry' ? supply.stock + n : Math.max(0, supply.stock - n)
    await updateSupply({ ...supply, stock: newStock })
    await addInventoryMovement({
      id: `im${Date.now()}`,
      itemId: supply.id,
      itemName: supply.name,
      itemType: 'supply',
      movementType: type,
      quantity: n,
      previousStock: supply.stock,
      newStock,
      unit: supply.unit,
      reference: '',
      notes: notes.trim(),
      createdBy: user?.name || 'Sistema',
      createdAt: new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
          <h3 className="font-semibold text-slate-800 dark:text-white">Registrar movimiento</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-sm text-slate-500 dark:text-gray-400">Insumo</p>
            <p className="font-semibold text-slate-800 dark:text-white">{supply.name}</p>
            <p className="text-xs text-slate-400 dark:text-gray-500">Stock actual: {supply.stock} {supply.unit}</p>
          </div>
          <div>
            <label className="label">Tipo de movimiento</label>
            <div className="grid grid-cols-2 gap-2">
              {(['entry','exit'] as const).map((t) => (
                <button key={t} onClick={() => setType(t)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                    type === t
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 dark:border-gray-600 text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-700'
                  }`}>
                  {t === 'entry' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                  {t === 'entry' ? 'Entrada' : 'Salida'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Cantidad ({supply.unit})</label>
            <input className="input" type="number" min="0" step="0.01" value={qty}
              onChange={(e) => setQty(e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label className="label">Notas (opcional)</label>
            <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Motivo del movimiento..." />
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

function SupplyModal({ supply, onClose }: { supply?: Supply; onClose: () => void }) {
  const { addSupply, updateSupply } = useStore()
  const [form, setForm] = useState<Partial<Supply>>(supply ?? {
    sku: `INS-${crypto.randomUUID().replace(/-/g,'').slice(0,8).toUpperCase()}`,
    name: '', category: '', unit: 'kg',
    stock: 0, minStock: 0, cost: 0, supplier: '',
  })

  const handleSave = () => {
    if (!form.name) return
    const s = form as Supply
    if (supply) { updateSupply({ ...supply, ...s }) } else {
      addSupply({ ...s, id: crypto.randomUUID() })
    }
    onClose()
  }

  const field = (k: keyof Supply, label: string, type = 'text') => (
    <div key={k}>
      <label className="label">{label}</label>
      <input className="input" type={type} value={String(form[k] ?? '')}
        onChange={(e) => setForm({ ...form, [k]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value })} />
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
          <h3 className="font-semibold text-slate-800 dark:text-white">{supply ? 'Editar insumo' : 'Nuevo insumo'}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600" /></button>
        </div>
        <div className="px-6 py-5 grid grid-cols-2 gap-4">
          {field('sku', 'SKU')}
          {field('name', 'Nombre')}
          {field('category', 'Categoría')}
          <div>
            <label className="label">Unidad</label>
            <select className="input" value={form.unit ?? 'kg'} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
              {UNITS.map((u) => <option key={u}>{u}</option>)}
            </select>
          </div>
          {field('stock',    'Stock actual', 'number')}
          {field('minStock', 'Stock mínimo', 'number')}
          {field('cost',     'Costo / unidad ($)', 'number')}
          {field('supplier', 'Proveedor')}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}>
            {supply ? 'Actualizar' : 'Crear insumo'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Inventory() {
  const { supplies, deleteSupply, loadAllData } = useStore()
  const { canEdit, canDelete } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch]           = useState('')
  const [catFilter, setCatFilter]     = useState('Todos')
  const [movSupply, setMovSupply]     = useState<Supply | null>(null)
  const [editSupply, setEditSupply]   = useState<Supply | undefined>()
  const [showModal, setShowModal]     = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Supply | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [page, setPage]                 = useState(1)
  const [showReorder, setShowReorder]   = useState(true)
  const [showImport, setShowImport]     = useState(false)
  const PAGE_SIZE = 20

  // Smart reorder suggestions: items below min stock, suggest ordering to 2x min
  const reorderSuggestions = useMemo(() => {
    return supplies
      .filter(s => s.stock < s.minStock)
      .map(s => ({
        ...s,
        deficit: s.minStock - s.stock,
        suggestedQty: Math.ceil((s.minStock * 2) - s.stock),
        estimatedCost: Math.ceil((s.minStock * 2) - s.stock) * s.cost,
      }))
      .sort((a, b) => (a.stock / a.minStock) - (b.stock / b.minStock))
  }, [supplies])

  const totalReorderCost = reorderSuggestions.reduce((a, s) => a + s.estimatedCost, 0)

  // Deep link: ?open=ID → open the supply edit modal
  useEffect(() => {
    const id = searchParams.get('open')
    if (!id || supplies.length === 0) return
    const supply = supplies.find((s) => s.id === id)
    if (supply) {
      setEditSupply(supply)
      setShowModal(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, supplies, setSearchParams])

  const categories = ['Todos', ...Array.from(new Set(supplies.map((s) => s.category)))]
  const filtered   = supplies.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.sku.toLowerCase().includes(search.toLowerCase())
    const matchCat    = catFilter === 'Todos' || s.category === catFilter
    return matchSearch && matchCat
  })
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const lowStock  = supplies.filter((s) => s.stock < s.minStock).length
  const totalVal  = supplies.reduce((a, s) => a + s.stock * s.cost, 0)

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Package}
        title="Inventario"
        subtitle="Gestión de insumos y materias primas"
        actions={
          <>
            <Link to="/inventory/movements" className="btn btn-sm btn-secondary">
              <ArrowUpCircle size={13} /> Movimientos
            </Link>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={13} /> Importar
            </button>
            <button className="btn btn-sm btn-primary" onClick={() => { setEditSupply(undefined); setShowModal(true) }}>
              <Plus size={14} /> Nuevo insumo
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard icon={Boxes}         label="Total insumos"     value={supplies.length}        accent="#3b82f6" />
        <StatCard icon={AlertTriangle} label="Bajo stock"        value={lowStock}               accent="#ef4444" hint={lowStock > 0 ? 'Requiere atención' : 'Todo en orden'} />
        <StatCard icon={Layers}        label="Categorías"        value={categories.length - 1} accent="#0d9488" />
        <StatCard icon={Package}       label="Valor inventario"  value={formatCOP(totalVal)}    accent="#8b5cf6" />
      </div>

      {/* Smart Reorder Suggestions */}
      {reorderSuggestions.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-amber-200/70 dark:border-amber-800/60"
             style={{ background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.6) 0%, rgba(254, 215, 170, 0.3) 100%)' }}>
          <button onClick={() => setShowReorder(!showReorder)}
            className="relative w-full flex items-center justify-between px-5 py-3 hover:bg-amber-100/40 dark:hover:bg-amber-900/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <ShoppingCart size={16} className="text-amber-700" />
              </div>
              <div className="text-left">
                <p className="font-bold text-amber-900 dark:text-amber-300 text-sm">
                  Sugerencias de reorden
                </p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                  {reorderSuggestions.length} insumos · estimado {formatCOP(totalReorderCost)}
                </p>
              </div>
            </div>
            {showReorder ? <ChevronUp size={16} className="text-amber-600" /> : <ChevronDown size={16} className="text-amber-600" />}
          </button>
          {showReorder && (
            <div className="p-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-gray-700">
                    {['Insumo','Proveedor','Stock actual','Mínimo','Déficit','Cant. sugerida','Costo estimado'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-xs font-semibold text-slate-500 dark:text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reorderSuggestions.map(s => (
                    <tr key={s.id} className="border-b border-slate-50 dark:border-gray-700 hover:bg-amber-50/50 dark:hover:bg-amber-900/10">
                      <td className="px-3 py-2.5 font-medium text-slate-800 dark:text-gray-200">{s.name}</td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-gray-400 text-xs">{s.supplier || '—'}</td>
                      <td className="px-3 py-2.5 text-red-600 dark:text-red-400 font-bold">{s.stock} {s.unit}</td>
                      <td className="px-3 py-2.5 text-slate-500 dark:text-gray-400">{s.minStock} {s.unit}</td>
                      <td className="px-3 py-2.5 text-red-600 dark:text-red-400 font-semibold">-{s.deficit.toFixed(1)} {s.unit}</td>
                      <td className="px-3 py-2.5 font-bold text-blue-600 dark:text-blue-400">{s.suggestedQty} {s.unit}</td>
                      <td className="px-3 py-2.5 font-semibold text-slate-700 dark:text-gray-200">{formatCOP(s.estimatedCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-gray-700">
                <p className="text-xs text-slate-500 dark:text-gray-400">
                  Cantidad sugerida: reponer al doble del stock mínimo
                </p>
                <Link to="/purchases" className="btn btn-sm btn-primary flex items-center gap-1">
                  <ShoppingCart size={13} /> Ir a Órdenes de Compra
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card p-3 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por nombre o SKU..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {categories.map((c) => (
            <button key={c} onClick={() => { setCatFilter(c); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                catFilter === c
                  ? 'bg-amazonia-700 text-white shadow-soft ring-1 ring-inset ring-amazonia-600/30'
                  : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-600 hover:border-amazonia-400 hover:text-amazonia-700'
              }`}>{c}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
              {['SKU','Nombre','Categoría','Stock','Mín','Estado','Costo/u','Valor','Acciones'].map((h) => (
                <th key={h} className="text-left px-2 py-2 text-xs font-semibold text-slate-500 dark:text-gray-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((s) => {
              const status = s.stock < s.minStock ? 'bajo' : s.stock < s.minStock * 1.5 ? 'alerta' : 'ok'
              return (
                <tr key={s.id} className="table-row">
                  <td className="px-2 py-2 font-mono text-xs text-slate-400 dark:text-gray-500">{s.sku}</td>
                  <td className="px-2 py-2 font-medium text-slate-800 dark:text-gray-200 whitespace-nowrap">{s.name}</td>
                  <td className="px-2 py-2 text-slate-500 dark:text-gray-400">{s.category}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold ${status === 'bajo' ? 'text-red-600' : status === 'alerta' ? 'text-amber-600' : 'text-slate-800 dark:text-gray-200'}`}>
                        {s.stock} {s.unit}
                      </span>
                      <StockBar value={s.stock} min={s.minStock} />
                    </div>
                  </td>
                  <td className="px-2 py-2 text-slate-500 dark:text-gray-400">{s.minStock} {s.unit}</td>
                  <td className="px-2 py-2">
                    <span className={`badge ${status === 'bajo' ? 'badge-red' : status === 'alerta' ? 'badge-yellow' : 'badge-green'}`}>
                      {status === 'bajo' ? 'Bajo' : status === 'alerta' ? 'Alerta' : 'OK'}
                    </span>
                  </td>
                  <td className="px-2 py-2 text-slate-600 dark:text-gray-300 whitespace-nowrap">{formatCOP(s.cost)}</td>
                  <td className="px-2 py-2 font-semibold text-slate-700 dark:text-gray-200 whitespace-nowrap">{formatCOP(s.stock * s.cost)}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <button className="btn btn-sm btn-secondary" onClick={() => setMovSupply(s)}>
                        Mov
                      </button>
                      {canEdit('supplies') && (
                        <button className="btn btn-sm btn-secondary flex items-center gap-1"
                          onClick={() => { setEditSupply(s); setShowModal(true) }}>
                          <Pencil size={12} />
                        </button>
                      )}
                      {canDelete('supplies') && (
                        <button className="btn btn-sm flex items-center gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                          onClick={() => setDeleteTarget(s)}>
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-gray-600">
            <Package size={36} className="mx-auto mb-3 opacity-30" />
            <p>No se encontraron insumos</p>
          </div>
        )}
        <div className="px-4 pb-2">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      {movSupply && <MovementModal supply={movSupply} onClose={() => setMovSupply(null)} />}
      {showModal && <SupplyModal supply={editSupply} onClose={() => setShowModal(false)} />}
      {showImport && (
        <ImportModal
          entity="supplies"
          onClose={() => setShowImport(false)}
          onSuccess={() => loadAllData(true)}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deleteSupply(deleteTarget.id)
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
