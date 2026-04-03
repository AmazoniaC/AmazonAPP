import { useState, useMemo, useEffect } from 'react'
import {
  ArrowUpCircle, ArrowDownCircle, RotateCcw, Settings2, PackageCheck,
  Search, TrendingUp, TrendingDown, Activity, Package, BarChart3,
  Calendar, Filter,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { InventoryMovement } from '../data/mockData'
import { formatCOP } from '../utils/currency'
import Pagination from '../components/Pagination'
import DateRangeFilter from '../components/DateRangeFilter'
import * as XLSX from 'xlsx'

// ── Constants ──────────────────────────────────────────────────────────────

const MOVEMENT_META: Record<string, { label: string; icon: React.ElementType; color: string; bg: string; textColor: string }> = {
  entry:      { label: 'Entrada',     icon: ArrowUpCircle,   color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30', textColor: 'text-emerald-700 dark:text-emerald-300' },
  exit:       { label: 'Salida',      icon: ArrowDownCircle, color: 'text-red-600 dark:text-red-400',         bg: 'bg-red-50 dark:bg-red-900/30',         textColor: 'text-red-700 dark:text-red-300' },
  adjustment: { label: 'Ajuste',      icon: Settings2,       color: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-900/30',     textColor: 'text-amber-700 dark:text-amber-300' },
  production: { label: 'Producción',  icon: PackageCheck,    color: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-900/30',       textColor: 'text-blue-700 dark:text-blue-300' },
  return:     { label: 'Devolución',  icon: RotateCcw,       color: 'text-violet-600 dark:text-violet-400',   bg: 'bg-violet-50 dark:bg-violet-900/30',   textColor: 'text-violet-700 dark:text-violet-300' },
}

const ALL_TYPES = Object.keys(MOVEMENT_META)

function fmt(d?: string) {
  if (!d) return '—'
  const date = new Date(d)
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTime(d?: string) {
  if (!d) return ''
  const date = new Date(d)
  return date.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
}

// ── Main Component ────────────────────────────────────────────────────────

export default function InventoryMovements() {
  const { inventoryMovements, loadInventoryMovements, supplies } = useStore()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [itemTypeFilter, setItemTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 20

  useEffect(() => { loadInventoryMovements() }, [])

  // ── Filtering ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return inventoryMovements.filter(m => {
      if (typeFilter !== 'all' && m.movementType !== typeFilter) return false
      if (itemTypeFilter !== 'all' && m.itemType !== itemTypeFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (!m.itemName.toLowerCase().includes(q) && !m.reference.toLowerCase().includes(q) && !m.notes.toLowerCase().includes(q)) return false
      }
      if (dateFrom) {
        const mDate = new Date(m.createdAt).toISOString().split('T')[0]
        if (mDate < dateFrom) return false
      }
      if (dateTo) {
        const mDate = new Date(m.createdAt).toISOString().split('T')[0]
        if (mDate > dateTo) return false
      }
      return true
    })
  }, [inventoryMovements, search, typeFilter, itemTypeFilter, dateFrom, dateTo])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Stats ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalEntries = inventoryMovements.filter(m => m.movementType === 'entry').length
    const totalExits = inventoryMovements.filter(m => m.movementType === 'exit').length
    const totalAdjustments = inventoryMovements.filter(m => m.movementType === 'adjustment').length
    const totalProduction = inventoryMovements.filter(m => m.movementType === 'production').length

    // Last 7 days activity
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const recent = inventoryMovements.filter(m => m.createdAt >= sevenDaysAgo).length

    // Unique items moved
    const uniqueItems = new Set(inventoryMovements.map(m => m.itemId)).size

    return { totalEntries, totalExits, totalAdjustments, totalProduction, recent, uniqueItems, total: inventoryMovements.length }
  }, [inventoryMovements])

  // ── Daily chart data (last 14 days) ──────────────────────────────────
  const chartData = useMemo(() => {
    const days: { date: string; entries: number; exits: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dateStr = d.toISOString().split('T')[0]
      const dayMovements = inventoryMovements.filter(m => {
        const mDate = new Date(m.createdAt).toISOString().split('T')[0]
        return mDate === dateStr
      })
      days.push({
        date: dateStr,
        entries: dayMovements.filter(m => m.movementType === 'entry' || m.movementType === 'return').reduce((s, m) => s + m.quantity, 0),
        exits: dayMovements.filter(m => m.movementType === 'exit' || m.movementType === 'production').reduce((s, m) => s + m.quantity, 0),
      })
    }
    const maxVal = Math.max(...days.map(d => Math.max(d.entries, d.exits)), 1)
    return { days, maxVal }
  }, [inventoryMovements])

  // ── Top movers ────────────────────────────────────────────────────────
  const topMovers = useMemo(() => {
    const map: Record<string, { name: string; entries: number; exits: number; count: number }> = {}
    for (const m of inventoryMovements) {
      if (!map[m.itemId]) map[m.itemId] = { name: m.itemName, entries: 0, exits: 0, count: 0 }
      map[m.itemId].count++
      if (m.movementType === 'entry' || m.movementType === 'return') map[m.itemId].entries += m.quantity
      else map[m.itemId].exits += m.quantity
    }
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [inventoryMovements])

  // ── Export ────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = filtered.map(m => ({
      Fecha: fmt(m.createdAt),
      Hora: fmtTime(m.createdAt),
      Item: m.itemName,
      Tipo: m.itemType === 'supply' ? 'Insumo' : 'Producto',
      Movimiento: MOVEMENT_META[m.movementType]?.label || m.movementType,
      Cantidad: m.quantity,
      'Stock anterior': m.previousStock,
      'Stock nuevo': m.newStock,
      Unidad: m.unit,
      Referencia: m.reference,
      Notas: m.notes,
      Usuario: m.createdBy,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Movimientos')
    XLSX.writeFile(wb, `movimientos_inventario_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  return (
    <div className="space-y-6">
      {/* ── KPI Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total movimientos', value: stats.total, icon: Activity, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/30' },
          { label: 'Entradas', value: stats.totalEntries, icon: ArrowUpCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
          { label: 'Salidas', value: stats.totalExits, icon: ArrowDownCircle, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/30' },
          { label: 'Producción', value: stats.totalProduction, icon: PackageCheck, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/30' },
          { label: 'Últimos 7 días', value: stats.recent, icon: Calendar, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/30' },
          { label: 'Items movidos', value: stats.uniqueItems, icon: Package, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/30' },
        ].map(kpi => (
          <div key={kpi.label} className="card p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center`}>
                <kpi.icon size={16} className={kpi.color} />
              </div>
            </div>
            <p className="text-xs text-slate-400 dark:text-gray-500">{kpi.label}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-white">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Chart + Top movers row ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily activity chart */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-slate-400" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Actividad últimos 14 días</h3>
          </div>
          <div className="flex items-end gap-1 h-32">
            {chartData.days.map((d) => {
              const dayLabel = new Date(d.date + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                  <div className="w-full flex flex-col items-center gap-[2px]" style={{ height: '100px' }}>
                    {/* Entry bar */}
                    <div
                      className="w-full max-w-[16px] bg-emerald-400 dark:bg-emerald-500 rounded-t transition-all hover:bg-emerald-500"
                      style={{ height: `${Math.max(d.entries > 0 ? 4 : 0, (d.entries / chartData.maxVal) * 50)}px` }}
                      title={`Entradas: ${d.entries}`}
                    />
                    {/* Exit bar */}
                    <div
                      className="w-full max-w-[16px] bg-red-400 dark:bg-red-500 rounded-b transition-all hover:bg-red-500"
                      style={{ height: `${Math.max(d.exits > 0 ? 4 : 0, (d.exits / chartData.maxVal) * 50)}px` }}
                      title={`Salidas: ${d.exits}`}
                    />
                  </div>
                  <span className="text-[8px] text-slate-400 dark:text-gray-500 whitespace-nowrap">{dayLabel}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-400 dark:text-gray-500">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-400" /> Entradas</div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-400" /> Salidas</div>
          </div>
        </div>

        {/* Top movers */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-slate-400" />
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm">Top items movidos</h3>
          </div>
          {topMovers.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-gray-500 text-center py-8">Sin datos</p>
          ) : (
            <div className="space-y-3">
              {topMovers.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-slate-300 dark:text-gray-600 w-5 text-center">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 dark:text-gray-200 truncate">{item.name}</p>
                    <div className="flex items-center gap-3 text-xs text-slate-400 dark:text-gray-500">
                      <span className="text-emerald-600 dark:text-emerald-400">+{item.entries.toFixed(1)}</span>
                      <span className="text-red-600 dark:text-red-400">−{item.exits.toFixed(1)}</span>
                      <span>{item.count} mov.</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9 text-sm" placeholder="Buscar por item, referencia, notas..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="input w-auto text-sm" value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}>
            <option value="all">Todos los tipos</option>
            {ALL_TYPES.map(t => (
              <option key={t} value={t}>{MOVEMENT_META[t].label}</option>
            ))}
          </select>
          <select className="input w-auto text-sm" value={itemTypeFilter}
            onChange={(e) => { setItemTypeFilter(e.target.value); setPage(1) }}>
            <option value="all">Insumos y Productos</option>
            <option value="supply">Solo insumos</option>
            <option value="product">Solo productos</option>
          </select>
          <DateRangeFilter
            from={dateFrom} to={dateTo}
            onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1) }}
          />
          <button className="btn btn-secondary btn-sm flex items-center gap-1.5" onClick={handleExport}>
            Exportar
          </button>
        </div>
      </div>

      {/* ── Timeline / Table ────────────────────────────────────────── */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-gray-600">
            <Activity size={40} className="mx-auto mb-3 opacity-30" />
            <p>No se encontraron movimientos</p>
            <p className="text-xs mt-1">Registra movimientos desde el módulo de Inventario</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-gray-800 text-xs text-slate-500 dark:text-gray-400 uppercase tracking-wider">
                    <th className="text-left px-4 py-3">Fecha</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Item</th>
                    <th className="text-right px-4 py-3">Cantidad</th>
                    <th className="text-right px-4 py-3">Stock anterior</th>
                    <th className="text-right px-4 py-3">Stock nuevo</th>
                    <th className="text-left px-4 py-3">Notas</th>
                    <th className="text-left px-4 py-3">Usuario</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                  {paginated.map((m) => {
                    const meta = MOVEMENT_META[m.movementType] || MOVEMENT_META.entry
                    const Icon = meta.icon
                    const isIncrease = m.movementType === 'entry' || m.movementType === 'return'
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm text-slate-700 dark:text-gray-200">{fmt(m.createdAt)}</p>
                          <p className="text-[10px] text-slate-400 dark:text-gray-500">{fmtTime(m.createdAt)}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${meta.bg} ${meta.textColor}`}>
                            <Icon size={12} /> {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{m.itemName}</p>
                          <p className="text-[10px] text-slate-400 dark:text-gray-500">
                            {m.itemType === 'supply' ? 'Insumo' : 'Producto'}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className={`text-sm font-bold ${isIncrease ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isIncrease ? '+' : '−'}{m.quantity} {m.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm text-slate-500 dark:text-gray-400">
                          {m.previousStock} {m.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-slate-700 dark:text-gray-200">
                          {m.newStock} {m.unit}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400 max-w-[200px] truncate">
                          {m.notes || m.reference || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400 dark:text-gray-500">{m.createdBy}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile timeline view */}
            <div className="md:hidden p-4 space-y-3">
              {paginated.map((m) => {
                const meta = MOVEMENT_META[m.movementType] || MOVEMENT_META.entry
                const Icon = meta.icon
                const isIncrease = m.movementType === 'entry' || m.movementType === 'return'
                return (
                  <div key={m.id} className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-gray-700">
                    <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={16} className={meta.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium text-slate-700 dark:text-gray-200 truncate">{m.itemName}</p>
                        <span className={`text-sm font-bold flex-shrink-0 ${isIncrease ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isIncrease ? '+' : '−'}{m.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">
                        <span className={`font-medium ${meta.textColor}`}>{meta.label}</span>
                        <span>·</span>
                        <span>{fmt(m.createdAt)}</span>
                        <span>·</span>
                        <span>{m.previousStock} → {m.newStock} {m.unit}</span>
                      </div>
                      {m.notes && <p className="text-xs text-slate-400 dark:text-gray-500 mt-1 truncate">{m.notes}</p>}
                    </div>
                  </div>
                )
              })}
            </div>

            <Pagination page={page} total={filtered.length}
              pageSize={PAGE_SIZE} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  )
}
