import { useState, useMemo } from 'react'
import {
  Wallet, Search, AlertCircle, Clock, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, DollarSign, Users, MessageCircle, Banknote,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatCOP } from '../utils/currency'
import Pagination from '../components/Pagination'
import DateRangeFilter from '../components/DateRangeFilter'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { toast } from '../components/Toast'
import { openWhatsApp, buildPaymentReminder, getBankInfo } from '../utils/whatsapp'
import { PaymentModal } from './Payments'
import * as XLSX from 'xlsx'

type PayFilter = '' | 'pending' | 'partial' | 'paid'

const PAY_STATUS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Pendiente', color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300', icon: AlertTriangle },
  partial: { label: 'Parcial',   color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', icon: Clock },
  paid:    { label: 'Pagado',    color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', icon: CheckCircle },
}

function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })
}

function daysDiff(d: string) {
  const diff = Math.floor((Date.now() - new Date(d + 'T12:00:00').getTime()) / 86400000)
  return diff
}

/** Add N days to a YYYY-MM-DD string, return YYYY-MM-DD */
function addDaysISO(d: string, days: number): string {
  const dt = new Date(d + 'T12:00:00')
  dt.setDate(dt.getDate() + days)
  return dt.toISOString().split('T')[0]
}

const PAGE_SIZE = 12

