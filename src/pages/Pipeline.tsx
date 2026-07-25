import { useState, useRef } from 'react'
import {
  Kanban, Plus, X, DollarSign, User, Calendar, Target, TrendingUp,
  CheckCircle2, XCircle, Edit2, Trash2, ChevronRight, Phone,
  MessageCircle, BarChart2, ArrowRight, Trophy, AlertCircle, Clock,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Opportunity, PipelineStage } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import { formatCOP } from '../utils/currency'
import ConfirmDelete from '../components/ConfirmDelete'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'

// ── Stage config ─────────────────────────────────────────────────────────────
type StageConfig = {
  key:      PipelineStage
  label:    string
  color:    string        // tailwind text color
  bg:       string        // card accent
  header:   string        // header bg
  icon:     React.ElementType
}

const STAGES: StageConfig[] = [
  { key: 'lead',        label: 'Nuevo lead',   color: 'text-slate-600 dark:text-slate-300',   bg: 'border-slate-300 dark:border-slate-600',   header: 'bg-slate-100 dark:bg-slate-700',        icon: User },
  { key: 'contacted',   label: 'Contactado',   color: 'text-blue-600 dark:text-blue-400',     bg: 'border-blue-300 dark:border-blue-700',     header: 'bg-blue-50 dark:bg-blue-900/40',        icon: Phone },
  { key: 'quoted',      label: 'Cotizado',     color: 'text-violet-600 dark:text-violet-400', bg: 'border-violet-300 dark:border-violet-700', header: 'bg-violet-50 dark:bg-violet-900/40',    icon: Target },
  { key: 'negotiating', label: 'Negociando',   color: 'text-amber-600 dark:text-amber-400',   bg: 'border-amber-300 dark:border-amber-700',   header: 'bg-amber-50 dark:bg-amber-900/40',      icon: MessageCircle },
  { key: 'won',         label: 'Ganado ✓',     color: 'text-emerald-600 dark:text-emerald-400',bg: 'border-emerald-300 dark:border-emerald-700',header: 'bg-emerald-50 dark:bg-emerald-900/40', icon: CheckCircle2 },
  { key: 'lost',        label: 'Perdido',      color: 'text-red-500 dark:text-red-400',       bg: 'border-red-200 dark:border-red-900',       header: 'bg-red-50 dark:bg-red-900/30',          icon: XCircle },
]

const ACTIVE_STAGES = STAGES.filter((s) => s.key !== 'won' && s.key !== 'lost')

function today() { return new Date().toISOString().split('T')[0] }
function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
}

