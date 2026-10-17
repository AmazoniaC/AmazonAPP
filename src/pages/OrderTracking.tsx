import { useState, useEffect } from 'react'
import { Search, CheckCircle2, XCircle, MessageCircle, ArrowLeft } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Settings {
  companyName: string
  whatsapp: string
  phone: string
  logo: string | null
}

interface TrackedItem {
  product: string
  qty: number
  price: number
  subtotal: number
}

interface OrderResult {
  quoteNumber: string
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired'
  date: string
  validUntil: string
  items: TrackedItem[]
  total: number
  saleOrderStatus: string | null
  saleOrderDeliveryDate: string | null
}

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

// ─── Timeline ────────────────────────────────────────────────────────────────
// Two independent status machines feed one customer-facing timeline: the
// Quotation's own status (draft/sent/accepted/rejected/expired), and — once
// staff converts it — the linked SaleOrder's status (pending/confirmed/
// processing/delivered/cancelled). Neither is invented here; both are the
// real statuses already set from the ERP's Cotizaciones/Ventas screens.
function buildTimeline(order: OrderResult) {
  if (order.status === 'rejected') {
    return {
      negative: true as const,
      label: 'Cotización no aprobada',
      detail: 'Esta cotización no fue aprobada. Si tienes dudas o quieres ajustar algo, escríbenos.',
    }
  }
  if (order.saleOrderStatus === 'cancelled') {
    return {
      negative: true as const,
      label: 'Pedido cancelado',
      detail: 'Este pedido fue cancelado. Si tienes dudas, escríbenos.',
    }
  }

  const steps = [
    { key: 'received',   label: 'Pedido recibido' },
    { key: 'review',     label: 'En revisión' },
    { key: 'accepted',   label: 'Aceptado' },
    { key: 'production', label: 'En preparación' },
    { key: 'delivered',  label: 'Entregado' },
  ]

  let idx = 0
  if (order.status === 'sent') idx = 1
  if (order.status === 'accepted') idx = 2
  if (order.saleOrderStatus === 'confirmed') idx = 2
  if (order.saleOrderStatus === 'processing') idx = 3
  if (order.saleOrderStatus === 'delivered') idx = 4

  return {
    negative: false as const,
    steps: steps.map((s, i) => ({ ...s, done: i <= idx, current: i === idx })),
  }
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function OrderTracking() {
  const [co, setCo] = useState<Settings | null>(null)
  const [quoteNumber, setQuoteNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<OrderResult | null>(null)

  useEffect(() => {
    fetch('/api/public/settings').then(r => r.json()).then(setCo).catch(() => {})
  }, [])

  const handleSearch = async () => {
    if (!quoteNumber.trim() || !phone.trim()) {
      setError('Escribe el número de cotización y tu teléfono')
      return
    }
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await fetch('/api/public/order-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteNumber: quoteNumber.trim(), phone: phone.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo consultar el pedido')
      setResult(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo consultar el pedido')
    } finally {
      setLoading(false)
    }
  }

  const waNumber = (co?.whatsapp || co?.phone || '').replace(/\D/g, '')
  const waLink = waNumber ? `https://wa.me/${waNumber}` : null

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#1B4332] text-white py-8 px-4 text-center">
        <h1 className="text-xl font-bold">{co?.companyName || 'Rastrea tu pedido'}</h1>
        <p className="text-emerald-200 text-sm mt-1">Consulta el estado de tu pedido</p>
      </header>

      <main className="max-w-md mx-auto px-4 py-8">
        <a href="/catalogo" className="text-sm text-emerald-700 hover:text-emerald-800 font-medium mb-6 flex items-center gap-1 w-fit">
          <ArrowLeft size={14} /> Volver al catálogo
        </a>

        {!result && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Número de cotización</label>
              <input
                value={quoteNumber}
                onChange={(e) => setQuoteNumber(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Ej: COT-2026-004"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">Teléfono con el que pediste</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="300 123 4567"
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button
              onClick={handleSearch}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              <Search size={15} /> {loading ? 'Buscando...' : 'Buscar pedido'}
            </button>
          </div>
        )}

        {result && (() => {
          const timeline = buildTimeline(result)
          return (
            <div className="space-y-4 animate-fadeIn">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-xs text-slate-400">Pedido</p>
                    <p className="font-mono font-bold text-slate-800">{result.quoteNumber}</p>
                  </div>
                  <p className="text-xs text-slate-400">{result.date}</p>
                </div>

                {timeline.negative ? (
                  <div className="flex items-start gap-3 bg-red-50 rounded-xl p-3">
                    <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">{timeline.label}</p>
                      <p className="text-xs text-red-600 mt-0.5">{timeline.detail}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {timeline.steps.map((s, i) => (
                      <div key={s.key} className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          s.done ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-300'
                        }`}>
                          {s.done ? <CheckCircle2 size={14} /> : <span className="text-[10px] font-bold">{i + 1}</span>}
                        </div>
                        <span className={`text-sm ${
                          s.current ? 'font-bold text-emerald-700' : s.done ? 'text-slate-600' : 'text-slate-400'
                        }`}>
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                <p className="text-xs font-semibold text-slate-500 mb-2">Detalle</p>
                <div className="space-y-1.5">
                  {result.items.map((it, i) => (
                    <div key={i} className="flex justify-between text-sm text-slate-600">
                      <span>{it.product} × {it.qty}</span>
                      <span>{formatCOP(it.subtotal)}</span>
                    </div>
                  ))}
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-800 pt-2 mt-2 border-t border-slate-100">
                  <span>Total</span>
                  <span>{formatCOP(result.total)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { setResult(null); setQuoteNumber(''); setPhone('') }}
                  className="flex-1 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl py-2.5 hover:bg-slate-50 transition-colors"
                >
                  Buscar otro pedido
                </button>
                {waLink && (
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-xl py-2.5 transition-colors"
                  >
                    <MessageCircle size={14} /> Escribirnos
                  </a>
                )}
              </div>
            </div>
          )
        })()}
      </main>
    </div>
  )
}
