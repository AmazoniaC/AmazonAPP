import { useState, useMemo } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { FileText, FileSpreadsheet, TrendingUp, BarChart3, PieChart as PieIcon, ShoppingCart, Package, Factory, Calendar, X, TrendingDown, DollarSign } from 'lucide-react'
import { useStore } from '../store/useStore'
import { formatCOP } from '../utils/currency'
import PageHeader from '../components/PageHeader'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { format, startOfDay, startOfWeek, startOfMonth, startOfQuarter, startOfYear } from 'date-fns'
import { es } from 'date-fns/locale'

const PIE_COLORS = ['#2563eb','#0f766e','#f59e0b','#dc2626','#7c3aed','#0891b2','#65a30d']

const EMPTY_STATE = (icon: React.ReactNode, msg: string) => (
  <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-gray-600 text-sm gap-2">
    {icon}
    <span>{msg}</span>
  </div>
)

type Period = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'all' | 'custom'

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoy', week: 'Esta semana', month: 'Este mes',
  quarter: 'Este trimestre', year: 'Este año', all: 'Todo', custom: 'Personalizado',
}

function getPeriodDates(period: Period, customFrom: string, customTo: string): { from: Date | null; to: Date | null } {
  const now = new Date()
  if (period === 'all') return { from: null, to: null }
  if (period === 'custom') {
    return {
      from: customFrom ? startOfDay(new Date(customFrom + 'T00:00:00')) : null,
      to: customTo   ? new Date(customTo + 'T23:59:59') : null,
    }
  }
  const starts: Record<Exclude<Period, 'all' | 'custom'>, Date> = {
    today: startOfDay(now), week: startOfWeek(now, { weekStartsOn: 1 }),
    month: startOfMonth(now), quarter: startOfQuarter(now), year: startOfYear(now),
  }
  return { from: starts[period as keyof typeof starts], to: now }
}