export default function CarteraPage() {
  const { saleOrders, customers, payments, companySettings } = useStore()
  const [codPrefill, setCodPrefill] = useState<null | { saleOrderId: string; saleOrderNumber: string; customer: string; customerId: string; remaining: number }>(null)
  const [search, setSearch] = useState('')
  const [payFilter, setPayFilter] = useState<PayFilter>('')
  const [page, setPage] = useState(1)
  const [sortKey, setSortKey] = useState<'date' | 'total' | 'aging'>('date')
  const [sortAsc, setSortAsc] = useState(false)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Build accounts receivable with due-date-based aging and net balance.
  // - Due date = order.date + customer.paymentTerms (defaults to 0 = contado)
  // - Aging in days = today - dueDate  (negative means not yet due)
  // - Net balance = order.total - Σ payments for that order
  const arItems = useMemo(() => {
    return saleOrders.map(o => {
      const cust = customers.find(c => c.id === o.customerId)
      const terms = cust?.paymentTerms ?? 0
      const dueDate = addDaysISO(o.date, terms)
      const daysPastDue = daysDiff(dueDate)
      const paidAmount = payments.filter(p => p.saleOrderId === o.id).reduce((s, p) => s + p.amount, 0)
      const remaining = Math.max(0, o.total - paidAmount)
      // Aging bucket by due date — negatives are "al día"
      const bucket = daysPastDue <= 0
        ? 'al-día'
        : daysPastDue <= 15 ? '1-15'
        : daysPastDue <= 30 ? '16-30'
        : daysPastDue <= 60 ? '31-60'
        : '60+'
      return {
        ...o,
        dueDate,
        aging: daysPastDue,   // still called aging so existing sort/columns keep working
        agingBucket: bucket,
        paymentTerms: terms,
        remaining,
        paidAmount,
      }
    })
  }, [saleOrders, customers, payments])

  const filtered = arItems
    .filter(o => {
      const q = search.toLowerCase()
      const match = !q || o.customer.toLowerCase().includes(q) || o.orderNumber.toLowerCase().includes(q)
      const payMatch = !payFilter || o.paymentStatus === payFilter
      const dateMatch = (!dateFrom || o.date >= dateFrom) && (!dateTo || o.date <= dateTo)
      return match && payMatch && dateMatch
    })
    .sort((a, b) => {
      const mul = sortAsc ? 1 : -1
      if (sortKey === 'date') return mul * a.date.localeCompare(b.date)
      if (sortKey === 'total') return mul * (a.remaining - b.remaining)
      return mul * (a.aging - b.aging)
    })

  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // KPIs — now net-of-payments and due-date-aware
  const unpaid = arItems.filter(o => o.remaining > 0)
  const totalAR = unpaid.reduce((s, o) => s + o.remaining, 0)
  const pendingCount = unpaid.filter(o => o.paymentStatus === 'pending').length
  const partialCount = unpaid.filter(o => o.paymentStatus === 'partial').length
  const overdueCount = unpaid.filter(o => o.aging > 30).length

  // Aging summary — due-date-based, net balance
  const agingSummary = useMemo(() => {
    const buckets: Record<string, number> = { 'al-día': 0, '1-15': 0, '16-30': 0, '31-60': 0, '60+': 0 }
    for (const o of unpaid) buckets[o.agingBucket] += o.remaining
    return buckets
  }, [unpaid])

  // Customer summary — net balance
  const customerSummary = useMemo(() => {
    const map: Record<string, { name: string; total: number; count: number }> = {}
    for (const o of unpaid) {
      if (!map[o.customerId]) map[o.customerId] = { name: o.customer, total: 0, count: 0 }
      map[o.customerId].total += o.remaining
      map[o.customerId].count++
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5)
  }, [unpaid])

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  const exportExcel = () => {
    const data = filtered.map(o => ({
      'Orden': o.orderNumber, 'Cliente': o.customer,
      'Plazo': o.paymentTerms > 0 ? `Net-${o.paymentTerms}` : 'Contado',
      'Emisión': o.date, 'Vence': o.dueDate,
      'Saldo': o.remaining, 'Pagado': o.paidAmount, 'Total': o.total,
      'Estado Pago': PAY_STATUS[o.paymentStatus]?.label ?? o.paymentStatus,
      'Mora (días)': o.aging, 'Rango': o.agingBucket,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cartera')
    XLSX.writeFile(wb, 'cartera.xlsx')
  }

  const SortIcon = ({ k }: { k: typeof sortKey }) =>
    sortKey === k ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : <ChevronDown size={12} className="opacity-30" />

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Wallet}
        title="Cartera"
        subtitle="Cuentas por cobrar y antigüedad"
        accent="rgba(37, 99, 235, 0.20)"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard icon={Wallet}         label="Cartera total"     value={formatCOP(totalAR)} accent="#2563eb" hint="Por cobrar" />
        <StatCard icon={AlertTriangle}  label="Pago pendiente"    value={pendingCount}       accent="#ef4444" />
        <StatCard icon={Clock}          label="Pago parcial"      value={partialCount}       accent="#f59e0b" />
        <StatCard icon={AlertCircle}    label="Vencidas +30 días" value={overdueCount}       accent="#f43f5e" />
      </div>

      {/* Aging + Top customers */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Aging buckets */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm text-slate-700 dark:text-gray-200">Antigüedad de cartera</h3>
            <span className="text-[10px] uppercase tracking-widest text-slate-400 dark:text-gray-500">Por vencimiento</span>
          </div>
          <div className="space-y-3">
            {Object.entries(agingSummary).map(([bucket, value]) => {
              const maxVal = Math.max(...Object.values(agingSummary), 1)
              const pct = (value / maxVal) * 100
              const bucketMeta: Record<string, { color: string; label: string }> = {
                'al-día': { color: 'bg-emerald-500', label: 'Al día (dentro del plazo)' },
                '1-15':   { color: 'bg-amber-400',   label: '1–15 días vencido' },
                '16-30':  { color: 'bg-amber-500',   label: '16–30 días vencido' },
                '31-60':  { color: 'bg-orange-500',  label: '31–60 días vencido' },
                '60+':    { color: 'bg-red-500',     label: '+60 días vencido' },
              }
              const m = bucketMeta[bucket] ?? { color: 'bg-slate-400', label: bucket }
              return (
                <div key={bucket}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-600 dark:text-gray-300">{m.label}</span>
                    <span className="font-medium text-slate-700 dark:text-gray-200 tabular-nums">{formatCOP(value)}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className={`h-full ${m.color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Top debtors */}
        <div className="card p-5">
          <h3 className="font-bold text-sm text-slate-700 dark:text-gray-200 mb-4 flex items-center gap-2">
            <Users size={14} /> Top clientes por cobrar
          </h3>
          {customerSummary.length === 0 ? (
            <p className="text-sm text-slate-400 dark:text-gray-500">Sin cuentas por cobrar</p>
          ) : (
            <div className="space-y-3">
              {customerSummary.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-gray-200">{c.name}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-500">{c.count} orden{c.count > 1 ? 'es' : ''}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-800 dark:text-white">{formatCOP(c.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9 w-full" placeholder="Buscar por cliente, # orden..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="input w-40" value={payFilter} onChange={e => { setPayFilter(e.target.value as PayFilter); setPage(1) }}>
            <option value="">Todos los pagos</option>
            {Object.entries(PAY_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <DateRangeFilter from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); setPage(1) }} />
          <button className="btn btn-secondary text-xs" onClick={exportExcel}>Excel</button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500 dark:text-gray-400 border-b border-slate-100 dark:border-gray-700">
              <th className="pb-3 px-4">Orden</th>
              <th className="pb-3 px-4">Cliente</th>
              <th className="pb-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('date')}>
                <span className="flex items-center gap-1">Emisión <SortIcon k="date" /></span>
              </th>
              <th className="pb-3 px-4">Vence</th>
              <th className="pb-3 px-4">Estado pago</th>
              <th className="pb-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('total')}>
                <span className="flex items-center gap-1">Saldo <SortIcon k="total" /></span>
              </th>
              <th className="pb-3 px-4 cursor-pointer select-none" onClick={() => toggleSort('aging')}>
                <span className="flex items-center gap-1">Mora <SortIcon k="aging" /></span>
              </th>
              <th className="pb-3 px-4">Rango</th>
              <th className="pb-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 && (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400 dark:text-gray-500">
                <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
                No se encontraron registros
              </td></tr>
            )}
            {paged.map(o => {
              const ps = PAY_STATUS[o.paymentStatus] ?? PAY_STATUS.pending
              const bucketColor: Record<string, string> = {
                'al-día': 'text-emerald-600 dark:text-emerald-400',
                '1-15':   'text-amber-600 dark:text-amber-400',
                '16-30':  'text-amber-700 dark:text-amber-300',
                '31-60':  'text-orange-600 dark:text-orange-400',
                '60+':    'text-red-600 dark:text-red-400',
              }
              const remaining = o.remaining
              const handleCharge = () => setCodPrefill({
                saleOrderId: o.id,
                saleOrderNumber: o.orderNumber,
                customer: o.customer,
                customerId: o.customerId,
                remaining,
              })
              const handleRemind = () => {
                const cust = customers.find(c => c.id === o.customerId)
                if (!cust?.phone) {
                  toast.error('El cliente no tiene teléfono registrado')
                  return
                }
                const msg = buildPaymentReminder({
                  companyName: companySettings.companyName || 'Amazonia Concrete',
                  customer: o.customer.split(' ')[0],
                  orderNumber: o.orderNumber,
                  date: o.date,
                  total: remaining,
                  paymentStatus: o.paymentStatus,
                  bankInfo: getBankInfo(companySettings),
                })
                openWhatsApp(cust.phone, msg)
              }
              // Aging label: negative → "en X días", zero → "hoy", positive → "N d"
              const moraLabel = o.aging < 0
                ? `en ${Math.abs(o.aging)}d`
                : o.aging === 0
                  ? 'hoy'
                  : `${o.aging}d`
              const bucketLabel: Record<string, string> = {
                'al-día': 'Al día',
                '1-15':   '1–15',
                '16-30':  '16–30',
                '31-60':  '31–60',
                '60+':    '60+',
              }
              return (
                <tr key={o.id} className="border-b border-slate-50 dark:border-gray-700/50 hover:bg-slate-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-700 dark:text-gray-200">{o.orderNumber}</td>
                  <td className="py-3 px-4 text-slate-700 dark:text-gray-200">
                    <div>{o.customer}</div>
                    {o.paymentTerms > 0 && (
                      <div className="text-[10px] text-slate-400 dark:text-gray-500 mt-0.5">Net-{o.paymentTerms}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 dark:text-gray-400">{fmt(o.date)}</td>
                  <td className={`py-3 px-4 tabular-nums ${o.aging > 0 ? 'font-medium text-slate-700 dark:text-gray-200' : 'text-slate-500 dark:text-gray-400'}`}>
                    {fmt(o.dueDate)}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${ps.color}`}>
                      <ps.icon size={12} /> {ps.label}
                    </span>
                  </td>
                  <td className="py-3 px-4 tabular-nums">
                    <div className="font-semibold text-slate-800 dark:text-white">{formatCOP(remaining)}</div>
                    {o.paidAmount > 0 && (
                      <div className="text-[10px] text-slate-400 dark:text-gray-500">de {formatCOP(o.total)}</div>
                    )}
                  </td>
                  <td className={`py-3 px-4 font-medium tabular-nums ${bucketColor[o.agingBucket] ?? ''}`}>{moraLabel}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs font-medium ${bucketColor[o.agingBucket] ?? ''}`}>{bucketLabel[o.agingBucket] ?? o.agingBucket}</span>
                  </td>
                  <td className="py-3 px-4">
                    {remaining > 0 && (
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 p-1.5 border-0"
                          onClick={handleCharge}
                          title="Cobrar"
                        >
                          <Banknote size={14} />
                        </button>
                        <button
                          className="btn btn-sm text-white p-1.5 border-0"
                          style={{ background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)' }}
                          onClick={handleRemind}
                          title="Recordar por WhatsApp"
                        >
                          <MessageCircle size={14} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="px-4 py-3">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      {codPrefill && <PaymentModal prefill={codPrefill} onClose={() => setCodPrefill(null)} />}
    </div>
  )
}
