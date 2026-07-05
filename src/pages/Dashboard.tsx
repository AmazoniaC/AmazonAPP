import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import {
  TrendingUp, TrendingDown, Package, Factory,
  AlertTriangle, ShoppingCart, DollarSign, Users, Clock, RefreshCw,
  Target, Wallet, ArrowUpRight, ArrowDownRight, Edit2, Check, MessageCircle, Send, Truck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useStore } from '../store/useStore'
import { formatCOP } from '../utils/currency'
import { openWhatsApp, buildBulkPaymentReminder, buildPaymentReminder, getBankInfo } from '../utils/whatsapp'
import { useEffect, useState, useMemo } from 'react'

const AUTO_REFRESH_MIN = 5

const PIE_COLORS = ['#2563eb', '#0f766e', '#f59e0b', '#dc2626', '#7c3aed', '#0891b2', '#65a30d']

function KPICard({
  icon: Icon, label, value, sub, trend, color, accent,
}: {
  icon: any; label: string; value: string; sub: string
  trend?: 'up' | 'down'; color: string; accent?: string
}) {
  return (
    <div className="kpi-card group" style={accent ? { '--accent': accent } as React.CSSProperties : undefined}>
      {/* Background accent blob */}
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity duration-500"
           style={accent ? { background: accent } : undefined} />
      <div className="relative flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-slate-500 dark:text-gray-400 font-bold uppercase tracking-widest">{label}</p>
          <p className="stat-value mt-2 animate-countUp">{value}</p>
          <div className="flex items-center gap-1.5 mt-2">
            {trend === 'up'   && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                <ArrowUpRight size={11} />
              </span>
            )}
            {trend === 'down' && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                <ArrowDownRight size={11} />
              </span>
            )}
            <span className={`text-[11px] font-medium ${
              trend === 'up' ? 'text-emerald-600 dark:text-emerald-400' : trend === 'down' ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-gray-400'
            }`}>{sub}</span>
          </div>
        </div>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${color} group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}
          style={accent ? { boxShadow: `0 8px 20px -4px ${accent}`, background: `linear-gradient(135deg, ${accent} 0%, ${accent}dd 100%)` } : undefined}>
          <Icon size={20} className="text-white" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    delivered: 'badge-green', paid: 'badge-green',
    processing: 'badge-blue', partial: 'badge-yellow',
    confirmed: 'badge-blue', pending: 'badge-yellow',
    in_progress: 'badge-blue', finished: 'badge-green',
    cancelled: 'badge-red',
  }
  const labels: Record<string, string> = {
    delivered:'Entregado', paid:'Pagado', processing:'En proceso',
    partial:'Parcial', confirmed:'Confirmado', pending:'Pendiente',
    in_progress:'En producción', finished:'Finalizado', cancelled:'Cancelado',
  }
  return <span className={`badge ${map[status] ?? 'badge-gray'}`}>{labels[status] ?? status}</span>
}

