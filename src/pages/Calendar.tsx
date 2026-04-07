import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import {
  ChevronLeft, ChevronRight, CalendarDays, Truck, Factory,
  ShoppingCart, FileText, Clock, Package, Filter, Users, Bell,
  Plus, Trash2, Check, MessageCircle, X,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { CalendarItem, CalendarItemKind } from '../store/useStore'
import { formatCOP } from '../utils/currency'

// ── Types ─────────────────────────────────────────────────────────────────────
type EventType = 'dispatch' | 'production' | 'delivery' | 'sale' | 'quotation' | 'purchase' | 'meeting' | 'reminder'

interface CalendarEvent {
  id: string
  type: EventType
  title: string
  subtitle?: string
  date: string          // ISO date YYYY-MM-DD
  time?: string         // HH:MM
  status: string
  link: string
  amount?: number
  itemId?: string       // present for user-created meetings/reminders
  done?: boolean
}

const EVENT_CONFIG: Record<EventType, { icon: any; color: string; bg: string; label: string }> = {
  dispatch:   { icon: Truck,        color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',   label: 'Despacho' },
  production: { icon: Factory,      color: 'text-teal-700 dark:text-teal-400',   bg: 'bg-teal-100 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800',   label: 'Producción' },
  delivery:   { icon: Package,      color: 'text-green-700 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800', label: 'Entrega' },
  sale:       { icon: ShoppingCart,  color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800', label: 'Venta' },
  quotation:  { icon: FileText,     color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800', label: 'Cotización' },
  purchase:   { icon: Clock,        color: 'text-rose-700 dark:text-rose-400',   bg: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800',   label: 'Compra' },
  meeting:    { icon: Users,        color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800', label: 'Reunión' },
  reminder:   { icon: Bell,         color: 'text-fuchsia-700 dark:text-fuchsia-400', bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30 border-fuchsia-200 dark:border-fuchsia-800', label: 'Recordatorio' },
}

const ALL_TYPES: EventType[] = ['dispatch', 'production', 'delivery', 'sale', 'quotation', 'purchase', 'meeting', 'reminder']

const TYPE_DOT_COLOR: Record<EventType, string> = {
  dispatch: '#2563eb', production: '#0d9488', delivery: '#16a34a',
  sale: '#7c3aed', quotation: '#d97706', purchase: '#e11d48',
  meeting: '#4f46e5', reminder: '#c026d3',
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  // 0=Sunday — shift to Monday=0
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// ── Component ─────────────────────────────────────────────────────────────────
export default function CalendarPage() {
  const {
    saleOrders, productionOrders, dispatches, quotations, purchaseOrders,
    calendarItems, addCalendarItem, deleteCalendarItem, toggleCalendarItemDone,
    companySettings,
  } = useStore()

  const [showModal, setShowModal] = useState(false)

  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<EventType>>(new Set(ALL_TYPES))

  const todayISO = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

  // Navigate months
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelectedDay(null)
  }
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelectedDay(null)
  }
  const goToday = () => {
    setYear(today.getFullYear())
    setMonth(today.getMonth())
    setSelectedDay(todayISO)
  }

  // Toggle filter
  const toggleFilter = (type: EventType) => {
    setActiveFilters(prev => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  // ── Build events from all data sources ────────────────────────────────────
  const events = useMemo<CalendarEvent[]>(() => {
    const list: CalendarEvent[] = []

    // Dispatches — scheduled date
    for (const d of dispatches) {
      if (d.scheduledDate) {
        list.push({
          id: `dsp-${d.id}`, type: 'dispatch',
          title: `${d.dispatchNumber} → ${d.customer}`,
          subtitle: d.driver ? `Conductor: ${d.driver}` : undefined,
          date: d.scheduledDate.slice(0, 10), time: d.scheduledTime,
          status: d.status, link: '/dispatch', amount: d.total,
        })
      }
      // Delivered date
      if (d.deliveredAt) {
        list.push({
          id: `del-${d.id}`, type: 'delivery',
          title: `Entregado: ${d.dispatchNumber}`,
          subtitle: d.customer,
          date: d.deliveredAt.slice(0, 10),
          status: 'delivered', link: '/dispatch', amount: d.total,
        })
      }
    }

    // Production orders — planned start & end
    for (const p of productionOrders) {
      if (p.plannedStart) {
        list.push({
          id: `prod-s-${p.id}`, type: 'production',
          title: `${p.orderNumber}: ${p.product}`,
          subtitle: `${p.plannedQty} u — ${p.assignedTo || 'Sin asignar'}`,
          date: p.plannedStart.slice(0, 10),
          status: p.status, link: '/production',
        })
      }
    }

    // Sale orders — delivery date
    for (const s of saleOrders) {
      if (s.deliveryDate) {
        list.push({
          id: `sale-${s.id}`, type: 'sale',
          title: `${s.orderNumber} — ${s.customer}`,
          date: s.deliveryDate.slice(0, 10),
          status: s.status, link: '/sales', amount: s.total,
        })
      }
    }

    // Quotations — valid until (expiry)
    for (const q of quotations) {
      if (q.validUntil && (q.status === 'sent' || q.status === 'draft')) {
        list.push({
          id: `quot-${q.id}`, type: 'quotation',
          title: `${q.quoteNumber} vence`,
          subtitle: q.customer,
          date: q.validUntil.slice(0, 10),
          status: q.status, link: '/quotations', amount: q.total,
        })
      }
    }

    // Purchase orders — expected date
    for (const po of purchaseOrders) {
      if (po.expectedDate && (po.status === 'sent' || po.status === 'partial')) {
        list.push({
          id: `po-${po.id}`, type: 'purchase',
          title: `${po.orderNumber} — ${po.supplier}`,
          date: po.expectedDate.slice(0, 10),
          status: po.status, link: '/purchases', amount: po.total,
        })
      }
    }

    // User-created meetings & reminders
    for (const it of calendarItems) {
      list.push({
        id: `cal-${it.id}`,
        type: it.kind === 'meeting' ? 'meeting' : 'reminder',
        title: it.title,
        subtitle: it.description || it.location,
        date: it.date,
        time: it.time,
        status: it.done ? 'done' : 'pending',
        link: '/calendar',
        itemId: it.id,
        done: it.done,
      })
    }

    return list
  }, [dispatches, productionOrders, saleOrders, quotations, purchaseOrders, calendarItems])

  // Index events by date, respecting active filters
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {}
    for (const ev of events) {
      if (!activeFilters.has(ev.type)) continue
      if (!map[ev.date]) map[ev.date] = []
      map[ev.date].push(ev)
    }
    return map
  }, [events, activeFilters])

  // Selected day's events
  const selectedEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : []

  // Calendar grid
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay   = getFirstDayOfWeek(year, month)

  // Stats for month
  const monthEvents = useMemo(() => {
    const key = `${year}-${String(month + 1).padStart(2, '0')}`
    return events.filter(e => e.date.startsWith(key) && activeFilters.has(e.type))
  }, [events, year, month, activeFilters])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <CalendarDays size={24} /> Calendario
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-0.5">
            Despachos, producción, entregas, reuniones y recordatorios
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium shadow-sm">
          <Plus size={16} /> Agendar
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter size={14} className="text-slate-400" />
        {ALL_TYPES.map(type => {
          const cfg = EVENT_CONFIG[type]
          const active = activeFilters.has(type)
          return (
            <button key={type} onClick={() => toggleFilter(type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                active ? `${cfg.bg} ${cfg.color}` : 'bg-slate-100 dark:bg-gray-700 text-slate-400 dark:text-gray-500 border-slate-200 dark:border-gray-600 opacity-50'
              }`}>
              <cfg.icon size={12} /> {cfg.label}
              <span className="ml-1 font-bold">
                {events.filter(e => e.type === type && e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length}
              </span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar grid */}
        <div className="xl:col-span-3 card p-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronLeft size={18} className="text-slate-600 dark:text-gray-300" />
            </button>
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{MONTHS[month]} {year}</h2>
              <button onClick={goToday} className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-0.5">Hoy</button>
            </div>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
              <ChevronRight size={18} className="text-slate-600 dark:text-gray-300" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map(w => (
              <div key={w} className="text-center text-xs font-semibold text-slate-400 dark:text-gray-500 py-1">{w}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateISO = isoDate(year, month, day)
              const dayEvents = eventsByDate[dateISO] ?? []
              const isToday = dateISO === todayISO
              const isSelected = dateISO === selectedDay
              // Unique event types for dots
              const typesPresent = Array.from(new Set(dayEvents.map(e => e.type))) as EventType[]

              return (
                <button key={day} onClick={() => setSelectedDay(isSelected ? null : dateISO)}
                  className={`aspect-square rounded-lg flex flex-col items-center justify-center gap-0.5 text-sm transition-all relative
                    ${isToday ? 'ring-2 ring-blue-500' : ''}
                    ${isSelected ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 dark:hover:bg-gray-700'}
                    ${!isSelected && dayEvents.length > 0 ? 'font-semibold' : ''}
                    ${!isSelected ? 'text-slate-700 dark:text-gray-300' : ''}
                  `}>
                  <span className={`text-xs ${isSelected ? 'text-white font-bold' : isToday ? 'text-blue-600 dark:text-blue-400 font-bold' : ''}`}>
                    {day}
                  </span>
                  {typesPresent.length > 0 && (
                    <div className="flex gap-0.5">
                      {typesPresent.slice(0, 4).map(type => (
                        <div key={type} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : ''}`}
                          style={!isSelected ? { backgroundColor: TYPE_DOT_COLOR[type] } : undefined} />
                      ))}
                    </div>
                  )}
                  {dayEvents.length > 0 && (
                    <span className={`absolute top-0.5 right-1 text-[9px] font-bold ${isSelected ? 'text-white/80' : 'text-slate-400 dark:text-gray-500'}`}>
                      {dayEvents.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Right panel: day detail / month summary */}
        <div className="xl:col-span-1 space-y-4">
          {/* Month stats */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Resumen del mes</h3>
            <div className="space-y-2">
              {ALL_TYPES.filter(t => activeFilters.has(t)).map(type => {
                const cfg = EVENT_CONFIG[type]
                const count = monthEvents.filter(e => e.type === type).length
                if (count === 0) return null
                return (
                  <div key={type} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <cfg.icon size={12} className={cfg.color} />
                      <span className="text-slate-600 dark:text-gray-300">{cfg.label}</span>
                    </div>
                    <span className="font-bold text-slate-800 dark:text-white">{count}</span>
                  </div>
                )
              })}
              <div className="border-t border-slate-100 dark:border-gray-700 pt-2 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600 dark:text-gray-300">Total eventos</span>
                <span className="text-slate-800 dark:text-white">{monthEvents.length}</span>
              </div>
            </div>
          </div>

          {/* Selected day events */}
          {selectedDay && (
            <div className="card p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white">
                  {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h3>
                {selectedEvents.length > 0 && companySettings.whatsapp && (() => {
                  const phone = companySettings.whatsapp.replace(/\D/g, '')
                  const summary = selectedEvents
                    .map((e) => `• ${e.time ? e.time + ' ' : ''}${e.title}`)
                    .join('\n')
                  const text = `Agenda ${selectedDay}:\n${summary}`
                  return (
                    <a
                      href={`https://wa.me/${phone}?text=${encodeURIComponent(text)}`}
                      target="_blank" rel="noreferrer"
                      title="Enviar agenda del día por WhatsApp"
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-600 hover:bg-green-700 text-white text-[10px] font-semibold">
                      <MessageCircle size={11} /> WhatsApp
                    </a>
                  )
                })()}
              </div>
              {selectedEvents.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-2">Sin eventos programados</p>
              ) : (
                <div className="space-y-2 mt-3">
                  {selectedEvents.map(ev => {
                    const cfg = EVENT_CONFIG[ev.type]
                    const inner = (
                      <div className="flex items-start gap-2">
                        <cfg.icon size={14} className={`${cfg.color} mt-0.5 flex-shrink-0`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold ${cfg.color} truncate ${ev.done ? 'line-through opacity-60' : ''}`}>{ev.title}</p>
                          {ev.subtitle && <p className="text-xs text-slate-500 dark:text-gray-400 truncate">{ev.subtitle}</p>}
                          <div className="flex items-center justify-between mt-1">
                            {ev.time && <span className="text-[10px] text-slate-500 dark:text-gray-400">{ev.time}</span>}
                            {ev.amount != null && <span className="text-[10px] font-semibold text-slate-600 dark:text-gray-300">{formatCOP(ev.amount)}</span>}
                          </div>
                        </div>
                        {ev.itemId && (
                          <div className="flex flex-col gap-1 flex-shrink-0">
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCalendarItemDone(ev.itemId!) }}
                              title={ev.done ? 'Reabrir' : 'Marcar como hecho'}
                              className="p-1 rounded hover:bg-white/40 dark:hover:bg-black/20">
                              <Check size={12} className={cfg.color} />
                            </button>
                            <button
                              onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteCalendarItem(ev.itemId!) }}
                              title="Eliminar"
                              className="p-1 rounded hover:bg-white/40 dark:hover:bg-black/20">
                              <Trash2 size={12} className="text-rose-600" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                    return ev.itemId ? (
                      <div key={ev.id} className={`block border rounded-lg p-3 ${cfg.bg}`}>{inner}</div>
                    ) : (
                      <Link key={ev.id} to={ev.link}
                        className={`block border rounded-lg p-3 ${cfg.bg} hover:opacity-80 transition-opacity`}>
                        {inner}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Upcoming events (next 7 days) */}
          {!selectedDay && (() => {
            const upcoming: CalendarEvent[] = []
            for (let i = 0; i < 7; i++) {
              const d = new Date(today)
              d.setDate(d.getDate() + i)
              const key = isoDate(d.getFullYear(), d.getMonth(), d.getDate())
              const dayEvts = eventsByDate[key] ?? []
              upcoming.push(...dayEvts)
            }
            if (upcoming.length === 0) return null
            return (
              <div className="card p-4">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">Próximos 7 días</h3>
                <div className="space-y-2">
                  {upcoming.slice(0, 10).map(ev => {
                    const cfg = EVENT_CONFIG[ev.type]
                    return (
                      <Link key={ev.id} to={ev.link}
                        className="flex items-center gap-2 text-xs hover:bg-slate-50 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors">
                        <cfg.icon size={12} className={cfg.color} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-700 dark:text-gray-300 truncate">{ev.title}</p>
                          <p className="text-slate-400 dark:text-gray-500">{ev.date.slice(5)} {ev.time ? `• ${ev.time}` : ''}</p>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </div>

      {showModal && (
        <NewItemModal
          defaultDate={selectedDay || todayISO}
          defaultPhone={companySettings.whatsapp || ''}
          onClose={() => setShowModal(false)}
          onSave={(item) => { addCalendarItem(item); setShowModal(false) }}
        />
      )}
    </div>
  )
}

// ── New meeting / reminder modal ─────────────────────────────────────────────
function NewItemModal({
  defaultDate, defaultPhone, onClose, onSave,
}: {
  defaultDate: string
  defaultPhone: string
  onClose: () => void
  onSave: (item: Omit<CalendarItem, 'id' | 'notifiedAt'>) => void
}) {
  const [kind, setKind]               = useState<CalendarItemKind>('meeting')
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation]       = useState('')
  const [date, setDate]               = useState(defaultDate)
  const [time, setTime]               = useState('09:00')
  const [reminderMinutes, setReminderMinutes] = useState(15)
  const [notifyApp, setNotifyApp]     = useState(true)
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false)
  const [whatsappPhone, setWhatsappPhone]   = useState(defaultPhone)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !date) return
    onSave({
      kind,
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      date,
      time: time || undefined,
      reminderMinutes,
      notifyApp,
      notifyWhatsapp,
      whatsappPhone: notifyWhatsapp ? whatsappPhone.replace(/\D/g, '') : undefined,
      done: false,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Nuevo en el calendario</h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-gray-700">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setKind('meeting')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium ${
              kind === 'meeting'
                ? 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 text-indigo-700 dark:text-indigo-300'
                : 'border-slate-200 dark:border-gray-600 text-slate-500 dark:text-gray-400'
            }`}>
            <Users size={14} /> Reunión
          </button>
          <button type="button" onClick={() => setKind('reminder')}
            className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border text-sm font-medium ${
              kind === 'reminder'
                ? 'bg-fuchsia-100 dark:bg-fuchsia-900/30 border-fuchsia-300 text-fuchsia-700 dark:text-fuchsia-300'
                : 'border-slate-200 dark:border-gray-600 text-slate-500 dark:text-gray-400'
            }`}>
            <Bell size={14} /> Recordatorio
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Título *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder={kind === 'meeting' ? 'Reunión con cliente' : 'Llamar al proveedor'}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-slate-800 dark:text-white" />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-slate-800 dark:text-white" />
        </div>

        {kind === 'meeting' && (
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Lugar</label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Oficina, Zoom, etc."
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-slate-800 dark:text-white" />
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Fecha *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-slate-800 dark:text-white" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Hora</label>
            <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-slate-800 dark:text-white" />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 dark:text-gray-300">Avisarme</label>
          <select
            value={reminderMinutes}
            onChange={(e) => setReminderMinutes(Number(e.target.value))}
            className="w-full mt-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-slate-800 dark:text-white">
            <option value={0}>En el momento</option>
            <option value={5}>5 minutos antes</option>
            <option value={15}>15 minutos antes</option>
            <option value={30}>30 minutos antes</option>
            <option value={60}>1 hora antes</option>
            <option value={1440}>1 día antes</option>
          </select>
        </div>

        <div className="space-y-2 pt-1">
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
            <input type="checkbox" checked={notifyApp} onChange={(e) => setNotifyApp(e.target.checked)} />
            Notificación en la APP
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-200">
            <input type="checkbox" checked={notifyWhatsapp} onChange={(e) => setNotifyWhatsapp(e.target.checked)} />
            Enviar por WhatsApp
          </label>
          {notifyWhatsapp && (
            <input
              type="tel"
              value={whatsappPhone}
              onChange={(e) => setWhatsappPhone(e.target.value)}
              placeholder="573001234567 (con código de país)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-slate-800 dark:text-white" />
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose}
            className="px-3 py-2 rounded-lg text-sm text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700">
            Cancelar
          </button>
          <button type="submit"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold">
            Guardar
          </button>
        </div>
      </form>
    </div>
  )
}