export default function Reports() {
  const { saleOrders, supplies, productionOrders, products, expenses, darkMode } = useStore()

  const [period, setPeriod]       = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo]     = useState('')

  const { from, to } = useMemo(
    () => getPeriodDates(period, customFrom, customTo),
    [period, customFrom, customTo],
  )

  const filteredOrders = useMemo(() => {
    if (!from && !to) return saleOrders
    return saleOrders.filter((o) => {
      const d = new Date(o.date + 'T12:00:00')
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }, [saleOrders, from, to])

  const totalRevenue = filteredOrders.reduce((a,o) => a + o.total, 0)
  const totalCost    = productionOrders.reduce((a,o) => a + (o.actualCost ?? o.estimatedCost ?? 0), 0)
  const grossMargin  = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue * 100) : 0

  // P&L — filter expenses to the same period as orders
  const filteredExpenses = useMemo(() => {
    if (!from && !to) return expenses
    return expenses.filter((e) => {
      const d = new Date(e.date + 'T12:00:00')
      if (from && d < from) return false
      if (to   && d > to)   return false
      return true
    })
  }, [expenses, from, to])

  const totalExpenses   = filteredExpenses.reduce((a, e) => a + e.amount, 0)
  const grossProfit     = totalRevenue - totalCost
  const netProfit       = grossProfit - totalExpenses
  const netMargin       = totalRevenue > 0 ? (netProfit / totalRevenue * 100) : 0

  // Expenses by category (filtered)
  const expenseByCategory = useMemo(() => {
    const byCat: Record<string, number> = {}
    filteredExpenses.forEach((e) => { byCat[e.category] = (byCat[e.category] ?? 0) + e.amount })
    return Object.entries(byCat).sort((a,b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  }, [filteredExpenses])

  // Monthly P&L chart — last 6 months
  const plMonthlyData = useMemo(() => {
    const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const today  = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() - (5 - i), 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}`
      const label = `${MONTHS[d.getMonth()]} ${d.getFullYear() !== today.getFullYear() ? d.getFullYear() : ''}`
      const revenue = saleOrders
        .filter((o) => o.date?.startsWith(key))
        .reduce((a, o) => a + o.total, 0)
      const expTotal = expenses
        .filter((e) => e.date?.startsWith(key))
        .reduce((a, e) => a + e.amount, 0)
      return { label: label.trim(), ingresos: Math.round(revenue), egresos: Math.round(expTotal), utilidad: Math.round(revenue - expTotal) }
    })
  }, [saleOrders, expenses])

  const lowStockItems  = supplies.filter((s) => s.stock < s.minStock)
  const inventoryValue = supplies.reduce((a,s) => a + s.stock * s.cost, 0)

  // ── Product Profitability Matrix ─────────────────────────────────────────
  const profitabilityData = useMemo(() => {
    const productMap = Object.fromEntries(products.map(p => [p.id, p]))
    const productStats: Record<string, { name: string; category: string; revenue: number; cost: number; unitsSold: number }> = {}
    filteredOrders.forEach(o => {
      (o.items ?? []).forEach((item: any) => {
        const pid = item.productId
        if (!pid) return
        const prod = productMap[pid]
        if (!prod) return
        const key = pid
        if (!productStats[key]) {
          productStats[key] = { name: prod.name, category: prod.category, revenue: 0, cost: 0, unitsSold: 0 }
        }
        const qty = item.qty ?? item.quantity ?? 0
        productStats[key].revenue += item.subtotal ?? 0
        productStats[key].cost += prod.cost * qty
        productStats[key].unitsSold += qty
      })
    })
    return Object.values(productStats)
      .map(p => ({
        ...p,
        profit: p.revenue - p.cost,
        margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue * 100) : 0,
      }))
      .sort((a, b) => b.profit - a.profit)
  }, [filteredOrders, products])

  // Top customers from filtered orders
  const topCustomers = useMemo(() => {
    const customerSales = filteredOrders.reduce((acc, o) => {
      acc[o.customer] = (acc[o.customer] ?? 0) + o.total
      return acc
    }, {} as Record<string, number>)
    return Object.entries(customerSales)
      .sort(([,a],[,b]) => b - a).slice(0, 5)
      .map(([name, total]) => ({ name: name.split(' ')[0], total: parseFloat(total.toFixed(2)) }))
  }, [filteredOrders])

  // Top products from filtered order items
  const productSalesData = useMemo(() => {
    const productSales = filteredOrders.flatMap((o) => o.items ?? []).reduce((acc, item: any) => {
      const name = item.product ?? item.productName ?? ''
      acc[name] = (acc[name] ?? 0) + (item.qty ?? item.quantity ?? 0)
      return acc
    }, {} as Record<string, number>)
    return Object.entries(productSales)
      .sort(([,a],[,b]) => b - a).slice(0,6)
      .map(([name, qty]) => ({ name: name.split(' ')[0], qty }))
  }, [filteredOrders])

  // Sales trend: build chart based on period range
  const salesChartData = useMemo(() => {
    const salesByDay: Record<string, number> = {}
    filteredOrders.forEach((o) => {
      const d = o.date?.slice(0,10) ?? ''
      if (d) salesByDay[d] = (salesByDay[d] ?? 0) + o.total
    })

    // Determine how many days to show
    let days = 30
    if (period === 'today') days = 1
    else if (period === 'week') days = 7
    else if (period === 'quarter') days = 90
    else if (period === 'year') days = 365
    else if (period === 'custom' && customFrom && customTo) {
      days = Math.min(Math.ceil((new Date(customTo).getTime() - new Date(customFrom).getTime()) / 86400000) + 1, 365)
    }

    const endDate = to ?? new Date()
    const startDate = from ?? new Date(endDate.getTime() - (days - 1) * 86400000)
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1

    // If > 60 days, group by week; > 180 days, group by month
    if (totalDays > 180) {
      const byMonth: Record<string, number> = {}
      Object.entries(salesByDay).forEach(([date, val]) => {
        const key = date.slice(0, 7) // YYYY-MM
        byMonth[key] = (byMonth[key] ?? 0) + val
      })
      return Object.entries(byMonth).sort(([a],[b]) => a.localeCompare(b))
        .map(([k, ventas]) => ({ day: k.slice(5) + '/' + k.slice(2,4), ventas }))
    }

    return Array.from({ length: Math.min(totalDays, 90) }, (_, i) => {
      const d = new Date(startDate)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0,10)
      return {
        day: `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`,
        ventas: salesByDay[key] ?? 0,
      }
    })
  }, [filteredOrders, period, from, to, customFrom, customTo])

  // Revenue by category from filtered orders
  const revenueByCategory = useMemo(() => {
    const productMap = Object.fromEntries(products.map((p) => [p.id, p]))
    const rev: Record<string, number> = {}
    filteredOrders.forEach((o) =>
      (o.items ?? []).forEach((item: any) => {
        const cat = productMap[item.productId]?.category ?? 'Otros'
        rev[cat] = (rev[cat] ?? 0) + (item.subtotal ?? 0)
      })
    )
    const total = Object.values(rev).reduce((a, v) => a + v, 0)
    if (total === 0) return []
    return Object.entries(rev)
      .sort((a,b) => b[1] - a[1])
      .map(([name, v]) => ({ name, value: Math.round(v / total * 100) }))
  }, [filteredOrders, products])

  // Production by month from real production orders
  const productionByMonth = useMemo(() => {
    const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
    const byMonth: Record<string, number> = {}
    productionOrders.forEach((o) => {
      const date = o.plannedStart ?? ''
      if (!date) return
      const d = new Date(date)
      if (isNaN(d.getTime())) return
      const key = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
      byMonth[key] = (byMonth[key] ?? 0) + (o.plannedQty ?? 0)
    })
    return Object.entries(byMonth)
      .slice(-6)
      .map(([month, unidades]) => ({ month: month.slice(0,3), unidades }))
  }, [productionOrders])

  const gridColor = darkMode ? '#374151' : '#f1f5f9'
  const tickColor = darkMode ? '#9ca3af' : '#94a3b8'

  // ─── Export PDF ─────────────────────────────────────────────────────────────
  const handleExportPDF = () => {
    const doc = new jsPDF()
    const dateStr = format(new Date(), "d 'de' MMMM yyyy", { locale: es })

    doc.setFontSize(18)
    doc.setTextColor(37, 99, 235)
    doc.text('Amazonia ERP — Reporte General', 14, 18)
    doc.setFontSize(10)
    doc.setTextColor(100, 116, 139)
    doc.text(`Generado el ${dateStr} · Período: ${PERIOD_LABELS[period]}`, 14, 26)

    autoTable(doc, {
      startY: 38,
      head: [['Insumo', 'SKU', 'Categoría', 'Stock', 'Mín.', 'Costo unit.', 'Valor total']],
      body: supplies.map((s) => [
        s.name, s.sku, s.category,
        `${s.stock} ${s.unit}`, `${s.minStock} ${s.unit}`,
        formatCOP(s.cost), formatCOP(s.stock * s.cost),
      ]),
      headStyles: { fillColor: [37, 99, 235] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8 },
    })

    const afterInventory = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    autoTable(doc, {
      startY: afterInventory,
      head: [['Nro. Orden', 'Cliente', 'Fecha', 'Estado', 'Pago', 'Total']],
      body: filteredOrders.map((o) => [
        o.orderNumber, o.customer,
        format(new Date(o.date), 'dd/MM/yyyy'),
        o.status, o.paymentStatus, formatCOP(o.total),
      ]),
      headStyles: { fillColor: [5, 150, 105] },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      styles: { fontSize: 8 },
    })

    doc.save(`reporte-erp-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  // ─── Export Excel ────────────────────────────────────────────────────────────
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new()

    const inventoryData = supplies.map((s) => ({
      'Insumo': s.name, 'SKU': s.sku, 'Categoría': s.category,
      'Stock': s.stock, 'Unidad': s.unit, 'Stock mínimo': s.minStock,
      'Costo unit.': s.cost, 'Valor total': parseFloat((s.stock * s.cost).toFixed(2)),
      'Estado': s.stock < s.minStock ? 'BAJO' : 'OK',
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventoryData), 'Inventario')

    const salesData = filteredOrders.map((o) => ({
      'N° Orden': o.orderNumber, 'Cliente': o.customer,
      'Fecha': format(new Date(o.date), 'dd/MM/yyyy'),
      'Entrega': o.deliveryDate ? format(new Date(o.deliveryDate), 'dd/MM/yyyy') : '',
      'Estado': o.status, 'Pago': o.paymentStatus,
      'Método pago': o.paymentMethod,
      'Subtotal': o.subtotal, 'Impuesto': o.tax, 'Total': o.total,
    }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(salesData), 'Ventas')

    const customersData = topCustomers.map((c) => ({ 'Cliente': c.name, 'Total compras': c.total }))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(customersData), 'Top Clientes')

    XLSX.writeFile(wb, `reporte-erp-${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
  }

  const ordersCount = filteredOrders.length
  const avgOrderValue = ordersCount > 0 ? totalRevenue / ordersCount : 0

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BarChart3}
        title="Reportes"
        subtitle="Análisis completo del negocio"
        accent="rgba(124, 58, 237, 0.20)"
        actions={
          <>
            <button onClick={handleExportPDF} className="btn btn-sm btn-secondary">
              <FileText size={13} /> Exportar PDF
            </button>
            <button onClick={handleExportExcel} className="btn btn-sm btn-primary">
              <FileSpreadsheet size={13} /> Exportar Excel
            </button>
          </>
        }
      />

      {/* Period selector */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Calendar size={14} className="text-slate-400 dark:text-gray-500" />
          <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wider mr-1">Período:</span>
          {(['today','week','month','quarter','year','all','custom'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                period === p
                  ? 'bg-amazonia-700 text-white shadow-soft ring-1 ring-inset ring-amazonia-600/30'
                  : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-600 hover:border-amazonia-400 hover:text-amazonia-700'
              }`}>{PERIOD_LABELS[p]}</button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" className="input text-xs py-1.5 w-36" value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)} />
              <span className="text-xs text-slate-400">—</span>
              <input type="date" className="input text-xs py-1.5 w-36" value={customTo}
                onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
          {period !== 'all' && (
            <span className="ml-auto text-xs text-slate-400 dark:text-gray-500 bg-slate-100 dark:bg-gray-700 px-2 py-1 rounded-md">
              {ordersCount} órdenes · {PERIOD_LABELS[period]}
            </span>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Ingresos', value: formatCOP(totalRevenue), icon:TrendingUp,  color:'bg-blue-600',    sub:`${ordersCount} órdenes` },
          { label:'Ticket promedio', value: formatCOP(avgOrderValue), icon:BarChart3, color:'bg-emerald-600', sub:'Por orden' },
          { label:'Valor inventario', value: formatCOP(inventoryValue),    icon:PieIcon,     color:'bg-violet-600',  sub:`${supplies.length} insumos` },
          { label:'Prod. completadas',value:String(productionOrders.filter(o=>o.status==='finished').length), icon:BarChart3, color:'bg-teal-600', sub:'Órdenes finalizadas' },
        ].map((s) => (
          <div key={s.label} className="card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.color}`}>
              <s.icon size={18} className="text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-gray-400">{s.label}</p>
              <p className="text-xl font-bold text-slate-800 dark:text-white">{s.value}</p>
              <p className="text-xs text-slate-400 dark:text-gray-500">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── P&L Section ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign size={18} className="text-emerald-600" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Resultado Financiero (P&L)</h2>
        </div>

        {/* P&L KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Ingresos', value: totalRevenue, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20', icon: TrendingUp, sign: '' },
            { label: 'Costo de producción', value: totalCost, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-900/20', icon: TrendingDown, sign: '— ' },
            { label: 'Gastos operativos', value: totalExpenses, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20', icon: TrendingDown, sign: '— ' },
            {
              label: 'Utilidad neta',
              value: netProfit,
              color: netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400',
              bg:    netProfit >= 0 ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20',
              icon: TrendingUp, sign: '',
            },
          ].map((kpi) => (
            <div key={kpi.label} className="card p-4">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${kpi.bg}`}>
                <kpi.icon size={15} className={kpi.color} />
              </div>
              <p className="text-xs text-slate-500 dark:text-gray-400">{kpi.label}</p>
              <p className={`text-lg font-bold ${kpi.color}`}>{kpi.sign}{formatCOP(Math.abs(kpi.value))}</p>
              {kpi.label === 'Utilidad neta' && (
                <p className={`text-xs mt-0.5 ${netMargin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  Margen: {netMargin.toFixed(1)}%
                </p>
              )}
              {kpi.label === 'Ingresos' && (
                <p className="text-xs text-slate-400 mt-0.5">Margen bruto: {grossMargin.toFixed(1)}%</p>
              )}
            </div>
          ))}
        </div>

        {/* P&L statement (simplified) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Statement */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-700 dark:text-gray-200 mb-4 text-sm">Estado de resultados</h3>
            <div className="space-y-2 text-sm">
              {[
                { label: 'Ingresos por ventas', val: totalRevenue, cls: 'text-blue-600 dark:text-blue-400', bold: false },
                { label: '  Costo de ventas', val: -totalCost, cls: 'text-slate-600 dark:text-gray-300', bold: false },
                { label: 'Utilidad bruta', val: grossProfit, cls: grossProfit >= 0 ? 'text-emerald-600' : 'text-red-500', bold: true },
                { label: '  Gastos operativos', val: -totalExpenses, cls: 'text-slate-600 dark:text-gray-300', bold: false },
                { label: 'UTILIDAD NETA', val: netProfit, cls: netProfit >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400', bold: true },
              ].map((row) => (
                <div key={row.label} className={`flex justify-between py-1.5 border-b border-slate-100 dark:border-gray-700 last:border-0 last:pt-2 ${row.bold ? 'font-bold' : ''}`}>
                  <span className="text-slate-600 dark:text-gray-300">{row.label}</span>
                  <span className={row.cls}>{row.val < 0 ? '— ' : ''}{formatCOP(Math.abs(row.val))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Expense breakdown pie */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-700 dark:text-gray-200 mb-4 text-sm">Gastos por categoría</h3>
            {expenseByCategory.length === 0
              ? EMPTY_STATE(<TrendingDown size={28} className="opacity-30" />, 'Sin gastos en el período')
              : (
                <div className="space-y-2">
                  {expenseByCategory.map(({ name, value }) => {
                    const pct = totalExpenses > 0 ? (value / totalExpenses * 100) : 0
                    return (
                      <div key={name}>
                        <div className="flex justify-between text-xs text-slate-600 dark:text-gray-300 mb-1">
                          <span>{name}</span>
                          <span className="font-semibold">{formatCOP(value)} <span className="text-slate-400">({pct.toFixed(0)}%)</span></span>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-gray-700 rounded-full h-1.5">
                          <div className="bg-red-400 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            }
          </div>
        </div>

        {/* Monthly P&L bar chart */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-700 dark:text-gray-200 mb-1 text-sm">Ingresos vs Egresos — últimos 6 meses</h3>
          <p className="text-xs text-slate-400 dark:text-gray-500 mb-4">Ingresos (azul), Gastos operativos (rojo), Utilidad (verde)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={plMonthlyData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} />
              <YAxis tick={{ fill: tickColor, fontSize: 10 }} tickFormatter={(v) => `$${(v/1000000).toFixed(1)}M`} />
              <Tooltip
                formatter={(v: number) => formatCOP(v)}
                contentStyle={{ background: darkMode ? '#1f2937' : '#fff', border: 'none', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="ingresos"  name="Ingresos"  fill="#2563eb" radius={[4,4,0,0]} />
              <Bar dataKey="egresos"   name="Egresos"   fill="#ef4444" radius={[4,4,0,0]} />
              <Bar dataKey="utilidad"  name="Utilidad"  fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sales trend */}
      <div className="card p-5">
        <div className="mb-4">
          <h2 className="font-semibold text-slate-800 dark:text-white">Tendencia de ventas</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400">Ventas por día en el período seleccionado</p>
        </div>
        {filteredOrders.length === 0
          ? EMPTY_STATE(<ShoppingCart size={32} className="opacity-30" />, 'Sin ventas en este período')
          : (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={salesChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="day" tick={{ fontSize:11, fill:tickColor }} tickLine={false} axisLine={false}
                  interval={salesChartData.length > 30 ? Math.floor(salesChartData.length / 10) : 'preserveStartEnd'} />
                <YAxis tick={{ fontSize:11, fill:tickColor }} tickLine={false} axisLine={false} tickFormatter={(v)=>formatCOP(v)} />
                <Tooltip formatter={(v:number)=>[formatCOP(v), 'Ventas']} />
                <Line type="monotone" dataKey="ventas" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r:5 }} />
              </LineChart>
            </ResponsiveContainer>
          )
        }
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top customers */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Clientes más activos</h2>
          {topCustomers.length === 0
            ? EMPTY_STATE(<ShoppingCart size={32} className="opacity-30" />, 'Sin ventas en este período')
            : (
              <ResponsiveContainer width="100%" height={Math.max(topCustomers.length * 44, 120)}>
                <BarChart data={topCustomers} layout="vertical" barSize={12}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize:11, fill:tickColor }} tickLine={false} axisLine={false}
                         tickFormatter={(v)=>formatCOP(v)} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:11, fill:tickColor }}
                         tickLine={false} axisLine={false} width={80} />
                  <Tooltip formatter={(v:number)=>[formatCOP(v), 'Total compras']} />
                  <Bar dataKey="total" fill="#7c3aed" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Products sold */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-4">Productos más vendidos</h2>
          {productSalesData.length === 0
            ? EMPTY_STATE(<Package size={32} className="opacity-30" />, 'Sin ventas en este período')
            : (
              <ResponsiveContainer width="100%" height={Math.max(productSalesData.length * 44, 120)}>
                <BarChart data={productSalesData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" tick={{ fontSize:11, fill:tickColor }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:11, fill:tickColor }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v:number)=>[`${v} u`, 'Unidades']} />
                  <Bar dataKey="qty" fill="#0f766e" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>

        {/* Revenue by category */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-1">Ingresos por categoría</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">Participación en ventas del período</p>
          {revenueByCategory.length === 0
            ? EMPTY_STATE(<ShoppingCart size={32} className="opacity-30" />, 'Sin ventas en este período')
            : (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={180}>
                  <PieChart>
                    <Pie data={revenueByCategory} cx="50%" cy="50%" outerRadius={80}
                         dataKey="value" paddingAngle={3}>
                      {revenueByCategory.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v)=>[`${v}%`,'Participación']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {revenueByCategory.map((d, i) => (
                    <div key={d.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-slate-600 dark:text-gray-300">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-700 dark:text-gray-200">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          }
        </div>

        {/* Production trend */}
        <div className="card p-5">
          <h2 className="font-semibold text-slate-800 dark:text-white mb-1">Producción mensual</h2>
          <p className="text-xs text-slate-500 dark:text-gray-400 mb-4">Unidades producidas por mes</p>
          {productionByMonth.length === 0
            ? EMPTY_STATE(<Factory size={32} className="opacity-30" />, 'Sin órdenes de producción')
            : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={productionByMonth} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="month" tick={{ fontSize:11, fill:tickColor }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize:11, fill:tickColor }} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v:number)=>[`${v} u`, 'Producción']} />
                  <Bar dataKey="unidades" fill="#f59e0b" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          }
        </div>
      </div>

      {/* Product Profitability Matrix */}
      {profitabilityData.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-800 dark:text-white">Rentabilidad por producto</h2>
              <p className="text-xs text-slate-500 dark:text-gray-400">Margen de ganancia por producto en el período seleccionado</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
                  {['Producto','Categoría','Unidades','Ingresos','Costo','Utilidad','Margen'].map((h) => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-gray-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {profitabilityData.map((p) => (
                  <tr key={p.name} className="border-b border-slate-50 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700/30">
                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-gray-200">{p.name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-400">{p.category}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-gray-300">{p.unitsSold}</td>
                    <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold">{formatCOP(p.revenue)}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-gray-400">{formatCOP(p.cost)}</td>
                    <td className={`px-4 py-3 font-bold ${p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>{formatCOP(p.profit)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full">
                          <div className={`h-1.5 rounded-full ${p.margin >= 50 ? 'bg-emerald-500' : p.margin >= 30 ? 'bg-blue-500' : p.margin >= 15 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.min(p.margin, 100)}%` }} />
                        </div>
                        <span className={`text-xs font-bold ${p.margin >= 50 ? 'text-emerald-600' : p.margin >= 30 ? 'text-blue-600' : p.margin >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
                          {p.margin.toFixed(1)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 dark:bg-gray-700/50 border-t-2 border-slate-200 dark:border-gray-600">
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-white" colSpan={2}>TOTAL</td>
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{profitabilityData.reduce((a, p) => a + p.unitsSold, 0)}</td>
                  <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">{formatCOP(profitabilityData.reduce((a, p) => a + p.revenue, 0))}</td>
                  <td className="px-4 py-3 font-bold text-slate-600 dark:text-gray-300">{formatCOP(profitabilityData.reduce((a, p) => a + p.cost, 0))}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(profitabilityData.reduce((a, p) => a + p.profit, 0))}</td>
                  <td className="px-4 py-3">
                    {(() => {
                      const totRev = profitabilityData.reduce((a, p) => a + p.revenue, 0)
                      const totProf = profitabilityData.reduce((a, p) => a + p.profit, 0)
                      const avgMargin = totRev > 0 ? (totProf / totRev * 100) : 0
                      return <span className="text-xs font-bold text-emerald-600">{avgMargin.toFixed(1)}%</span>
                    })()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Inventory alert table */}
      {lowStockItems.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800 dark:text-white">⚠️ Insumos con stock bajo</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800">
                {['Insumo','SKU','Stock actual','Stock mínimo','Déficit','Acción'].map((h) => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-red-600 dark:text-red-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lowStockItems.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 dark:border-gray-700">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-gray-200">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400 dark:text-gray-500">{s.sku}</td>
                  <td className="px-4 py-3 text-red-600 dark:text-red-400 font-bold">{s.stock} {s.unit}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-gray-400">{s.minStock} {s.unit}</td>
                  <td className="px-4 py-3 text-red-600 dark:text-red-400 font-semibold">-{(s.minStock - s.stock).toFixed(1)} {s.unit}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-red">Reponer urgente</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