export default function Dashboard() {
  const { supplies, saleOrders, productionOrders, products, expenses, purchaseOrders, customers, companySettings, dispatches, darkMode, loadAllData, user, saveCompanySettings, payments } = useStore()
  const role = user?.role ?? 'Administrador'
  const isAdmin = role === 'Administrador'
  const showSales = isAdmin || role === 'Ventas' || role === 'Contabilidad'
  const showProduction = isAdmin || role === 'Producción'
  const showInventory = isAdmin || role === 'Inventario' || role === 'Producción'
  const showFinance = isAdmin || role === 'Contabilidad'
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing]   = useState(false)

  // ── Sales Goal ──────────────────────────────────────────────────────────
  const monthlyGoal = companySettings.monthlyGoal ?? 0
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalInput, setGoalInput]     = useState('')

  const currentMonthSales = useMemo(() => {
    const now = new Date()
    const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return saleOrders.filter(o => o.date?.startsWith(key)).reduce((a, o) => a + o.total, 0)
  }, [saleOrders])

  const goalPct = monthlyGoal > 0 ? Math.min((currentMonthSales / monthlyGoal) * 100, 100) : 0
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const dayOfMonth  = new Date().getDate()
  const expectedPct = (dayOfMonth / daysInMonth) * 100
  const onTrack = goalPct >= expectedPct

  // ── Cash Flow Forecast ────────────────────────────────────────────────
  const cashFlow = useMemo(() => {
    const pendingReceivables = saleOrders
      .filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'partial')
      .reduce((a, o) => a + o.total, 0)
    const pendingPayables = purchaseOrders
      .filter(o => o.status === 'sent' || o.status === 'partial' || o.status === 'draft')
      .reduce((a, o) => a + o.total, 0)
    const monthlyExpenses = (() => {
      const now = new Date()
      const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      return expenses.filter(e => e.date?.startsWith(key)).reduce((a, e) => a + e.amount, 0)
    })()
    const recurringMonthly = expenses
      .filter(e => e.recurring && e.period === 'monthly')
      .reduce((a, e) => a + e.amount, 0)
    const netProjected = pendingReceivables - pendingPayables - recurringMonthly
    return { pendingReceivables, pendingPayables, monthlyExpenses, recurringMonthly, netProjected }
  }, [saleOrders, purchaseOrders, expenses])

  const refresh = async () => {
    setRefreshing(true)
    await loadAllData(true)
    setLastRefresh(new Date())
    setRefreshing(false)
  }

  // Auto-refresh every AUTO_REFRESH_MIN minutes
  useEffect(() => {
    const id = setInterval(refresh, AUTO_REFRESH_MIN * 60 * 1000)
    return () => clearInterval(id)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const lowStock    = supplies.filter((s) => s.stock < s.minStock)
  const pendingOrds = saleOrders.filter((o) => o.status === 'pending' || o.status === 'processing')
  const inProd      = productionOrders.filter((o) => o.status === 'in_progress')
  const totalSales  = saleOrders.reduce((a, o) => a + o.total, 0)
  const recentSales = [...saleOrders].reverse().slice(0, 5)

  const gridColor = darkMode ? '#374151' : '#f1f5f9'
  const tickColor = darkMode ? '#9ca3af' : '#94a3b8'

  // ── Sales chart: group orders by date over last 30 days ──────────────────
  const salesChartData = (() => {
    const days: { day: string; ventas: number }[] = []
    const now = new Date()
    const salesByDay: Record<string, number> = {}
    saleOrders.forEach((o) => {
      const d = o.date?.slice(0, 10) ?? ''
      if (d) salesByDay[d] = (salesByDay[d] ?? 0) + o.total
    })
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
      days.push({ day: label, ventas: salesByDay[key] ?? 0 })
    }
    return days
  })()

  // ── Top products: sum units sold per product name ────────────────────────
  const topProductsData = (() => {
    const qty: Record<string, number> = {}
    saleOrders.forEach((o) =>
      (o.items ?? []).forEach((item: any) => {
        const name = item.product ?? item.productName ?? ''
        if (name) qty[name] = (qty[name] ?? 0) + (item.qty ?? item.quantity ?? 0)
      })
    )
    return Object.entries(qty)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, ventas]) => ({ name, ventas }))
  })()

  // ── Revenue by category: join items → products → category ───────────────
  const revenueByCategory = (() => {
    const rev: Record<string, number> = {}
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]))
    saleOrders.forEach((o) =>
      (o.items ?? []).forEach((item: any) => {
        const prod = productMap[item.productId]
        const cat = prod?.category ?? 'Otros'
        rev[cat] = (rev[cat] ?? 0) + (item.subtotal ?? 0)
      })
    )
    const total = Object.values(rev).reduce((a, v) => a + v, 0)
    if (total === 0) return []
    return Object.entries(rev)
      .sort((a, b) => b[1] - a[1])
      .map(([name, v]) => ({ name, value: Math.round(v / total * 100) }))
  })()

  const customTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-lg p-3 shadow-lg text-xs">
          <p className="font-semibold text-slate-700 dark:text-gray-200 mb-1">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} style={{ color: p.color }}>
              Ventas: ${p.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-5">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl p-6 border border-slate-200/60 dark:border-gray-700/60"
           style={{
             background: 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.85) 100%)',
           }}>
        {/* Animated background gradient */}
        <div className="absolute inset-0 opacity-50 pointer-events-none">
          <div className="absolute -top-20 -right-10 w-80 h-80 rounded-full blur-3xl"
               style={{ background: 'radial-gradient(circle, rgba(82, 125, 54, 0.18) 0%, transparent 70%)' }} />
          <div className="absolute -bottom-20 left-1/4 w-72 h-72 rounded-full blur-3xl"
               style={{ background: 'radial-gradient(circle, rgba(168, 112, 80, 0.10) 0%, transparent 70%)' }} />
        </div>
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-amazonia-600 dark:text-amazonia-400 uppercase tracking-widest mb-1">
              <span className="relative inline-block w-2 h-2 rounded-full bg-emerald-500 dot-pulse" />
              <span>{new Date().toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })}</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {user?.name ? <>Hola, <span className="gradient-text">{user.name.split(' ')[0]}</span></> : 'Panel de Control'}
            </h1>
            <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">
              {isAdmin ? 'Vista general de tu negocio en tiempo real' : `Panel de ${role}`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl glass border border-emerald-200/50 dark:border-emerald-700/40">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                {lastRefresh.toLocaleTimeString('es-CO', { hour:'2-digit', minute:'2-digit' })}
              </span>
            </div>
            <button onClick={refresh} disabled={refreshing}
              className="btn btn-sm btn-secondary">
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Actualizando' : 'Actualizar'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── "Desde ayer" — morning digest ─── */}
      {(() => {
        const todayISO = new Date().toISOString().split('T')[0]
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
        const yISO = yesterday.toISOString().split('T')[0]

        // Orders created today (net new)
        const newOrders = saleOrders.filter((o) => o.date === todayISO && o.status !== 'cancelled')
        const newOrdersValue = newOrders.reduce((s, o) => s + o.total, 0)

        // Cash collected today
        const paidToday = payments.filter((p) => p.date === todayISO).reduce((s, p) => s + p.amount, 0)

        // Orders that crossed +30 days overdue today
        const overdueCrossedToday = saleOrders.filter((o) => {
          if (o.paymentStatus === 'paid' || o.status === 'cancelled') return false
          const dayDiff = Math.floor((Date.now() - new Date(o.date + 'T12:00:00').getTime()) / 86400000)
          return dayDiff === 30 || dayDiff === 31
        }).length

        // Supplies that crossed below minimum since yesterday (approximation:
        // items below minimum today — we don't have yesterday's stock, so this
        // just shows all currently below-min items with a "hoy" tag)
        const belowMin = supplies.filter((s) => s.stock < s.minStock).length

        // Dispatches scheduled for today
        const dispatchesToday = dispatches.filter((d) =>
          d.scheduledDate === todayISO && (d.status === 'scheduled' || d.status === 'in_transit')
        ).length

        // Nothing to show? Hide the strip.
        const nothing = newOrders.length === 0 && paidToday === 0 && overdueCrossedToday === 0 && belowMin === 0 && dispatchesToday === 0
        if (nothing) return null

        const tiles = [
          {
            label: 'Órdenes nuevas',
            value: String(newOrders.length),
            sub: newOrders.length > 0 ? formatCOP(newOrdersValue) : 'ninguna hoy',
            icon: ShoppingCart,
            color: '#2563eb',
            highlight: newOrders.length > 0,
          },
          {
            label: 'Plata cobrada',
            value: formatCOP(paidToday),
            sub: paidToday > 0 ? 'depositada hoy' : 'sin pagos',
            icon: DollarSign,
            color: '#10b981',
            highlight: paidToday > 0,
          },
          {
            label: 'Cruzaron +30 días',
            value: String(overdueCrossedToday),
            sub: overdueCrossedToday > 0 ? 'requieren gestión' : 'sin nuevos',
            icon: Clock,
            color: '#ef4444',
            highlight: overdueCrossedToday > 0,
          },
          {
            label: 'Despachos hoy',
            value: String(dispatchesToday),
            sub: dispatchesToday > 0 ? 'programados / en ruta' : 'sin salidas',
            icon: Truck,
            color: '#8b5cf6',
            highlight: dispatchesToday > 0,
          },
          {
            label: 'Bajo mínimo',
            value: String(belowMin),
            sub: belowMin > 0 ? 'insumos a reponer' : 'inventario ok',
            icon: AlertTriangle,
            color: '#f59e0b',
            highlight: belowMin > 0,
          },
        ]

        return (
          <div className="relative overflow-hidden rounded-2xl border border-slate-200/70 dark:border-gray-700/60"
               style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(248,250,252,0.7) 100%)' }}>
            <div className="absolute -top-6 -right-6 w-40 h-40 rounded-full blur-3xl pointer-events-none"
                 style={{ background: 'radial-gradient(circle, rgba(82,125,54,0.14) 0%, transparent 70%)' }} />
            <div className="relative px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ background: 'linear-gradient(135deg, #527d36 0%, #2d4a1e 100%)', boxShadow: '0 4px 12px -2px rgba(82,125,54,0.35)' }}>
                <Clock size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-amazonia-700 dark:text-amazonia-400 uppercase tracking-widest">Desde ayer</p>
                <p className="text-xs text-slate-500 dark:text-gray-400">Un vistazo rápido a lo que pasó y lo que hay que atender hoy.</p>
              </div>
            </div>
            <div className="relative grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-px bg-slate-200/60 dark:bg-gray-700/50 border-t border-slate-200/60 dark:border-gray-700/60">
              {tiles.map((t) => (
                <div key={t.label} className="bg-white/70 dark:bg-gray-800/70 px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-md flex items-center justify-center"
                         style={{ background: t.highlight ? t.color + '22' : 'rgba(148,163,184,0.15)' }}>
                      <t.icon size={12} style={{ color: t.highlight ? t.color : '#94a3b8' }} strokeWidth={2.4} />
                    </div>
                    <p className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wide">{t.label}</p>
                  </div>
                  <p className={`text-lg font-bold tabular-nums leading-tight ${t.highlight ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-gray-500'}`}
                     style={t.highlight ? { color: t.color } : undefined}>
                    {t.value}
                  </p>
                  <p className="text-[10px] text-slate-500 dark:text-gray-400 truncate mt-0.5">{t.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })()}

      {/* Low stock alert */}
      {lowStock.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl px-4 py-3 flex items-center gap-3 border border-amber-200/70 dark:border-amber-800/60"
             style={{ background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.6) 0%, rgba(254, 215, 170, 0.4) 100%)' }}>
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            <strong>{lowStock.length} insumos</strong> están por debajo del stock mínimo:{' '}
            {lowStock.map((s) => s.name).join(', ')}.
          </p>
        </div>
      )}

      {/* KPI Cards — role-specific */}
      {(() => {
        const pendingPayTotal = saleOrders.filter(o => o.paymentStatus === 'pending' || o.paymentStatus === 'partial').reduce((a,o)=>a+o.total,0)
        const scheduledDispatches = dispatches.filter(d => d.status === 'scheduled' || d.status === 'in_transit').length
        const cards: React.ReactNode[] = []
        if (showSales)      cards.push(<KPICard key="sales" icon={DollarSign}  label="Ventas totales"        value={formatCOP(totalSales)} sub={`${saleOrders.length} órdenes registradas`} color="bg-blue-600" accent="rgba(37,99,235,0.35)" />)
        if (showSales || showFinance) cards.push(<KPICard key="receivable" icon={Clock}       label="Por cobrar"             value={formatCOP(pendingPayTotal)} sub="Pagos pendientes" trend={pendingPayTotal>0?'down':undefined} color="bg-rose-500" accent="rgba(244,63,94,0.35)" />)
        if (showInventory)  cards.push(<KPICard key="stock" icon={Package}     label="Alertas de inventario"  value={`${lowStock.length}`}  sub="Insumos bajo mínimo"   trend={lowStock.length>0?'down':undefined} color="bg-amber-500" accent="rgba(245,158,11,0.35)" />)
        if (showProduction) cards.push(<KPICard key="prod" icon={Factory}      label="En producción"          value={`${inProd.length}`}    sub={`${productionOrders.filter(o=>o.status==='pending').length} órdenes pendientes`} color="bg-teal-600" accent="rgba(13,148,136,0.35)" />)
        if (showSales)      cards.push(<KPICard key="dispatch" icon={Users}    label="Despachos activos"      value={`${scheduledDispatches}`} sub="Programados / en tránsito" color="bg-violet-600" accent="rgba(124,58,237,0.35)" />)
        return (
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${cards.length >= 4 ? 'xl:grid-cols-4' : cards.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-2'} gap-4 stagger-children`}>
            {cards}
          </div>
        )
      })()}

      {/* Sales Goal Tracker — Ventas / Admin */}
      {showSales && <div className="card p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-800 dark:text-white">Meta de ventas del mes</h2>
          </div>
          {!editingGoal ? (
            <button onClick={() => { setGoalInput(String(monthlyGoal || '')); setEditingGoal(true) }}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
              <Edit2 size={12} /> {monthlyGoal > 0 ? 'Editar meta' : 'Definir meta'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <input type="number" className="input text-xs py-1 w-40" placeholder="Meta mensual ($)"
                value={goalInput} onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { const v = parseFloat(goalInput) || 0; saveCompanySettings({ ...companySettings, monthlyGoal: v }); setEditingGoal(false) }}} />
              <button onClick={() => { const v = parseFloat(goalInput) || 0; saveCompanySettings({ ...companySettings, monthlyGoal: v }); setEditingGoal(false) }}
                className="p-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700"><Check size={14} /></button>
            </div>
          )}
        </div>
        {monthlyGoal > 0 ? (
          <div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{formatCOP(currentMonthSales)}</p>
                <p className="text-xs text-slate-500 dark:text-gray-400">de {formatCOP(monthlyGoal)} meta</p>
              </div>
              <div className="text-right">
                <p className={`text-lg font-bold ${onTrack ? 'text-emerald-600' : 'text-amber-600'}`}>{goalPct.toFixed(1)}%</p>
                <div className="flex items-center gap-1 text-xs">
                  {onTrack ? <ArrowUpRight size={12} className="text-emerald-500" /> : <ArrowDownRight size={12} className="text-amber-500" />}
                  <span className={onTrack ? 'text-emerald-600' : 'text-amber-600'}>
                    {onTrack ? 'En camino' : `${(expectedPct - goalPct).toFixed(0)}% bajo ritmo`}
                  </span>
                </div>
              </div>
            </div>
            <div className="progress-bar relative !h-3">
              <div className={`progress-bar-fill ${onTrack ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : 'bg-gradient-to-r from-amber-400 to-amber-600'}`}
                style={{ width: `${goalPct}%` }} />
              <div className="absolute top-0 h-full w-0.5 bg-slate-400 dark:bg-gray-500"
                style={{ left: `${expectedPct}%` }}
                title={`Día ${dayOfMonth}/${daysInMonth} — deberías estar al ${expectedPct.toFixed(0)}%`} />
            </div>
            <div className="flex justify-between text-xs text-slate-400 dark:text-gray-500 mt-1">
              <span>Día {dayOfMonth} de {daysInMonth}</span>
              <span>Faltan {formatCOP(Math.max(0, monthlyGoal - currentMonthSales))}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-gray-500">Define una meta mensual para visualizar tu progreso y mantener el ritmo de ventas.</p>
        )}
      </div>}

      {/* Charts row — Ventas / Admin */}
      {showSales && <>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Sales line chart */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Ventas — Últimos 30 días</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">Comparado con meta diaria</p>
            </div>
            {saleOrders.length === 0 && <span className="text-xs text-slate-400 dark:text-gray-500">Sin ventas aún</span>}
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="day" tick={{ fontSize:11, fill:tickColor }} tickLine={false} axisLine={false} interval={4} />
              <YAxis tick={{ fontSize:11, fill:tickColor }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
              <Tooltip content={customTooltip} />
              <Line type="monotone" dataKey="ventas" stroke="#2563eb" strokeWidth={2.5} dot={false} name="Ventas" activeDot={{ r:5, fill:'#2563eb' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by category donut */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-1">Ingresos por categoría</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">Distribución del mes</p>
          {revenueByCategory.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-gray-600 text-sm gap-2">
              <ShoppingCart size={32} className="opacity-30" />
              <span>Sin ventas registradas</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={revenueByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                       dataKey="value" paddingAngle={3}>
                    {revenueByCategory.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v}%`, 'Participación']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {revenueByCategory.map((d, i) => (
                  <div key={d.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                      <span className="text-slate-600 dark:text-gray-300">{d.name}</span>
                    </div>
                    <span className="font-semibold text-slate-700 dark:text-gray-200">{d.value}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top products */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-1">Productos más vendidos</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">Unidades este mes</p>
          {topProductsData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-gray-600 text-sm gap-2">
              <Package size={32} className="opacity-30" />
              <span>Sin ventas registradas</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(topProductsData.length * 44, 120)}>
              <BarChart data={topProductsData} layout="vertical" barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                <XAxis type="number" tick={{ fontSize:11, fill:tickColor }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:tickColor }} tickLine={false}
                       axisLine={false} width={120} />
                <Tooltip formatter={(v) => [`${v} u`, 'Vendidas']} />
                <Bar dataKey="ventas" fill="#2563eb" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent sales */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">Últimas ventas</h2>
            <Link to="/sales" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver todas →</Link>
          </div>
          <div className="space-y-0">
            <div className="grid grid-cols-4 text-xs text-slate-400 dark:text-gray-500 font-medium pb-2 border-b border-slate-100 dark:border-gray-700">
              <span>Orden</span><span>Cliente</span><span className="text-right">Total</span><span className="text-right">Estado</span>
            </div>
            {recentSales.map((o) => (
              <div key={o.id} className="grid grid-cols-4 items-center py-3 border-b border-slate-50 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/50 rounded-lg px-1 transition-colors">
                <span className="text-xs font-mono text-blue-600 dark:text-blue-400">{o.orderNumber}</span>
                <span className="text-xs text-slate-700 dark:text-gray-300 truncate pr-2">{o.customer}</span>
                <span className="text-xs font-semibold text-slate-800 dark:text-white text-right">{formatCOP(o.total)}</span>
                <div className="flex justify-end"><StatusBadge status={o.paymentStatus} /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
      </>}

      {/* Accounts receivable aging — Ventas / Contabilidad / Admin */}
      {(showSales || showFinance) && (() => {
        const today = new Date()
        const unpaid = saleOrders.filter((o) => o.paymentStatus === 'pending' || o.paymentStatus === 'partial')
        if (unpaid.length === 0) return null
        const buckets = [
          { label: '0–7 días',   cls: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400', orders: [] as typeof saleOrders },
          { label: '8–30 días',  cls: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400', orders: [] as typeof saleOrders },
          { label: '+30 días',   cls: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400', orders: [] as typeof saleOrders },
        ]
        for (const o of unpaid) {
          const diffDays = Math.floor((today.getTime() - new Date(o.date + 'T12:00:00').getTime()) / 86400000)
          if (diffDays <= 7) buckets[0].orders.push(o)
          else if (diffDays <= 30) buckets[1].orders.push(o)
          else buckets[2].orders.push(o)
        }

        // Group unpaid orders by customer for bulk reminders
        const byCustomer: Record<string, { customer: typeof customers[0]; orders: typeof saleOrders }> = {}
        for (const o of unpaid) {
          const cust = customers.find(c => c.id === o.customerId)
          if (!cust?.phone) continue
          if (!byCustomer[cust.id]) byCustomer[cust.id] = { customer: cust, orders: [] }
          byCustomer[cust.id].orders.push(o)
        }
        const customersWithDebt = Object.values(byCustomer).sort(
          (a, b) => b.orders.reduce((s, o) => s + o.total, 0) - a.orders.reduce((s, o) => s + o.total, 0)
        )
        const bankInfo = getBankInfo(companySettings)

        return (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-semibold text-slate-800 dark:text-white">Cuentas por cobrar</h2>
                <p className="text-xs text-slate-500 dark:text-gray-400">{unpaid.length} órdenes sin pagar — {formatCOP(unpaid.reduce((a,o)=>a+o.total,0))} total</p>
              </div>
              <a href="/sales" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver ventas →</a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {buckets.map((b) => (
                <div key={b.label} className={`rounded-xl border p-4 ${b.cls}`}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-70">{b.label}</p>
                  <p className="text-2xl font-bold">{b.orders.length}</p>
                  <p className="text-sm font-medium mt-0.5">{formatCOP(b.orders.reduce((a,o)=>a+o.total,0))}</p>
                </div>
              ))}
            </div>
            {buckets[2].orders.length > 0 && (
              <div className="border border-red-200 dark:border-red-800 rounded-lg overflow-hidden">
                <div className="bg-red-50 dark:bg-red-900/20 px-4 py-2">
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">⚠️ Vencidas (+30 días) — Requieren atención inmediata</p>
                </div>
                <div className="divide-y divide-red-100 dark:divide-red-900/30">
                  {buckets[2].orders.slice(0, 5).map((o) => {
                    const days = Math.floor((today.getTime() - new Date(o.date + 'T12:00:00').getTime()) / 86400000)
                    const cust = customers.find(c => c.id === o.customerId)
                    return (
                      <div key={o.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div>
                          <p className="font-mono text-xs text-blue-600 dark:text-blue-400">{o.orderNumber}</p>
                          <p className="font-medium text-slate-700 dark:text-gray-200">{o.customer}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {cust?.phone && (
                            <button onClick={(e) => { e.stopPropagation(); openWhatsApp(cust.phone!, buildPaymentReminder({ companyName: companySettings.companyName || 'Nuestra empresa', customer: cust.name, orderNumber: o.orderNumber, date: o.date, total: o.total, paymentStatus: o.paymentStatus, bankInfo })) }}
                              className="p-1.5 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors" title="Cobrar por WhatsApp">
                              <MessageCircle size={14} />
                            </button>
                          )}
                          <div className="text-right">
                            <p className="font-bold text-slate-800 dark:text-white">{formatCOP(o.total)}</p>
                            <p className="text-xs text-red-600 dark:text-red-400">{days} días</p>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Bulk WhatsApp payment reminders */}
            {customersWithDebt.length > 0 && (
              <div className="mt-4 border border-green-200 dark:border-green-800 rounded-lg overflow-hidden">
                <div className="bg-green-50 dark:bg-green-900/20 px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={14} className="text-green-700 dark:text-green-400" />
                    <p className="text-xs font-semibold text-green-700 dark:text-green-400">Cobro masivo por WhatsApp</p>
                  </div>
                  <span className="text-xs text-green-600 dark:text-green-500">{customersWithDebt.length} clientes con saldo</span>
                </div>
                <div className="divide-y divide-green-100 dark:divide-green-900/30">
                  {customersWithDebt.slice(0, 8).map(({ customer: cust, orders: custOrders }) => {
                    const total = custOrders.reduce((a, o) => a + o.total, 0)
                    return (
                      <div key={cust.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                        <div>
                          <p className="font-medium text-slate-700 dark:text-gray-200">{cust.name}</p>
                          <p className="text-xs text-slate-500 dark:text-gray-400">{custOrders.length} orden(es) — {cust.phone}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-bold text-slate-800 dark:text-white">{formatCOP(total)}</p>
                          <button onClick={() => {
                            if (custOrders.length === 1) {
                              openWhatsApp(cust.phone!, buildPaymentReminder({ companyName: companySettings.companyName || 'Nuestra empresa', customer: cust.name, orderNumber: custOrders[0].orderNumber, date: custOrders[0].date, total: custOrders[0].total, paymentStatus: custOrders[0].paymentStatus, bankInfo }))
                            } else {
                              openWhatsApp(cust.phone!, buildBulkPaymentReminder({ companyName: companySettings.companyName || 'Nuestra empresa', customer: cust.name, orders: custOrders.map(o => ({ orderNumber: o.orderNumber, date: o.date, total: o.total })), bankInfo }))
                            }
                          }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 transition-colors">
                            <Send size={12} /> Cobrar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* Cash Flow Forecast — Contabilidad / Admin */}
      {(showFinance || isAdmin) &&
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={18} className="text-violet-600" />
          <div>
            <h2 className="font-semibold text-slate-800 dark:text-white">Flujo de caja proyectado</h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">Proyección basada en cuentas pendientes y gastos recurrentes</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4">
            <div className="flex items-center gap-1 mb-1">
              <ArrowUpRight size={14} className="text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Por cobrar</p>
            </div>
            <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCOP(cashFlow.pendingReceivables)}</p>
          </div>
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-4">
            <div className="flex items-center gap-1 mb-1">
              <ArrowDownRight size={14} className="text-red-600" />
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">Por pagar (OC)</p>
            </div>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">{formatCOP(cashFlow.pendingPayables)}</p>
          </div>
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-4">
            <div className="flex items-center gap-1 mb-1">
              <Clock size={14} className="text-amber-600" />
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Gastos recurrentes</p>
            </div>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{formatCOP(cashFlow.recurringMonthly)}</p>
          </div>
          <div className={`rounded-xl border p-4 ${cashFlow.netProjected >= 0 ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
            <div className="flex items-center gap-1 mb-1">
              <DollarSign size={14} className={cashFlow.netProjected >= 0 ? 'text-blue-600' : 'text-red-600'} />
              <p className={`text-xs font-semibold ${cashFlow.netProjected >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>Flujo neto</p>
            </div>
            <p className={`text-lg font-bold ${cashFlow.netProjected >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>{formatCOP(cashFlow.netProjected)}</p>
          </div>
        </div>
      </div>}

      {/* Production status — Producción / Admin */}
      {showProduction && <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-white">Estado de producción</h2>
          <Link to="/production" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver todas →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {productionOrders.map((o) => (
            <div key={o.id} className="border border-slate-100 dark:border-gray-700 rounded-lg p-3 hover:border-blue-200 dark:hover:border-blue-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-500 dark:text-gray-400">{o.orderNumber}</span>
                <StatusBadge status={o.status} />
              </div>
              <p className="text-sm font-medium text-slate-800 dark:text-white truncate">{o.product}</p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Package size={11} /> {o.plannedQty} u
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {o.plannedStart?.split(' ')[0] ?? '—'}
                </span>
                <span className="flex items-center gap-1">
                  <Users size={11} /> {o.assignedTo?.split(' ')[0] ?? '—'}
                </span>
              </div>
              {o.status === 'in_progress' && (
                <div className="mt-2">
                  <div className="h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full">
                    <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: '60%' }} />
                  </div>
                  <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">60% completado</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>}

      {/* Inventory role: show low stock detail */}
      {role === 'Inventario' && lowStock.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">Insumos bajo stock mínimo</h2>
            <Link to="/inventory" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Ver inventario →</Link>
          </div>
          <div className="space-y-0">
            <div className="grid grid-cols-4 text-xs text-slate-400 dark:text-gray-500 font-medium pb-2 border-b border-slate-100 dark:border-gray-700">
              <span>Insumo</span><span className="text-right">Stock</span><span className="text-right">Mínimo</span><span className="text-right">Déficit</span>
            </div>
            {lowStock.map((s) => (
              <div key={s.id} className="grid grid-cols-4 items-center py-2.5 border-b border-slate-50 dark:border-gray-700 text-sm">
                <span className="text-slate-700 dark:text-gray-300 truncate pr-2">{s.name}</span>
                <span className="text-right font-mono text-red-600 dark:text-red-400">{s.stock} {s.unit}</span>
                <span className="text-right font-mono text-slate-500 dark:text-gray-400">{s.minStock} {s.unit}</span>
                <span className="text-right font-bold text-red-600 dark:text-red-400">-{s.minStock - s.stock} {s.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
