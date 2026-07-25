import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Play, CheckCircle, XCircle, Clock, Factory, X, ChevronDown, Trash2, BookOpen } from 'lucide-react'
import { useStore } from '../store/useStore'
import { ProductionOrder, Recipe } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmDelete from '../components/ConfirmDelete'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { formatCOP } from '../utils/currency'

const STATUS_LABELS: Record<string, string> = {
  pending:'Pendiente', in_progress:'En producción', finished:'Finalizado', cancelled:'Cancelado'
}
const STATUS_BADGE: Record<string, string> = {
  pending:'badge-yellow', in_progress:'badge-blue', finished:'badge-green', cancelled:'badge-red'
}
const PRIORITY_LABELS: Record<number, string> = { 1:'🔴 Urgente', 2:'🟠 Alta', 3:'🟡 Normal', 4:'🟢 Baja', 5:'⚪ Muy baja' }

const UNITS = ['u','kg','g','lb','oz','L','mL','m','cm','mm','m²','m³','rollo','par','caja','doc','bolsa']

function OrderCard({ order, onDelete, canDelete }: { order: ProductionOrder; onDelete: () => void; canDelete: boolean }) {
  const { updateProductionOrderStatus } = useStore()
  const [expanded, setExpanded] = useState(false)
  const [showFinalize, setShowFinalize] = useState(false)

  const handleAction = (status: ProductionOrder['status']) => {
    if (status === 'finished') { setShowFinalize(true); return }
    updateProductionOrderStatus(order.id, status)
  }

  const actions: { label: string; status: ProductionOrder['status']; cls: string }[] = []
  if (order.status === 'pending')     actions.push({ label:'Iniciar', status:'in_progress', cls:'btn-primary' })
  if (order.status === 'in_progress') actions.push({ label:'Finalizar', status:'finished', cls:'btn-success' })
  if (['pending','in_progress'].includes(order.status))
    actions.push({ label:'Cancelar', status:'cancelled', cls:'btn-danger' })

  return (
    <div className={`card overflow-hidden border-l-4 ${
      order.status === 'in_progress' ? 'border-l-blue-500' :
      order.status === 'finished'    ? 'border-l-emerald-500' :
      order.status === 'cancelled'   ? 'border-l-red-400' : 'border-l-amber-400'
    }`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-slate-400 dark:text-gray-500">{order.orderNumber}</span>
              <span className={`badge ${STATUS_BADGE[order.status]}`}>{STATUS_LABELS[order.status]}</span>
              <span className="text-xs text-slate-400 dark:text-gray-500">{PRIORITY_LABELS[order.priority]}</span>
            </div>
            <h3 className="font-semibold text-slate-800 dark:text-white truncate">{order.product}</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{order.recipe}</p>
          </div>
          <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 mt-1">
            <ChevronDown size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-3">
          {[
            { label: 'Cantidad', val: `${order.plannedQty} u` },
            { label: 'Costo est.', val: formatCOP(order.estimatedCost) },
            { label: 'Responsable', val: order.assignedTo?.split(' ')[0] ?? '—' },
          ].map((item) => (
            <div key={item.label} className="bg-slate-50 dark:bg-gray-700 rounded-lg p-2 text-center">
              <p className="text-xs text-slate-400 dark:text-gray-400">{item.label}</p>
              <p className="font-bold text-slate-700 dark:text-gray-200 text-xs truncate">{item.val}</p>
            </div>
          ))}
        </div>

        {order.status === 'in_progress' && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 mb-1">
              <span>Progreso estimado</span><span>60%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-gray-700 rounded-full">
              <div className="h-2 bg-blue-500 rounded-full" style={{ width: '60%' }} />
            </div>
          </div>
        )}

        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-700 space-y-1.5 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
              <Clock size={12} /><span>Inicio: {order.plannedStart}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
              <Clock size={12} /><span>Fin planificado: {order.plannedEnd}</span>
            </div>
            {order.actualCost && (
              <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                <CheckCircle size={12} /><span>Costo real: {formatCOP(order.actualCost)}</span>
              </div>
            )}
          </div>
        )}

        {/* Actuals summary (only when finished) */}
        {order.status === 'finished' && order.actualQty !== undefined && (
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-700 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/20 p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Producidas</p>
              <p className="text-sm font-bold text-emerald-900 dark:text-emerald-200 tabular-nums">{order.actualQty}</p>
            </div>
            {(order.rejectedQty ?? 0) > 0 && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-red-700 dark:text-red-300">Rechazadas</p>
                <p className="text-sm font-bold text-red-900 dark:text-red-200 tabular-nums">{order.rejectedQty}</p>
              </div>
            )}
            {order.actualCost && (
              <div className={`rounded-lg p-2 ${
                order.actualCost > order.estimatedCost * 1.05
                  ? 'bg-amber-50 dark:bg-amber-900/20'
                  : 'bg-slate-50 dark:bg-gray-700'
              }`}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-gray-400">Costo real</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white tabular-nums">{formatCOP(order.actualCost)}</p>
                {order.actualCost > order.estimatedCost * 1.05 && (
                  <p className="text-[9px] text-amber-700 dark:text-amber-400">+{Math.round((order.actualCost / order.estimatedCost - 1) * 100)}%</p>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-gray-700">
          {actions.map((a) => (
            <button key={a.status} className={`btn btn-sm ${a.cls} flex-1`}
              onClick={() => handleAction(a.status)}>
              {a.status === 'in_progress' && <Play size={12} />}
              {a.status === 'finished'    && <CheckCircle size={12} />}
              {a.status === 'cancelled'   && <XCircle size={12} />}
              {a.label}
            </button>
          ))}
          {canDelete && (
            <button className="btn btn-sm flex items-center gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
              onClick={onDelete}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {showFinalize && (
        <FinalizeProductionModal
          order={order}
          onClose={() => setShowFinalize(false)}
        />
      )}
    </div>
  )
}

// ── Finalize with actuals modal ──────────────────────────────────────────────
function FinalizeProductionModal({ order, onClose }: { order: ProductionOrder; onClose: () => void }) {
  const { finalizeProductionOrder, recipes, supplies } = useStore()
  const recipe = recipes.find((r) => r.id === order.recipeId)
  const batchesPlanned = recipe && recipe.yieldQty > 0 ? order.plannedQty / recipe.yieldQty : 1

  const [actualQty, setActualQty] = useState<number>(order.plannedQty)
  const [rejectedQty, setRejectedQty] = useState<number>(0)
  const [notes, setNotes] = useState('')
  const [ingredients, setIngredients] = useState<{ supplyId: string; supplyName: string; qty: number; unit: string }[]>(() => {
    if (!recipe) return []
    return recipe.ingredients.map((ing) => ({
      supplyId: ing.supplyId,
      supplyName: ing.supplyName,
      qty: parseFloat((ing.qty * batchesPlanned).toFixed(4)),
      unit: ing.unit,
    }))
  })
  const [saving, setSaving] = useState(false)

  // Recompute actualCost from ingredients × supply.cost
  const actualCost = ingredients.reduce((sum, ing) => {
    const supply = supplies.find((s) => s.id === ing.supplyId)
    return sum + ing.qty * (supply?.cost ?? 0)
  }, 0)
  const costPerUnit = actualQty > 0 ? actualCost / actualQty : 0
  const costDelta = actualCost - order.estimatedCost
  const costDeltaPct = order.estimatedCost > 0 ? (costDelta / order.estimatedCost) * 100 : 0

  const yieldPct = order.plannedQty > 0 ? (actualQty / order.plannedQty) * 100 : 0
  const rejectionPct = (actualQty + rejectedQty) > 0
    ? (rejectedQty / (actualQty + rejectedQty)) * 100
    : 0

  const updateIngredient = (idx: number, qty: number) => {
    setIngredients(ings => ings.map((ing, i) => i === idx ? { ...ing, qty } : ing))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await finalizeProductionOrder(order.id, {
        actualQty,
        rejectedQty,
        actualCost: Math.round(actualCost),
        actualIngredients: ingredients,
        notes: notes.trim() || undefined,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-slate-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Finalizar producción</p>
            <h3 className="font-bold text-slate-800 dark:text-white text-lg">{order.product}</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Orden {order.orderNumber} · planeado {order.plannedQty} u · costo estimado {formatCOP(order.estimatedCost)}
            </p>
          </div>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Actuals: qty produced + rejected */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Producidas *</label>
              <input className="input" type="number" min="0" step="1"
                value={actualQty}
                onChange={(e) => setActualQty(parseFloat(e.target.value) || 0)} />
              <p className={`text-[10px] mt-1 font-semibold ${yieldPct >= 95 ? 'text-emerald-600' : yieldPct >= 85 ? 'text-amber-600' : 'text-red-600'}`}>
                Rendimiento {yieldPct.toFixed(0)}% vs plan
              </p>
            </div>
            <div>
              <label className="label">Rechazadas / merma</label>
              <input className="input" type="number" min="0" step="1"
                value={rejectedQty}
                onChange={(e) => setRejectedQty(parseFloat(e.target.value) || 0)} />
              <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
                {rejectedQty > 0 ? `Tasa de rechazo ${rejectionPct.toFixed(1)}%` : 'Sin piezas rechazadas'}
              </p>
            </div>
          </div>

          {/* Actual ingredients */}
          {recipe && ingredients.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-gray-400">Consumo real de insumos</p>
                <p className="text-[10px] text-slate-400 dark:text-gray-500">
                  Ajusta la cantidad realmente usada
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 dark:border-gray-700 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 dark:bg-gray-700/50">
                    <tr>
                      {['Insumo', 'Teórico', 'Real', 'Varianza'].map(h => (
                        <th key={h} className="text-left px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {ingredients.map((ing, idx) => {
                      const theoretical = recipe.ingredients[idx]
                        ? recipe.ingredients[idx].qty * batchesPlanned
                        : 0
                      const variance = theoretical > 0 ? ((ing.qty - theoretical) / theoretical) * 100 : 0
                      return (
                        <tr key={ing.supplyId} className="border-t border-slate-100 dark:border-gray-700/60">
                          <td className="px-3 py-2 font-medium text-slate-700 dark:text-gray-200">{ing.supplyName}</td>
                          <td className="px-3 py-2 text-slate-500 dark:text-gray-400 tabular-nums text-xs">{theoretical.toFixed(2)} {ing.unit}</td>
                          <td className="px-3 py-2">
                            <input className="input py-1 text-sm w-24 tabular-nums" type="number" min="0" step="0.01"
                              value={ing.qty}
                              onChange={(e) => updateIngredient(idx, parseFloat(e.target.value) || 0)} />
                          </td>
                          <td className={`px-3 py-2 tabular-nums text-xs font-semibold ${
                            Math.abs(variance) < 5
                              ? 'text-slate-500 dark:text-gray-400'
                              : variance > 0
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                          }`}>
                            {variance >= 0 ? '+' : ''}{variance.toFixed(1)}%
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cost summary */}
          <div className="rounded-xl border border-slate-200 dark:border-gray-700 p-4 grid grid-cols-3 gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Costo real</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{formatCOP(actualCost)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">Por unidad</p>
              <p className="text-lg font-bold text-slate-800 dark:text-white tabular-nums">{formatCOP(costPerUnit)}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">vs. plan</p>
              <p className={`text-lg font-bold tabular-nums ${
                Math.abs(costDeltaPct) < 5
                  ? 'text-slate-600 dark:text-gray-300'
                  : costDeltaPct > 0
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }`}>
                {costDeltaPct >= 0 ? '+' : ''}{costDeltaPct.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Notas (opcional)</label>
            <textarea className="input resize-none" rows={2}
              placeholder="Ej: color más oscuro por lote de pigmento, molde nuevo probado..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 px-6 py-4 flex gap-3 rounded-b-2xl">
          <button className="btn btn-secondary flex-1" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-success flex-1" onClick={handleSave} disabled={saving || actualQty <= 0}>
            {saving ? 'Finalizando...' : `Finalizar · ${actualQty} u`}
          </button>
        </div>
      </div>
    </div>
  )
}

function NewOrderModal({ onClose }: { onClose: () => void }) {
  const { recipes, addProductionOrder, productionOrders, supplies, companySettings } = useStore()

  // Personal de producción configurable (Configuración → Equipo de trabajo).
  const staff = (companySettings.teamMembers ?? [])
    .filter((m) => m.role === 'production' && m.isActive)
    .map((m) => m.name)

  const [recipeId, setRecipeId] = useState('')
  const [qty, setQty]           = useState('')
  const [date, setDate]         = useState(new Date().toISOString().split('T')[0])
  const [assigned, setAssigned] = useState(staff[0] ?? '')

  const recipe = recipes.find((r) => r.id === recipeId)

  // Check if there is sufficient inventory for this order
  const stockCheck = (() => {
    if (!recipe || !qty) return null
    const n = parseFloat(qty) || 0
    if (n <= 0) return null
    const batches = n / recipe.yieldQty
    const shortfalls: { name: string; need: number; have: number; unit: string }[] = []
    for (const ing of recipe.ingredients) {
      const supply = supplies.find((s) => s.id === ing.supplyId)
      if (!supply) continue
      const needed = parseFloat((ing.qty * batches).toFixed(4))
      if (supply.stock < needed) {
        shortfalls.push({ name: supply.name, need: needed, have: supply.stock, unit: supply.unit })
      }
    }
    return shortfalls
  })()

  const handleSave = () => {
    if (!recipe || !qty) return
    const n = parseFloat(qty)
    const order: ProductionOrder = {
      id: `po${Date.now()}`, orderNumber: `OP-${new Date().getFullYear()}-${String(productionOrders.length + 1).padStart(4, '0')}`,
      recipe: recipe.name, recipeId: recipe.id, product: recipe.name.split('(')[0].trim(),
      plannedQty: n, status: 'pending', priority: 3,
      plannedStart: `${date} 08:00`, plannedEnd: `${date} 16:00`,
      estimatedCost: parseFloat((recipe.costPerUnit * n).toFixed(2)),
      assignedTo: assigned,
    }
    addProductionOrder(order)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
          <h3 className="font-semibold text-slate-800 dark:text-white">Nueva orden de producción</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="label">Fórmula de mezcla</label>
            <select className="input" value={recipeId} onChange={(e) => setRecipeId(e.target.value)}>
              <option value="">-- Seleccionar fórmula --</option>
              {recipes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {recipe && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs text-blue-700 dark:text-blue-300 space-y-1 animate-fadeIn">
              <p><strong>Rendimiento:</strong> {recipe.yieldQty} {recipe.yieldUnit} por lote</p>
              <p><strong>Costo/unidad:</strong> {formatCOP(recipe.costPerUnit)}</p>
              <p><strong>Materiales:</strong> {recipe.ingredients.length} insumos</p>
            </div>
          )}
          <div>
            <label className="label">Cantidad a producir</label>
            <input className="input" type="number" min="1" value={qty}
              onChange={(e) => setQty(e.target.value)} placeholder="ej. 20" />
          </div>
          <div>
            <label className="label">Fecha de producción</label>
            <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="label">Asignado a</label>
            {staff.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                No hay personal de producción configurado. Agrégalo en Configuración → Equipo de trabajo.
              </p>
            ) : (
              <select className="input" value={assigned} onChange={(e) => setAssigned(e.target.value)}>
                {staff.map((n) => <option key={n}>{n}</option>)}
              </select>
            )}
          </div>
          {recipe && qty && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-3 text-xs animate-fadeIn">
              <p className="text-emerald-700 dark:text-emerald-300 font-semibold">
                Costo estimado total: {formatCOP(recipe.costPerUnit * parseFloat(qty || '0'))}
              </p>
            </div>
          )}
          {stockCheck && stockCheck.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-xs animate-fadeIn">
              <p className="text-red-700 dark:text-red-400 font-semibold mb-1">⚠️ Stock insuficiente para completar esta orden:</p>
              {stockCheck.map((s) => (
                <p key={s.name} className="text-red-600 dark:text-red-400">
                  {s.name}: necesita {s.need.toFixed(2)} {s.unit}, disponible {s.have.toFixed(2)} {s.unit}
                </p>
              ))}
            </div>
          )}
          {stockCheck && stockCheck.length === 0 && qty && recipe && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-xs animate-fadeIn">
              <p className="text-blue-700 dark:text-blue-300 font-semibold">✓ Stock suficiente para esta orden. Los insumos se descontarán al finalizar.</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}>Crear orden</button>
        </div>
      </div>
    </div>
  )
}

function NewRecipeModal({ onClose }: { onClose: () => void }) {
  const { supplies, addRecipe } = useStore()
  const [name, setName]           = useState('')
  const [yieldQty, setYieldQty]   = useState('1')
  const [yieldUnit, setYieldUnit] = useState('u')
  const [ingredients, setIngredients] = useState<{ supplyId: string; supplyName: string; qty: number; unit: string; cost: number }[]>([])

  const addIngredient = () => setIngredients([...ingredients, { supplyId: '', supplyName: '', qty: 1, unit: 'u', cost: 0 }])
  const removeIngredient = (i: number) => setIngredients(ingredients.filter((_, j) => j !== i))
  const updateIngredient = (i: number, field: string, value: string | number) => {
    const copy = [...ingredients]
    if (field === 'supplyId') {
      const s = supplies.find((x) => x.id === value)
      copy[i] = { ...copy[i], supplyId: String(value), supplyName: s?.name ?? '', unit: s?.unit ?? 'u', cost: (copy[i].qty || 0) * (s?.cost ?? 0) }
    } else if (field === 'qty') {
      const supply = supplies.find((x) => x.id === copy[i].supplyId)
      copy[i] = { ...copy[i], qty: Number(value), cost: Number(value) * (supply?.cost ?? 0) }
    } else {
      copy[i] = { ...copy[i], [field]: value }
    }
    setIngredients(copy)
  }

  const totalCost = ingredients.reduce((a, i) => a + i.cost, 0)
  const yieldN    = parseFloat(yieldQty) || 1

  const handleSave = () => {
    if (!name.trim() || ingredients.length === 0) return
    const recipe: Recipe = {
      id: `rec${Date.now()}`,
      name: name.trim(),
      productId: '',
      yieldQty: yieldN,
      yieldUnit,
      ingredients,
      totalCost: parseFloat(totalCost.toFixed(2)),
      costPerUnit: parseFloat((totalCost / yieldN).toFixed(2)),
    }
    addRecipe(recipe)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-slate-800 dark:text-white">Nueva fórmula de mezcla</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="label">Nombre de la fórmula *</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="ej. Fórmula Estándar Maceta" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Rendimiento (cantidad producida)</label>
              <input className="input" type="number" min="0.01" step="0.01" value={yieldQty}
                onChange={(e) => setYieldQty(e.target.value)} />
            </div>
            <div>
              <label className="label">Unidad de rendimiento</label>
              <select className="input" value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)}>
                {UNITS.map((u) => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Ingredientes */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Materiales / Insumos *</label>
              <button className="btn btn-secondary btn-sm" onClick={addIngredient}><Plus size={12} /> Agregar</button>
            </div>
            {ingredients.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-gray-600 rounded-lg text-slate-400 dark:text-gray-500 text-sm">
                Agrega los materiales de esta fórmula
              </div>
            )}
            {ingredients.map((ing, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-5">
                  {i === 0 && <label className="label">Insumo</label>}
                  <select className="input" value={ing.supplyId}
                    onChange={(e) => updateIngredient(i, 'supplyId', e.target.value)}>
                    <option value="">-- Insumo --</option>
                    {supplies.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Cant.</label>}
                  <input className="input" type="number" min="0.001" step="0.001" value={ing.qty}
                    onChange={(e) => updateIngredient(i, 'qty', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Unidad</label>}
                  <select className="input" value={ing.unit}
                    onChange={(e) => updateIngredient(i, 'unit', e.target.value)}>
                    {UNITS.map((u) => <option key={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Costo</label>}
                  <p className="py-2 text-xs font-semibold text-slate-700 dark:text-gray-200">{formatCOP(ing.cost)}</p>
                </div>
                <div className="col-span-1">
                  <button onClick={() => removeIngredient(i)} className="w-8 h-9 flex items-center justify-center text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {ingredients.length > 0 && (
            <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-4 space-y-1 animate-fadeIn">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-gray-400">Costo total</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCOP(totalCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-gray-400">Costo por {yieldUnit}</span>
                <span className="font-bold text-slate-800 dark:text-white">{formatCOP(totalCost / yieldN)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5 sticky bottom-0 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 pt-4">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}>Guardar fórmula</button>
        </div>
      </div>
    </div>
  )
}

export default function Production() {
  const { productionOrders, recipes, deleteProductionOrder, deleteRecipe } = useStore()
  const { canDelete } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filter, setFilter]         = useState('all')
  const [showModal, setShowModal]   = useState(false)
  const [showRecipeModal, setShowRecipeModal] = useState(false)
  const [activeTab, setActiveTab]   = useState<'orders'|'recipes'>('orders')
  const [deleteTarget, setDeleteTarget]       = useState<ProductionOrder | null>(null)
  const [deleteRecipeTarget, setDeleteRecipeTarget] = useState<Recipe | null>(null)
  const [deleting, setDeleting]               = useState(false)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  // Deep link: ?open=ID → scroll to card and briefly highlight it
  useEffect(() => {
    const id = searchParams.get('open')
    if (!id || productionOrders.length === 0) return
    const exists = productionOrders.find((o) => o.id === id)
    if (exists) {
      setFilter('all')
      setHighlightId(id)
      setSearchParams({}, { replace: true })
      setTimeout(() => {
        document.getElementById(`prod-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 100)
      setTimeout(() => setHighlightId(null), 3000)
    }
  }, [searchParams, productionOrders, setSearchParams])

  const filtered = filter === 'all' ? productionOrders
    : productionOrders.filter((o) => o.status === filter)

  const counts = {
    pending:     productionOrders.filter((o) => o.status === 'pending').length,
    in_progress: productionOrders.filter((o) => o.status === 'in_progress').length,
    finished:    productionOrders.filter((o) => o.status === 'finished').length,
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Factory}
        title="Producción"
        subtitle="Órdenes de producción y fórmulas de mezcla"
        accent="rgba(245, 158, 11, 0.20)"
        actions={
          <>
            {activeTab === 'recipes' && (
              <button className="btn btn-sm btn-secondary" onClick={() => setShowRecipeModal(true)}>
                <BookOpen size={14} /> Nueva fórmula
              </button>
            )}
            <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={14} /> Nueva orden
            </button>
          </>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={Clock}        label="Pendientes"     value={counts.pending}     accent="#f59e0b" />
        <StatCard icon={Play}         label="En producción"  value={counts.in_progress} accent="#2563eb" />
        <StatCard icon={CheckCircle}  label="Finalizadas"    value={counts.finished}    accent="#10b981" />
      </div>

      {/* Tabs */}
      <div className="inline-flex gap-1 bg-slate-100/80 dark:bg-gray-700/80 p-1 rounded-xl">
        {(['orders','recipes'] as const).map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === t
                ? 'bg-white dark:bg-gray-800 text-amazonia-700 dark:text-amazonia-300 shadow-soft'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
            }`}>
            {t === 'orders' ? 'Órdenes' : 'Fórmulas'}
          </button>
        ))}
      </div>

      {activeTab === 'orders' && (
        <>
          {/* Status filter */}
          <div className="flex gap-2 flex-wrap">
            {[['all','Todas'],['pending','Pendientes'],['in_progress','En producción'],['finished','Finalizadas'],['cancelled','Canceladas']].map(([v,l]) => (
              <button key={v} onClick={() => setFilter(v)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  filter === v
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
                }`}>{l}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((o) => (
              <div key={o.id} id={`prod-${o.id}`}
                className={highlightId === o.id ? 'ring-2 ring-amber-400 ring-offset-2 rounded-xl transition-all duration-300' : ''}>
                <OrderCard order={o}
                  canDelete={canDelete('production')}
                  onDelete={() => setDeleteTarget(o)}
                />
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="col-span-3 text-center py-16 text-slate-400 dark:text-gray-600">
                <Factory size={40} className="mx-auto mb-3 opacity-30" />
                <p>No hay órdenes en este estado</p>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recipes.map((r) => (
            <div key={r.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-800 dark:text-white">{r.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="badge badge-blue">{r.yieldQty} {r.yieldUnit}</span>
                  {canDelete('production') && (
                    <button className="text-red-400 hover:text-red-600 p-1" onClick={() => setDeleteRecipeTarget(r)}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                {r.ingredients.map((ing, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-gray-300">{ing.supplyName}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500 dark:text-gray-400">{ing.qty} {ing.unit}</span>
                      <span className="text-slate-700 dark:text-gray-200 font-medium w-20 text-right">{formatCOP(ing.cost)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-gray-400">Costo total</span>
                <div className="text-right">
                  <p className="font-bold text-slate-800 dark:text-white">{formatCOP(r.totalCost)}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-500">{formatCOP(r.costPerUnit)} / {r.yieldUnit}</p>
                </div>
              </div>
            </div>
          ))}
          {recipes.length === 0 && (
            <div className="col-span-2 text-center py-16 text-slate-400 dark:text-gray-600">
              <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
              <p>No hay fórmulas. Crea una con el botón "Nueva fórmula".</p>
            </div>
          )}
        </div>
      )}

      {showModal && <NewOrderModal onClose={() => setShowModal(false)} />}
      {showRecipeModal && <NewRecipeModal onClose={() => setShowRecipeModal(false)} />}

      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.product ?? ''}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deleteProductionOrder(deleteTarget.id)
              setDeleteTarget(null)
            } finally {
              setDeleting(false)
            }
          }}
        />
      )}
      {deleteRecipeTarget && (
        <ConfirmDelete
          name={deleteRecipeTarget.name}
          loading={deleting}
          onCancel={() => setDeleteRecipeTarget(null)}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deleteRecipe(deleteRecipeTarget.id)
              setDeleteRecipeTarget(null)
            } finally {
              setDeleting(false)
            }
          }}
        />
      )}
    </div>
  )
}