// ── Opportunity Card ──────────────────────────────────────────────────────────
function OppCard({
  opp, onEdit, onDelete, onStageChange,
  dragging, onDragStart, onDragEnd,
}: {
  opp: Opportunity
  onEdit:       (o: Opportunity) => void
  onDelete:     (o: Opportunity) => void
  onStageChange:(o: Opportunity, stage: PipelineStage) => void
  dragging:     boolean
  onDragStart:  () => void
  onDragEnd:    () => void
}) {
  const isOverdue = opp.expectedClose && opp.expectedClose < today() && !['won','lost'].includes(opp.stage)
  const stageIdx  = STAGES.findIndex((s) => s.key === opp.stage)
  const nextStage = STAGES[stageIdx + 1]
  const { canDelete } = usePermissions()

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`bg-white dark:bg-gray-800 rounded-xl border shadow-sm p-3 cursor-grab active:cursor-grabbing transition-all select-none
        ${dragging ? 'opacity-40 scale-95' : 'hover:shadow-md hover:-translate-y-0.5'}
        ${isOverdue ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-gray-700'}
      `}
    >
      {/* Title + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="font-semibold text-slate-800 dark:text-white text-sm leading-tight">{opp.title}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(opp)}
            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors">
            <Edit2 size={12} />
          </button>
          {canDelete('crm') && (
            <button onClick={() => onDelete(opp)}
              className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Customer */}
      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-gray-400 mb-2">
        <User size={11} />
        <span className="truncate">{opp.customer}</span>
      </div>

      {/* Value + probability */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(opp.value)}</span>
        <div className="flex items-center gap-1">
          <div className="w-16 bg-slate-100 dark:bg-gray-700 rounded-full h-1.5">
            <div
              className={`h-1.5 rounded-full ${opp.probability >= 75 ? 'bg-emerald-500' : opp.probability >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
              style={{ width: `${opp.probability}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">{opp.probability}%</span>
        </div>
      </div>

      {/* Expected close + assignee */}
      <div className="flex items-center justify-between text-xs text-slate-400 dark:text-gray-500 mb-3">
        <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-500 font-semibold' : ''}`}>
          <Calendar size={11} />
          {opp.expectedClose ? fmt(opp.expectedClose) : 'Sin fecha'}
          {isOverdue && <AlertCircle size={11} />}
        </div>
        {opp.assignedTo && (
          <span className="bg-slate-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-slate-500 dark:text-gray-400">
            {opp.assignedTo.split(' ')[0]}
          </span>
        )}
      </div>

      {/* Next stage button */}
      {!['won','lost'].includes(opp.stage) && nextStage && (
        <div className="flex gap-1">
          <button
            onClick={() => onStageChange(opp, nextStage.key)}
            className="flex-1 flex items-center justify-center gap-1 text-xs py-1.5 rounded-lg bg-slate-50 dark:bg-gray-700/60 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-slate-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors border border-slate-200 dark:border-gray-600 font-medium"
          >
            {nextStage.label} <ArrowRight size={11} />
          </button>
          {opp.stage !== 'lead' && (
            <button
              onClick={() => onStageChange(opp, 'won')}
              className="px-2 py-1.5 rounded-lg text-xs bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-medium transition-colors"
              title="Marcar como ganado"
            >
              <Trophy size={12} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Create / Edit Modal ───────────────────────────────────────────────────────
function OppModal({ initial, onClose, defaultStage }: {
  initial?:     Opportunity
  onClose:      () => void
  defaultStage?: PipelineStage
}) {
  const { customers, quotations, addOpportunity, updateOpportunity, opportunities, companySettings } = useStore()

  const [form, setForm] = useState<Partial<Opportunity>>(initial ?? {
    stage:       defaultStage ?? 'lead',
    probability: 30,
    value:       0,
    createdAt:   today(),
    updatedAt:   today(),
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Vendedores configurables (Configuración → Equipo de trabajo). Se muestran los
  // activos; si la oportunidad ya tenía a alguien asignado que fue desactivado o
  // eliminado, se conserva como opción para no perder el dato.
  const sellers = (() => {
    const active = (companySettings.teamMembers ?? [])
      .filter((m) => m.role === 'seller' && m.isActive)
      .map((m) => m.name)
    const current = form.assignedTo
    if (current && !active.includes(current)) return [current, ...active]
    return active
  })()

  const handleCustomer = (id: string) => {
    const c = customers.find((x) => x.id === id)
    setForm((f) => ({ ...f, customerId: id, customer: c?.name ?? '' }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title?.trim())  e.title    = 'Requerido'
    if (!form.customer?.trim()) e.customer = 'Selecciona un cliente'
    if ((form.value ?? 0) <= 0) e.value   = 'Debe ser mayor a 0'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const opp: Opportunity = {
        id:           initial?.id ?? `opp${Date.now()}`,
        title:        form.title!.trim(),
        customerId:   form.customerId ?? '',
        customer:     form.customer!.trim(),
        stage:        form.stage as PipelineStage ?? 'lead',
        value:        Number(form.value),
        probability:  Number(form.probability ?? 30),
        expectedClose: form.expectedClose,
        assignedTo:   form.assignedTo ?? '',
        quotationId:  form.quotationId ?? '',
        notes:        form.notes ?? '',
        lostReason:   form.lostReason ?? '',
        createdAt:    initial?.createdAt ?? today(),
        updatedAt:    today(),
      }
      if (initial) await updateOpportunity(opp)
      else         await addOpportunity(opp)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const set = (k: keyof Opportunity, v: unknown) => setForm((f) => ({ ...f, [k]: v }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="font-semibold text-slate-800 dark:text-white">
            {initial ? 'Editar oportunidad' : 'Nueva oportunidad'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="label">Título de la oportunidad *</label>
            <input className={`input ${errors.title ? 'border-red-400' : ''}`}
              placeholder="Ej: Cotización jardines Hotel Selva Real"
              value={form.title ?? ''} onChange={(e) => set('title', e.target.value)} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Customer */}
          <div>
            <label className="label">Cliente *</label>
            <select className={`input ${errors.customer ? 'border-red-400' : ''}`}
              value={form.customerId ?? ''}
              onChange={(e) => handleCustomer(e.target.value)}>
              <option value="">Seleccionar cliente...</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
            </select>
            {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
          </div>

          {/* Stage */}
          <div>
            <label className="label">Etapa</label>
            <div className="grid grid-cols-3 gap-2">
              {STAGES.map((s) => (
                <button key={s.key} onClick={() => set('stage', s.key)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition-colors ${
                    form.stage === s.key
                      ? 'bg-amazonia-600 text-white border-amazonia-600'
                      : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
                  }`}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Value + probability */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Valor estimado *</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min="0" className={`input pl-7 ${errors.value ? 'border-red-400' : ''}`}
                  placeholder="0" value={form.value ?? ''}
                  onChange={(e) => set('value', parseFloat(e.target.value) || 0)} />
              </div>
              {errors.value && <p className="text-xs text-red-500 mt-1">{errors.value}</p>}
            </div>
            <div>
              <label className="label">Probabilidad ({form.probability ?? 30}%)</label>
              <input type="range" min="0" max="100" step="5"
                className="w-full mt-2 accent-amazonia-600"
                value={form.probability ?? 30}
                onChange={(e) => set('probability', parseInt(e.target.value))} />
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>0%</span><span>50%</span><span>100%</span>
              </div>
            </div>
          </div>

          {/* Expected close + assigned */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cierre esperado</label>
              <input type="date" className="input" value={form.expectedClose ?? ''}
                onChange={(e) => set('expectedClose', e.target.value || undefined)} />
            </div>
            <div>
              <label className="label">Asignado a</label>
              <select className="input" value={form.assignedTo ?? ''}
                onChange={(e) => set('assignedTo', e.target.value)}>
                <option value="">Sin asignar</option>
                {sellers.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Quotation link */}
          {quotations.length > 0 && (
            <div>
              <label className="label">Cotización vinculada</label>
              <select className="input" value={form.quotationId ?? ''}
                onChange={(e) => set('quotationId', e.target.value)}>
                <option value="">— Ninguna —</option>
                {quotations.map((q) => (
                  <option key={q.id} value={q.id}>{q.quoteNumber} — {q.customer}</option>
                ))}
              </select>
            </div>
          )}

          {/* Lost reason */}
          {form.stage === 'lost' && (
            <div>
              <label className="label">Motivo de pérdida</label>
              <input className="input" placeholder="Precio, competencia, timing..."
                value={form.lostReason ?? ''} onChange={(e) => set('lostReason', e.target.value)} />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="label">Notas</label>
            <textarea className="input resize-none" rows={2}
              placeholder="Contexto, próximos pasos..."
              value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Crear oportunidad'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Pipeline Page ────────────────────────────────────────────────────────
export default function PipelinePage() {
  const { opportunities, updateOpportunity, deleteOpportunity, quotations, updateQuotation, convertQuotation } = useStore()
  const [showModal, setShowModal]   = useState(false)
  const [editTarget, setEdit]       = useState<Opportunity | null>(null)
  const [deleteTarget, setDelete]   = useState<Opportunity | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [defaultStage, setDefault]  = useState<PipelineStage>('lead')
  const [sellerFilter, setSeller]   = useState('all')
  const [dragId, setDragId]         = useState<string | null>(null)
  const [dragOver, setDragOver]     = useState<PipelineStage | null>(null)
  const [view, setView]             = useState<'kanban' | 'list'>('kanban')

  const dragItem = useRef<Opportunity | null>(null)

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = opportunities.filter((o) =>
    sellerFilter === 'all' || o.assignedTo === sellerFilter
  )

  const byStage = (stage: PipelineStage) => filtered.filter((o) => o.stage === stage)

  // ── KPIs ─────────────────────────────────────────────────────────────────
  const active       = filtered.filter((o) => !['won','lost'].includes(o.stage))
  const won          = filtered.filter((o) => o.stage === 'won')
  const pipelineVal  = active.reduce((a, o) => a + o.value * (o.probability / 100), 0)
  const wonVal       = won.reduce((a, o) => a + o.value, 0)
  const convRate     = filtered.length > 0 ? (won.length / filtered.length * 100) : 0
  const avgDeal      = won.length > 0 ? wonVal / won.length : 0

  // ── Drag & Drop ───────────────────────────────────────────────────────────
  const handleDragStart = (opp: Opportunity) => {
    dragItem.current = opp
    setDragId(opp.id)
  }
  const handleDragEnd   = () => { setDragId(null); setDragOver(null); dragItem.current = null }
  const handleDragOver  = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault()
    setDragOver(stage)
  }
  // ── Oportunidad ganada → convertir cotización a venta (si está vinculada) ──
  const wonSideEffects = async (opp: Opportunity) => {
    if (!opp.quotationId) return
    const linked = quotations.find(q => q.id === opp.quotationId)
    if (!linked) return
    try {
      // Ensure the quote is marked as accepted before converting
      if (linked.status !== 'accepted') {
        await updateQuotation({ ...linked, status: 'accepted' })
      }
      // If not yet converted to a sale, do it now
      if (!linked.convertedToOrderId) {
        await convertQuotation(linked.id)
      }
    } catch { /* toast is emitted downstream */ }
  }

  const handleDrop = async (stage: PipelineStage) => {
    const opp = dragItem.current
    if (!opp || opp.stage === stage) { handleDragEnd(); return }
    const updated = { ...opp, stage, updatedAt: today() }
    await updateOpportunity(updated)
    if (stage === 'won') await wonSideEffects(updated)
    handleDragEnd()
  }

  const handleStageChange = async (opp: Opportunity, stage: PipelineStage) => {
    const updated = { ...opp, stage, updatedAt: today() }
    await updateOpportunity(updated)
    if (stage === 'won') await wonSideEffects(updated)
  }

  const allSellers = Array.from(new Set(opportunities.map((o) => o.assignedTo).filter(Boolean))) as string[]

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Kanban}
        title="Pipeline de ventas"
        subtitle="Gestión de oportunidades comerciales"
        accent="rgba(45, 74, 30, 0.20)"
        actions={
          <>
            <div className="inline-flex bg-slate-100/80 dark:bg-gray-700/80 rounded-xl p-1">
              <button onClick={() => setView('kanban')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${view === 'kanban' ? 'bg-white dark:bg-gray-800 shadow-soft text-amazonia-700 dark:text-amazonia-300' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'}`}>
                <Kanban size={12} className="inline mr-1" />Kanban
              </button>
              <button onClick={() => setView('list')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${view === 'list' ? 'bg-white dark:bg-gray-800 shadow-soft text-amazonia-700 dark:text-amazonia-300' : 'text-slate-500 dark:text-gray-400 hover:text-slate-800'}`}>
                <BarChart2 size={12} className="inline mr-1" />Lista
              </button>
            </div>
            <button onClick={() => { setDefault('lead'); setShowModal(true) }} className="btn btn-sm btn-primary">
              <Plus size={14} /> Nueva oportunidad
            </button>
          </>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        <StatCard icon={TrendingUp} label="Pipeline ponderado" value={formatCOP(pipelineVal)}     accent="#2563eb" hint={`${active.length} activas`} />
        <StatCard icon={Trophy}     label="Negocios ganados"   value={formatCOP(wonVal)}          accent="#10b981" hint={`${won.length} cierres`} />
        <StatCard icon={Target}     label="Tasa de conversión" value={`${convRate.toFixed(1)}%`}  accent="#8b5cf6" hint="Ganado / Total" />
        <StatCard icon={DollarSign} label="Ticket promedio"    value={formatCOP(avgDeal)}         accent="#f59e0b" hint="Por venta ganada" />
      </div>

      {/* Filters */}
      {allSellers.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Vendedor:</span>
          <button onClick={() => setSeller('all')}
            className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${sellerFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600'}`}>
            Todos
          </button>
          {allSellers.map((s) => (
            <button key={s} onClick={() => setSeller(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${sellerFilter === s ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600'}`}>
              {s.split(' ')[0]}
            </button>
          ))}
        </div>
      )}

      {/* ── KANBAN VIEW ── */}
      {view === 'kanban' && (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 220}px` }}>
            {STAGES.map((stage) => {
              const cards  = byStage(stage.key)
              const total  = cards.reduce((a, o) => a + o.value, 0)
              const isOver = dragOver === stage.key
              const StageIcon = stage.icon

              return (
                <div key={stage.key}
                  className={`flex-1 min-w-[200px] flex flex-col rounded-2xl border-2 transition-colors ${isOver ? 'border-blue-400 dark:border-blue-600 bg-blue-50/50 dark:bg-blue-900/10' : 'border-transparent'}`}
                  onDragOver={(e) => handleDragOver(e, stage.key)}
                  onDrop={() => handleDrop(stage.key)}
                  onDragLeave={() => setDragOver(null)}
                >
                  {/* Column header */}
                  <div className={`${stage.header} rounded-xl px-4 py-3 mb-3 flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <StageIcon size={14} className={stage.color} />
                      <span className={`font-semibold text-sm ${stage.color}`}>{stage.label}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-gray-800/60 ${stage.color} font-bold`}>
                        {cards.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {total > 0 && <span className="text-xs text-slate-500 dark:text-gray-400">{formatCOP(total)}</span>}
                      {!['won','lost'].includes(stage.key) && (
                        <button
                          onClick={() => { setDefault(stage.key); setShowModal(true) }}
                          className="w-6 h-6 rounded-lg bg-white/70 dark:bg-gray-800/70 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-white transition-colors"
                        >
                          <Plus size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="space-y-2 px-1 flex-1 min-h-[120px]">
                    {cards.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-24 text-slate-300 dark:text-gray-600 text-xs gap-1">
                        <ChevronRight size={20} className="opacity-40" />
                        <span>Arrastra aquí</span>
                      </div>
                    )}
                    {cards.map((opp) => (
                      <OppCard
                        key={opp.id}
                        opp={opp}
                        onEdit={(o) => setEdit(o)}
                        onDelete={(o) => setDelete(o)}
                        onStageChange={handleStageChange}
                        dragging={dragId === opp.id}
                        onDragStart={() => handleDragStart(opp)}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {view === 'list' && (
        <div className="card overflow-hidden overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400 dark:text-gray-600">
              <Kanban size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No hay oportunidades</p>
              <p className="text-xs mt-1">Crea la primera oportunidad de venta</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
                  {['Oportunidad', 'Cliente', 'Etapa', 'Valor', 'Prob.', 'Cierre', 'Asignado', 'Acciones'].map((h) => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.sort((a,b) => {
                  const si = STAGES.findIndex((s) => s.key === a.stage)
                  const sj = STAGES.findIndex((s) => s.key === b.stage)
                  return si - sj
                }).map((opp) => {
                  const stage = STAGES.find((s) => s.key === opp.stage)!
                  const isOverdue = opp.expectedClose && opp.expectedClose < today() && !['won','lost'].includes(opp.stage)
                  return (
                    <tr key={opp.id} className="table-row">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800 dark:text-gray-200">{opp.title}</div>
                        {opp.notes && <div className="text-xs text-slate-400 truncate max-w-[180px]">{opp.notes}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-gray-300">{opp.customer}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${stage.header} ${stage.color}`}>
                          {stage.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(opp.value)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-12 bg-slate-100 dark:bg-gray-700 rounded-full h-1.5">
                            <div className={`h-1.5 rounded-full ${opp.probability >= 75 ? 'bg-emerald-500' : opp.probability >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                              style={{ width: `${opp.probability}%` }} />
                          </div>
                          <span className="text-xs text-slate-500">{opp.probability}%</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-slate-500 dark:text-gray-400'}`}>
                        {fmt(opp.expectedClose)}
                        {isOverdue && <AlertCircle size={11} className="inline ml-1" />}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-500 dark:text-gray-400">{opp.assignedTo || '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          {!['won','lost'].includes(opp.stage) && (
                            <>
                              <button onClick={() => handleStageChange(opp, STAGES[STAGES.findIndex((s) => s.key === opp.stage) + 1]?.key ?? opp.stage)}
                                className="btn btn-sm btn-secondary flex items-center gap-1 text-xs">
                                <ArrowRight size={11} />
                              </button>
                              <button onClick={() => handleStageChange(opp, 'won')}
                                className="btn btn-sm flex items-center gap-1 text-xs text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                                <Trophy size={11} />
                              </button>
                            </>
                          )}
                          <button onClick={() => setEdit(opp)} className="btn btn-sm btn-secondary">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => setDelete(opp)}
                            className="btn btn-sm flex items-center gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modals */}
      {showModal    && <OppModal defaultStage={defaultStage} onClose={() => setShowModal(false)} />}
      {editTarget   && <OppModal initial={editTarget} onClose={() => setEdit(null)} />}
      {deleteTarget && (
        <ConfirmDelete
          name={`${deleteTarget.title} — ${deleteTarget.customer}`}
          loading={deleting}
          onCancel={() => setDelete(null)}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deleteOpportunity(deleteTarget.id)
              setDelete(null)
            } finally {
              setDeleting(false)
            }
          }}
        />
      )}
    </div>
  )
}
