import { useState, useEffect, useRef } from 'react'
import {
  Truck, Plus, Search, X, CheckCircle2, Clock, AlertCircle, Package2,
  MapPin, User, Calendar, Trash2, ChevronDown, ChevronUp, Send, Ban,
  Navigation, ReceiptText, MessageCircle, RotateCcw, History, Banknote,
  Camera,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Dispatch, DeliveryAttempt } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import { formatCOP } from '../utils/currency'
import ConfirmDelete from '../components/ConfirmDelete'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { openWhatsApp, buildDispatchNotification, buildDeliveryConfirmation } from '../utils/whatsapp'

// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  scheduled:  'Programado',
  in_transit: 'En ruta',
  delivered:  'Entregado',
  failed:     'No entregado',
  cancelled:  'Cancelado',
}
const STATUS_BADGE: Record<string, string> = {
  scheduled:  'badge-blue',
  in_transit: 'badge-yellow',
  delivered:  'badge-green',
  failed:     'badge-red',
  cancelled:  'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs px-2 py-0.5 rounded-full font-medium',
}
const STATUS_ICON: Record<string, React.ElementType> = {
  scheduled:  Clock,
  in_transit: Navigation,
  delivered:  CheckCircle2,
  failed:     AlertCircle,
  cancelled:  Ban,
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ── Create/Edit Modal ─────────────────────────────────────────────────────────
function DispatchModal({ initial, onClose }: { initial?: Dispatch; onClose: () => void }) {
  const { saleOrders, dispatches, addDispatch, updateDispatch, companySettings } = useStore()
  const today = new Date().toISOString().split('T')[0]

  // Conductores configurables (Configuración → Equipo de trabajo).
  const drivers = (companySettings.teamMembers ?? [])
    .filter((m) => m.role === 'driver' && m.isActive)
    .map((m) => m.name)

  const [form, setForm] = useState<Partial<Dispatch>>(initial ?? {
    scheduledDate: today,
    status:        'scheduled',
    driver:        drivers[0] ?? '',
    date:          today,
    items:         [],
  })
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // When a sale order is selected, populate customer + items + total
  const handleOrderSelect = (orderId: string) => {
    const o = saleOrders.find((x) => x.id === orderId)
    if (!o) return
    setForm((f) => ({
      ...f,
      saleOrderId:     o.id,
      saleOrderNumber: o.orderNumber,
      customer:        o.customer,
      customerId:      o.customerId,
      items:           o.items.map((i) => ({ product: i.product, qty: i.qty })),
      total:           o.total,
    }))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.scheduledDate) e.scheduledDate = 'Requerido'
    if (!form.driver)        e.driver        = 'Requerido'
    if (!form.saleOrderId && !form.customer) e.customer = 'Seleccione una orden o ingrese cliente'
    return e
  }

  const handleSave = async () => {
    const e = validate()
    if (Object.keys(e).length) { setErrors(e); return }
    setSaving(true)
    try {
      const year = new Date().getFullYear()
      const num  = String(dispatches.length + 1).padStart(4, '0')
      const d: Dispatch = {
        id:              initial?.id ?? `dsp${Date.now()}`,
        dispatchNumber:  initial?.dispatchNumber ?? `DSP-${year}-${num}`,
        saleOrderId:     form.saleOrderId     ?? '',
        saleOrderNumber: form.saleOrderNumber ?? '',
        customer:        form.customer        ?? '',
        customerId:      form.customerId      ?? '',
        address:         form.address         ?? '',
        scheduledDate:   form.scheduledDate!,
        scheduledTime:   form.scheduledTime   ?? '',
        driver:          form.driver!,
        vehiclePlate:    form.vehiclePlate    ?? '',
        // If we're editing a failed dispatch, reset to 'scheduled' so the
        // operator can run the delivery flow again from the start.
        status:          (initial?.status === 'failed'
                          ? 'scheduled'
                          : (form.status as Dispatch['status'] ?? 'scheduled')),
        deliveryNotes:   form.deliveryNotes   ?? '',
        deliveryAttempts: initial?.deliveryAttempts ?? [],
        items:           form.items           ?? [],
        total:           form.total           ?? 0,
        date:            form.date            ?? today,
      }
      if (initial) await updateDispatch(d)
      else         await addDispatch(d)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof Dispatch, value: unknown) =>
    setForm((f) => ({ ...f, [key]: value }))

  // Only show orders not yet dispatched (or the current one)
  const availableOrders = saleOrders.filter(
    (o) => ['confirmed', 'processing'].includes(o.status) &&
      (!dispatches.find((d) => d.saleOrderId === o.id) || o.id === form.saleOrderId)
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h2 className="font-semibold text-slate-800 dark:text-white">
            {initial ? (initial.status === 'failed' ? 'Reagendar despacho' : 'Editar despacho') : 'Nuevo despacho'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Failed attempts banner (visible when rescheduling) */}
          {initial?.deliveryAttempts && initial.deliveryAttempts.length > 0 && (
            <div className="rounded-2xl border border-amber-200/70 dark:border-amber-800/60 overflow-hidden"
                 style={{ background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.5) 0%, rgba(254, 215, 170, 0.25) 100%)' }}>
              <div className="px-4 py-2.5 border-b border-amber-200/60 dark:border-amber-800/40 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <History size={13} className="text-amber-700" />
                </div>
                <div>
                  <p className="font-bold text-amber-900 dark:text-amber-300 text-xs">
                    {initial.deliveryAttempts.length} {initial.deliveryAttempts.length === 1 ? 'intento previo' : 'intentos previos'} fallido(s)
                  </p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                    Ten en cuenta estas indicaciones para la nueva entrega
                  </p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2 max-h-44 overflow-y-auto">
                {initial.deliveryAttempts.map((a, i) => (
                  <div key={i} className="bg-white/70 dark:bg-gray-800/60 rounded-xl p-2.5 border border-amber-100 dark:border-amber-900/40">
                    <div className="flex items-start justify-between gap-2">
                      <span className="badge badge-red text-[10px]">{a.reason}</span>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(a.date).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {a.notes && (
                      <p className="text-xs text-slate-700 dark:text-gray-200 leading-snug mt-1.5">
                        <span className="font-semibold">📝 </span>{a.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Order selector */}
          <div>
            <label className="label">Orden de venta</label>
            <select className="input" value={form.saleOrderId ?? ''} onChange={(e) => handleOrderSelect(e.target.value)}>
              <option value="">— Sin vincular a orden —</option>
              {availableOrders.map((o) => (
                <option key={o.id} value={o.id}>{o.orderNumber} — {o.customer}</option>
              ))}
            </select>
            {!form.saleOrderId && (
              <p className="text-xs text-slate-400 mt-1">Solo órdenes en estado Confirmado o En proceso</p>
            )}
          </div>

          {/* Customer (manual if no order) */}
          <div>
            <label className="label">Cliente *</label>
            <input className={`input ${errors.customer ? 'border-red-400' : ''}`} placeholder="Nombre del cliente"
              value={form.customer ?? ''} onChange={(e) => set('customer', e.target.value)} />
            {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
          </div>

          {/* Address */}
          <div>
            <label className="label">Dirección de entrega</label>
            <input className="input" placeholder="Dirección, ciudad" value={form.address ?? ''}
              onChange={(e) => set('address', e.target.value)} />
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha programada *</label>
              <input type="date" className={`input ${errors.scheduledDate ? 'border-red-400' : ''}`}
                value={form.scheduledDate ?? ''} onChange={(e) => set('scheduledDate', e.target.value)} />
            </div>
            <div>
              <label className="label">Hora</label>
              <input type="time" className="input" value={form.scheduledTime ?? ''}
                onChange={(e) => set('scheduledTime', e.target.value)} />
            </div>
          </div>

          {/* Driver + Plate */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Conductor *</label>
              <select className={`input ${errors.driver ? 'border-red-400' : ''}`}
                value={form.driver ?? ''} onChange={(e) => set('driver', e.target.value)}>
                <option value="">Seleccionar...</option>
                {/* Conserva el conductor asignado aunque haya sido desactivado/eliminado */}
                {form.driver && !drivers.includes(form.driver) && (
                  <option value={form.driver}>{form.driver}</option>
                )}
                {drivers.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              {errors.driver && <p className="text-xs text-red-500 mt-1">{errors.driver}</p>}
            </div>
            <div>
              <label className="label">Placa vehículo</label>
              <input className="input" placeholder="ABC-123" value={form.vehiclePlate ?? ''}
                onChange={(e) => set('vehiclePlate', e.target.value.toUpperCase())} />
            </div>
          </div>

          {/* Items summary */}
          {(form.items?.length ?? 0) > 0 && (
            <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-3">
              <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-2">Productos a despachar</p>
              {form.items!.map((item, i) => (
                <div key={i} className="flex justify-between text-xs text-slate-600 dark:text-gray-300 py-0.5">
                  <span>{item.product}</span>
                  <span className="font-medium">×{item.qty}</span>
                </div>
              ))}
              {form.total && (
                <div className="flex justify-between text-xs font-bold text-slate-800 dark:text-white border-t border-slate-200 dark:border-gray-600 mt-2 pt-2">
                  <span>Total</span><span>{formatCOP(form.total)}</span>
                </div>
              )}
            </div>
          )}

          {/* Delivery notes */}
          <div>
            <label className="label">Notas de entrega</label>
            <textarea className="input resize-none" rows={2} placeholder="Instrucciones especiales, referencia..."
              value={form.deliveryNotes ?? ''} onChange={(e) => set('deliveryNotes', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-secondary">Cancelar</button>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? 'Guardando...' : initial ? 'Actualizar' : 'Crear despacho'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Failed-delivery reason picker ────────────────────────────────────────────
const FAIL_REASONS = [
  'Cliente ausente',
  'Dirección incorrecta',
  'Cliente rechazó la entrega',
  'No contestó el teléfono',
  'Producto dañado',
  'Cliente reprogramó',
  'Vehículo / problema en ruta',
  'Otro',
] as const

function FailReasonModal({
  onConfirm, onCancel, currentDriver,
}: {
  onConfirm: (a: DeliveryAttempt) => void
  onCancel:  () => void
  currentDriver: string
}) {
  const [reason, setReason] = useState<string>('')
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!reason) return
    setSaving(true)
    onConfirm({
      date:   new Date().toISOString(),
      reason,
      notes:  notes.trim() || undefined,
      driver: currentDriver || undefined,
    })
  }

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
              <AlertCircle size={18} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white text-sm">Entrega no realizada</p>
              <p className="text-xs text-slate-400">¿Por qué no se pudo entregar?</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Motivo *</label>
            <div className="flex flex-wrap gap-1.5">
              {FAIL_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    reason === r
                      ? 'bg-red-600 text-white border-red-600 shadow-soft'
                      : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:border-red-400 hover:text-red-700'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Indicaciones para próximo intento</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="Ej: llamar 15 min antes, casa esquinera, portero negro..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 dark:text-gray-500 mt-1">
              Estas indicaciones quedarán visibles al reagendar la entrega.
            </p>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button className="btn btn-secondary flex-1" onClick={onCancel}>Cancelar</button>
          <button
            className="btn btn-danger flex-1"
            onClick={handleSave}
            disabled={!reason || saving}
          >
            {saving ? 'Guardando...' : 'Marcar no entregado'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Import PaymentModal for cash-on-delivery collection ──────────────────────
import { PaymentModal } from './Payments'

// ── Delivery Proof Modal ────────────────────────────────────────────────────
type ProofPayload = { photo?: string; lat?: number; lng?: number }

function DeliveryProofModal({
  onConfirm, onCancel,
}: {
  onConfirm: (proof?: ProofPayload) => void
  onCancel: () => void
}) {
  const [photo, setPhoto] = useState<string | undefined>()
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>()
  const [geoState, setGeoState] = useState<'pending' | 'ok' | 'error'>('pending')
  const [processing, setProcessing] = useState(false)
  const [preview, setPreview] = useState<string | undefined>()
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!('geolocation' in navigator)) { setGeoState('error'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setGeoState('ok')
      },
      () => setGeoState('error'),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  const resizeImage = (dataUrl: string): Promise<string> =>
    new Promise((resolve) => {
      const img = new Image()
      img.onload = () => {
        const maxW = 800
        const scale = img.width > maxW ? maxW / img.width : 1
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { resolve(dataUrl); return }
        ctx.drawImage(img, 0, 0, w, h)
        let quality = 0.7
        let out = canvas.toDataURL('image/jpeg', quality)
        // Aim for < 300KB — data URL length ≈ 1.37× bytes
        while (out.length > 300 * 1024 * 1.37 && quality > 0.3) {
          quality -= 0.1
          out = canvas.toDataURL('image/jpeg', quality)
        }
        resolve(out)
      }
      img.onerror = () => resolve(dataUrl)
      img.src = dataUrl
    })

  const handleFile = async (file: File) => {
    setProcessing(true)
    try {
      const raw: string = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const resized = await resizeImage(raw)
      setPhoto(resized)
      setPreview(resized)
    } finally {
      setProcessing(false)
    }
  }

  const handleConfirm = () => {
    if (!photo && !coords) { onConfirm(undefined); return }
    onConfirm({ photo, lat: coords?.lat, lng: coords?.lng })
  }

  return (
    <div className="fixed inset-0 modal-backdrop z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md animate-scaleIn" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
              <Camera size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white text-sm">Evidencia de entrega</p>
              <p className="text-xs text-slate-400">Foto y ubicación (opcional)</p>
            </div>
          </div>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          {/* Photo capture */}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              autoFocus
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Evidencia" className="w-full h-48 object-cover rounded-xl border border-slate-200 dark:border-gray-700" />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-2 right-2 btn btn-sm bg-white/90 dark:bg-gray-800/90 text-slate-700 dark:text-gray-200 flex items-center gap-1"
                >
                  <Camera size={12} /> Cambiar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={processing}
                className="w-full h-40 rounded-xl border-2 border-dashed border-slate-300 dark:border-gray-600 hover:border-emerald-400 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 flex flex-col items-center justify-center gap-2 text-slate-500 dark:text-gray-400 transition-colors"
              >
                <Camera size={28} />
                <span className="text-sm font-semibold">{processing ? 'Procesando...' : 'Tomar foto'}</span>
                <span className="text-[10px]">Cámara o galería</span>
              </button>
            )}
          </div>

          {/* Geolocation status */}
          <div className="flex items-start gap-2 text-xs bg-slate-50 dark:bg-gray-700/50 rounded-xl px-3 py-2">
            <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
            {geoState === 'pending' && <span className="text-slate-500 dark:text-gray-400">Obteniendo ubicación...</span>}
            {geoState === 'ok' && coords && (
              <span className="text-emerald-700 dark:text-emerald-400 font-medium tabular-nums">
                {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
              </span>
            )}
            {geoState === 'error' && <span className="text-slate-500 dark:text-gray-400">Ubicación no disponible</span>}
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3">
          <button className="btn btn-secondary flex-1" onClick={() => onConfirm(undefined)}>Omitir</button>
          <button
            className="btn flex-1 bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2"
            onClick={handleConfirm}
            disabled={processing}
          >
            <CheckCircle2 size={14} /> Confirmar entrega
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Dispatch Detail Drawer ────────────────────────────────────────────────────
function DispatchDrawer({ d, onClose, onEdit }: { d: Dispatch; onClose: () => void; onEdit: () => void }) {
  const { updateDispatch, customers, companySettings, saleOrders, payments } = useStore()
  const customer = customers.find(c => c.id === d.customerId)
  const [expanded, setExpanded] = useState(true)
  const [delivering, setDelivering] = useState(false)
  const [notes, setNotes] = useState(d.deliveryNotes ?? '')
  const [showFailModal, setShowFailModal] = useState(false)
  const [showProofModal, setShowProofModal] = useState(false)
  const [proofLightbox, setProofLightbox] = useState<string | null>(null)

  const StatusIcon = STATUS_ICON[d.status] ?? Truck
  const attempts = d.deliveryAttempts ?? []
  const [codPrefill, setCodPrefill] = useState<null | { saleOrderId: string; saleOrderNumber: string; customer: string; customerId: string; remaining: number }>(null)

  // Remaining balance on the linked sale order (if any)
  const linkedOrder = d.saleOrderId ? saleOrders.find(o => o.id === d.saleOrderId) : undefined
  const orderPayments = linkedOrder ? payments.filter(p => p.saleOrderId === linkedOrder.id) : []
  const orderPaid = orderPayments.reduce((sum, p) => sum + p.amount, 0)
  const orderRemaining = linkedOrder ? Math.max(0, linkedOrder.total - orderPaid) : 0

  const changeStatus = async (status: Dispatch['status']) => {
    setDelivering(true)
    const updated: Dispatch = {
      ...d,
      status,
      deliveredAt:   status === 'delivered' ? new Date().toISOString().split('T')[0] : d.deliveredAt,
      deliveryNotes: notes,
    }
    await updateDispatch(updated)
    setDelivering(false)

    // Cash-on-delivery: if we just delivered and the linked order still owes
    // money, open the payment modal pre-filled with the driver's name.
    if (status === 'delivered' && linkedOrder && orderRemaining > 0) {
      setCodPrefill({
        saleOrderId:     linkedOrder.id,
        saleOrderNumber: linkedOrder.orderNumber,
        customer:        linkedOrder.customer,
        customerId:      linkedOrder.customerId,
        remaining:       orderRemaining,
      })
      return  // don't close the drawer — PaymentModal opens on top
    }

    onClose()
  }

  const handleDeliveryConfirm = async (proof?: ProofPayload) => {
    setShowProofModal(false)
    setDelivering(true)
    const today = new Date().toISOString().split('T')[0]
    const updated: Dispatch = {
      ...d,
      status: 'delivered',
      deliveredAt: today,
      deliveryNotes: notes,
      deliveryProof: proof
        ? { ...proof, capturedAt: new Date().toISOString() }
        : undefined,
    }
    await updateDispatch(updated)
    setDelivering(false)

    if (linkedOrder && orderRemaining > 0) {
      setCodPrefill({
        saleOrderId:     linkedOrder.id,
        saleOrderNumber: linkedOrder.orderNumber,
        customer:        linkedOrder.customer,
        customerId:      linkedOrder.customerId,
        remaining:       orderRemaining,
      })
      return
    }
    onClose()
  }

  const handleFailConfirm = async (attempt: DeliveryAttempt) => {
    setShowFailModal(false)
    setDelivering(true)
    const updated: Dispatch = {
      ...d,
      status: 'failed',
      deliveryNotes: notes,
      deliveryAttempts: [...attempts, attempt],
    }
    await updateDispatch(updated)
    setDelivering(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-40 flex justify-end" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 h-full w-full max-w-md shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
              <Truck size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-white">{d.dispatchNumber}</p>
              <span className={`badge ${STATUS_BADGE[d.status] ?? 'badge-blue'}`}>
                <StatusIcon size={11} className="inline mr-1" />{STATUS_LABEL[d.status]}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: User,     label: 'Cliente',    val: d.customer },
              { icon: User,     label: 'Conductor',  val: d.driver },
              { icon: Calendar, label: 'Programado', val: `${fmt(d.scheduledDate)}${d.scheduledTime ? ' ' + d.scheduledTime : ''}` },
              { icon: Truck,    label: 'Placa',      val: d.vehiclePlate || '—' },
            ].map((r) => (
              <div key={r.label} className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <r.icon size={12} className="text-slate-400" />
                  <span className="text-xs text-slate-400 dark:text-gray-400">{r.label}</span>
                </div>
                <p className="text-sm font-semibold text-slate-700 dark:text-gray-200 truncate">{r.val}</p>
              </div>
            ))}
          </div>

          {d.address && (
            <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-gray-300">
              <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <span>{d.address}</span>
            </div>
          )}

          {d.saleOrderNumber && (
            <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-gray-300">
              <ReceiptText size={14} className="shrink-0 text-slate-400" />
              <span>Orden: <span className="font-mono text-blue-600 dark:text-blue-400">{d.saleOrderNumber}</span></span>
            </div>
          )}

          {/* Items */}
          {d.items.length > 0 && (
            <div>
              <button onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-gray-200 mb-2">
                <Package2 size={14} />
                Productos ({d.items.length})
                {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {expanded && (
                <div className="space-y-1">
                  {d.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-slate-600 dark:text-gray-300 py-1 border-b border-slate-100 dark:border-gray-700 last:border-0">
                      <span>{item.product}</span>
                      <span className="font-semibold">×{item.qty}</span>
                    </div>
                  ))}
                  {d.total > 0 && (
                    <div className="flex justify-between text-sm font-bold text-slate-800 dark:text-white pt-1">
                      <span>Total</span><span>{formatCOP(d.total)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Failed delivery attempts history */}
          {attempts.length > 0 && (
            <div className="rounded-2xl border border-amber-200/70 dark:border-amber-800/60 overflow-hidden"
                 style={{ background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.5) 0%, rgba(254, 215, 170, 0.25) 100%)' }}>
              <div className="px-4 py-2.5 border-b border-amber-200/60 dark:border-amber-800/40 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <History size={13} className="text-amber-700" />
                </div>
                <div>
                  <p className="font-bold text-amber-900 dark:text-amber-300 text-xs">
                    {attempts.length} {attempts.length === 1 ? 'intento fallido' : 'intentos fallidos'}
                  </p>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-400/80">
                    Considera estas indicaciones al reagendar
                  </p>
                </div>
              </div>
              <div className="px-4 py-3 space-y-2.5 max-h-60 overflow-y-auto">
                {attempts.map((a, i) => (
                  <div key={i} className="bg-white/70 dark:bg-gray-800/60 rounded-xl p-2.5 border border-amber-100 dark:border-amber-900/40">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="badge badge-red text-[10px]">{a.reason}</span>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 whitespace-nowrap">
                        {new Date(a.date).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    {a.notes && (
                      <p className="text-xs text-slate-700 dark:text-gray-200 leading-snug mt-1">
                        <span className="font-semibold">📝 </span>{a.notes}
                      </p>
                    )}
                    {a.driver && (
                      <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1">
                        Conductor: <span className="font-medium">{a.driver}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delivery notes */}
          <div>
            <label className="label">Notas de entrega</label>
            <textarea className="input resize-none" rows={2} value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={d.status === 'delivered' || d.status === 'cancelled'}
              placeholder="Agregar notas..." />
          </div>

          {d.deliveredAt && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400">
              ✓ Entregado el {fmt(d.deliveredAt)}
            </p>
          )}

          {/* Delivery proof (when delivered) */}
          {d.status === 'delivered' && d.deliveryProof && (d.deliveryProof.photo || d.deliveryProof.lat != null) && (
            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Camera size={13} className="text-emerald-700 dark:text-emerald-400" />
                <p className="text-xs font-bold text-emerald-900 dark:text-emerald-300">Evidencia de entrega</p>
              </div>
              <div className="flex gap-3 items-start">
                {d.deliveryProof.photo && (
                  <button
                    type="button"
                    onClick={() => setProofLightbox(d.deliveryProof!.photo!)}
                    className="shrink-0"
                  >
                    <img
                      src={d.deliveryProof.photo}
                      alt="Evidencia"
                      className="w-20 h-20 object-cover rounded-lg border border-emerald-200 dark:border-emerald-800 hover:opacity-90"
                    />
                  </button>
                )}
                <div className="flex-1 min-w-0 text-xs space-y-1">
                  {d.deliveryProof.lat != null && d.deliveryProof.lng != null && (
                    <a
                      href={`https://www.google.com/maps?q=${d.deliveryProof.lat},${d.deliveryProof.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline tabular-nums"
                    >
                      <MapPin size={12} />
                      {d.deliveryProof.lat.toFixed(5)}, {d.deliveryProof.lng.toFixed(5)}
                    </a>
                  )}
                  <p className="text-slate-500 dark:text-gray-400">
                    {new Date(d.deliveryProof.capturedAt).toLocaleString('es-CO', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        {!['delivered', 'cancelled'].includes(d.status) && (
          <div className="px-6 pb-6 space-y-2">
            <p className="text-xs text-slate-400 dark:text-gray-500 mb-3">Cambiar estado:</p>
            {d.status === 'scheduled' && (
              <button onClick={() => changeStatus('in_transit')} disabled={delivering}
                className="w-full btn btn-primary flex items-center justify-center gap-2">
                <Navigation size={14} /> Iniciar ruta
              </button>
            )}
            {d.status === 'in_transit' && (
              <>
                {orderRemaining > 0 && (
                  <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/70 dark:bg-amber-900/20 px-3.5 py-2.5 mb-2 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Banknote size={14} className="text-amber-700 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-amber-900 dark:text-amber-300 leading-tight uppercase tracking-wide">Cobrar al entregar</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white tabular-nums">
                        {formatCOP(orderRemaining)}
                      </p>
                    </div>
                  </div>
                )}
                <button onClick={() => setShowProofModal(true)} disabled={delivering}
                  className="w-full btn flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                  <CheckCircle2 size={14} /> Confirmar entrega{orderRemaining > 0 ? ' y cobrar' : ''}
                </button>
                <button onClick={() => setShowFailModal(true)} disabled={delivering}
                  className="w-full btn flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800">
                  <AlertCircle size={14} /> No se pudo entregar
                </button>
              </>
            )}
            {d.status === 'failed' && (
              <>
                <button onClick={onEdit} disabled={delivering}
                  className="w-full btn btn-primary flex items-center justify-center gap-2">
                  <RotateCcw size={14} /> Reagendar entrega
                </button>
                <button onClick={() => changeStatus('in_transit')} disabled={delivering}
                  className="w-full btn btn-secondary flex items-center justify-center gap-2">
                  <Send size={14} /> Reintentar hoy mismo
                </button>
                <button onClick={() => changeStatus('cancelled')} disabled={delivering}
                  className="w-full btn flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-600 dark:text-gray-300">
                  <Ban size={14} /> Cancelar despacho
                </button>
              </>
            )}
            <button onClick={onEdit}
              className="w-full btn btn-secondary">Editar despacho</button>
            {customer?.phone && d.status === 'scheduled' && (
              <button
                className="w-full btn flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                onClick={() => openWhatsApp(customer.phone, buildDispatchNotification({
                  companyName: companySettings.companyName, customer: d.customer,
                  dispatchNumber: d.dispatchNumber, orderNumber: d.saleOrderNumber,
                  scheduledDate: d.scheduledDate, scheduledTime: d.scheduledTime,
                  driver: d.driver, address: d.address, items: d.items,
                }))}>
                <MessageCircle size={14} /> Notificar despacho por WhatsApp
              </button>
            )}
          </div>
        )}

        {/* WhatsApp delivery confirmation */}
        {customer?.phone && d.status === 'delivered' && (
          <div className="px-6 pb-6">
            <button
              className="w-full btn flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
              onClick={() => openWhatsApp(customer.phone, buildDeliveryConfirmation({
                companyName: companySettings.companyName, customer: d.customer,
                dispatchNumber: d.dispatchNumber, deliveredAt: d.deliveredAt || d.scheduledDate,
              }))}>
              <MessageCircle size={14} /> Confirmar entrega por WhatsApp
            </button>
          </div>
        )}
      </div>

      {/* Delivery proof modal */}
      {showProofModal && (
        <DeliveryProofModal
          onCancel={() => setShowProofModal(false)}
          onConfirm={handleDeliveryConfirm}
        />
      )}

      {/* Proof photo lightbox */}
      {proofLightbox && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setProofLightbox(null)}>
          <img src={proofLightbox} alt="Evidencia" className="max-w-full max-h-full object-contain rounded-lg" />
          <button
            onClick={() => setProofLightbox(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Fail-reason modal */}
      {showFailModal && (
        <FailReasonModal
          currentDriver={d.driver}
          onCancel={() => setShowFailModal(false)}
          onConfirm={handleFailConfirm}
        />
      )}

      {/* Cash-on-delivery payment modal (auto-opened on "Confirmar entrega" when balance > 0) */}
      {codPrefill && (
        <PaymentModal
          prefill={codPrefill}
          onClose={() => { setCodPrefill(null); onClose() }}
        />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15

export default function DispatchPage() {
  const { dispatches, deleteDispatch, customers, companySettings } = useStore()
  const { canDelete } = usePermissions()

  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [driverFilter, setDriver]   = useState('all')
  const [showModal, setShowModal]   = useState(false)
  const [editTarget, setEditTarget] = useState<Dispatch | null>(null)
  const [detail, setDetail]         = useState<Dispatch | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Dispatch | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [page, setPage]                 = useState(1)

  const today = new Date().toISOString().split('T')[0]

  // ── Filters ──────────────────────────────────────────────────────────────
  const filtered = dispatches.filter((d) => {
    const q = search.toLowerCase()
    const matchSearch = d.dispatchNumber.toLowerCase().includes(q) ||
                        d.customer.toLowerCase().includes(q)        ||
                        d.driver.toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || d.status === statusFilter
    const matchDriver = driverFilter === 'all' || d.driver === driverFilter
    return matchSearch && matchStatus && matchDriver
  })

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── KPIs ────────────────────────────────────────────────────────────────
  const total       = dispatches.length
  const inTransit   = dispatches.filter((d) => d.status === 'in_transit').length
  const scheduledToday = dispatches.filter((d) => d.status === 'scheduled' && d.scheduledDate === today).length
  const deliveredToday = dispatches.filter((d) => d.status === 'delivered' && d.deliveredAt === today).length

  const allDrivers = Array.from(new Set(dispatches.map((d) => d.driver).filter(Boolean)))

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Navigation}
        title="Despachos"
        subtitle="Logística y seguimiento de entregas"
        accent="rgba(13, 148, 136, 0.20)"
        actions={
          <button className="btn btn-sm btn-primary flex items-center gap-2" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Nuevo despacho
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard icon={Truck} label="Total despachos" value={total} accent="#0d9488" />
        <StatCard icon={Navigation} label="En ruta ahora" value={inTransit} accent="#2563eb" />
        <StatCard icon={Calendar} label="Programados hoy" value={scheduledToday} accent="#f59e0b" />
        <StatCard icon={CheckCircle2} label="Entregados hoy" value={deliveredToday} accent="#10b981" />
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar por nº, cliente o conductor..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          {allDrivers.length > 0 && (
            <select className="input w-auto text-sm" value={driverFilter}
              onChange={(e) => { setDriver(e.target.value); setPage(1) }}>
              <option value="all">Todos los conductores</option>
              {allDrivers.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {(search || statusFilter !== 'all' || driverFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStatus('all'); setDriver('all'); setPage(1) }}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
              <X size={12} className="inline mr-1" />Limpiar
            </button>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[['all','Todos'], ['scheduled','Programados'], ['in_transit','En ruta'], ['delivered','Entregados'], ['failed','No entregado'], ['cancelled','Cancelados']].map(([v, l]) => (
            <button key={v} onClick={() => { setStatus(v); setPage(1) }}
              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === v
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {paginated.length === 0 ? (
          <div className="text-center py-16 text-slate-400 dark:text-gray-600">
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No hay despachos{statusFilter !== 'all' ? ' con ese estado' : ''}</p>
            <p className="text-xs mt-1">Crea el primer despacho desde una orden de venta</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
                {['Despacho','Cliente','Conductor','Fecha prog.','Estado','Productos','Total','Acciones'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.map((d) => {
                const SIcon = STATUS_ICON[d.status] ?? Truck
                return (
                  <tr key={d.id} className="table-row cursor-pointer" onClick={() => setDetail(d)}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-blue-600 dark:text-blue-400">{d.dispatchNumber}</span>
                      {d.saleOrderNumber && (
                        <p className="text-xs text-slate-400">{d.saleOrderNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-gray-200">
                      <div>{d.customer}</div>
                      {d.address && <div className="text-xs text-slate-400 truncate max-w-[140px]">{d.address}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-gray-300 text-xs">
                      <div>{d.driver}</div>
                      {d.vehiclePlate && <div className="text-slate-400">{d.vehiclePlate}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-400 text-xs">
                      <div>{fmt(d.scheduledDate)}</div>
                      {d.scheduledTime && <div>{d.scheduledTime}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${STATUS_BADGE[d.status] ?? 'badge-blue'} flex items-center gap-1 w-fit`}>
                        <SIcon size={11} />{STATUS_LABEL[d.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-400 text-xs">{d.items.length} ítem(s)</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white text-xs">
                      {d.total > 0 ? formatCOP(d.total) : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button className="btn btn-sm btn-secondary" onClick={() => setDetail(d)}>Ver</button>
                        {!['delivered','cancelled'].includes(d.status) && (
                          <button className="btn btn-sm btn-secondary" onClick={() => { setEditTarget(d) }}>Editar</button>
                        )}
                        {(() => {
                          const cust = customers.find(c => c.id === d.customerId)
                          if (!cust?.phone || !['scheduled','in_transit'].includes(d.status)) return null
                          return (
                            <button className="btn btn-sm flex items-center gap-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-200 dark:border-green-800"
                              onClick={() => openWhatsApp(cust.phone, buildDispatchNotification({
                                companyName: companySettings.companyName, customer: d.customer,
                                dispatchNumber: d.dispatchNumber, orderNumber: d.saleOrderNumber,
                                scheduledDate: d.scheduledDate, scheduledTime: d.scheduledTime,
                                driver: d.driver, address: d.address, items: d.items,
                              }))} title="Notificar por WhatsApp">
                              <MessageCircle size={12} />
                            </button>
                          )
                        })()}
                        {canDelete('sales') && (
                          <button className="btn btn-sm flex items-center gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                            onClick={() => setDeleteTarget(d)}>
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
        )}
        <div className="px-4 pb-2">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      {/* Modals */}
      {showModal && <DispatchModal onClose={() => setShowModal(false)} />}
      {editTarget && <DispatchModal initial={editTarget} onClose={() => setEditTarget(null)} />}
      {detail && (
        <DispatchDrawer
          d={detail}
          onClose={() => setDetail(null)}
          onEdit={() => { setEditTarget(detail); setDetail(null) }}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          name={`${deleteTarget.dispatchNumber} — ${deleteTarget.customer}`}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deleteDispatch(deleteTarget.id)
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
