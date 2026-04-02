import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, Package, Users, ShoppingCart, FileText, Truck, RotateCcw, Building2, Factory, Kanban } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'

interface SearchResult {
  id: string
  type: 'product' | 'customer' | 'order' | 'quotation' | 'supplier' | 'return' | 'production' | 'opportunity'
  title: string
  subtitle: string
  link: string
}

const TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  product:     { icon: Package,      color: 'text-blue-500',    label: 'Producto' },
  customer:    { icon: Users,        color: 'text-emerald-500', label: 'Cliente' },
  order:       { icon: ShoppingCart, color: 'text-purple-500',  label: 'Orden' },
  quotation:   { icon: FileText,     color: 'text-amber-500',   label: 'Cotización' },
  supplier:    { icon: Building2,    color: 'text-indigo-500',  label: 'Proveedor' },
  return:      { icon: RotateCcw,    color: 'text-rose-500',    label: 'Devolución' },
  production:  { icon: Factory,      color: 'text-orange-500',  label: 'Producción' },
  opportunity: { icon: Kanban,       color: 'text-cyan-500',    label: 'Oportunidad' },
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const { products, customers, saleOrders, quotations, suppliers, returns, productionOrders, opportunities } = useStore()

  // Keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(o => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setSelected(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  const results = useMemo((): SearchResult[] => {
    const q = query.toLowerCase().trim()
    if (!q || q.length < 2) return []

    const r: SearchResult[] = []
    const limit = 5

    // Products
    let count = 0
    for (const p of products) {
      if (count >= limit) break
      if (p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q)) {
        r.push({ id: p.id, type: 'product', title: p.name, subtitle: `${p.sku} · ${p.category}`, link: '/catalog' })
        count++
      }
    }

    // Customers
    count = 0
    for (const c of customers) {
      if (count >= limit) break
      if (c.name.toLowerCase().includes(q) || c.company?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q) || c.code?.toLowerCase().includes(q)) {
        r.push({ id: c.id, type: 'customer', title: c.name, subtitle: `${c.code} · ${c.city}`, link: `/crm/${c.id}` })
        count++
      }
    }

    // Sale orders
    count = 0
    for (const o of saleOrders) {
      if (count >= limit) break
      if (o.orderNumber?.toLowerCase().includes(q) || o.customer.toLowerCase().includes(q)) {
        r.push({ id: o.id, type: 'order', title: o.orderNumber, subtitle: `${o.customer} · ${o.status}`, link: '/sales' })
        count++
      }
    }

    // Quotations
    count = 0
    for (const qt of quotations) {
      if (count >= limit) break
      if (qt.quoteNumber?.toLowerCase().includes(q) || qt.customer.toLowerCase().includes(q)) {
        r.push({ id: qt.id, type: 'quotation', title: qt.quoteNumber, subtitle: `${qt.customer} · ${qt.status}`, link: '/quotations' })
        count++
      }
    }

    // Suppliers
    count = 0
    for (const s of suppliers) {
      if (count >= limit) break
      if (s.name.toLowerCase().includes(q) || s.contactName?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q)) {
        r.push({ id: s.id, type: 'supplier', title: s.name, subtitle: s.category || s.city || '', link: '/suppliers' })
        count++
      }
    }

    // Returns
    count = 0
    for (const ret of returns) {
      if (count >= limit) break
      if (ret.returnNumber?.toLowerCase().includes(q) || ret.customer?.toLowerCase().includes(q)) {
        r.push({ id: ret.id, type: 'return', title: ret.returnNumber || ret.id, subtitle: `${ret.customer} · ${ret.status}`, link: '/returns' })
        count++
      }
    }

    // Production orders
    count = 0
    for (const po of productionOrders) {
      if (count >= limit) break
      if (po.orderNumber?.toLowerCase().includes(q) || po.product?.toLowerCase().includes(q)) {
        r.push({ id: po.id, type: 'production', title: po.orderNumber, subtitle: `${po.product} · ${po.status}`, link: '/production' })
        count++
      }
    }

    // Opportunities
    count = 0
    for (const op of opportunities) {
      if (count >= limit) break
      if (op.title?.toLowerCase().includes(q) || op.customer?.toLowerCase().includes(q)) {
        r.push({ id: op.id, type: 'opportunity', title: op.title, subtitle: `${op.customer} · ${op.stage}`, link: '/pipeline' })
        count++
      }
    }

    return r
  }, [query, products, customers, saleOrders, quotations, suppliers, returns, productionOrders, opportunities])

  const handleSelect = (result: SearchResult) => {
    navigate(result.link)
    setOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) { handleSelect(results[selected]) }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-gray-700 overflow-hidden animate-fadeIn" onClick={e => e.stopPropagation()}>
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-gray-700">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-slate-800 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 outline-none"
            placeholder="Buscar productos, clientes, órdenes, proveedores..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(0) }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 dark:bg-gray-700 text-[10px] font-mono text-slate-400 dark:text-gray-500 border border-slate-200 dark:border-gray-600">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.length >= 2 && results.length === 0 && (
            <div className="py-10 text-center text-sm text-slate-400 dark:text-gray-500">
              No se encontraron resultados para "{query}"
            </div>
          )}

          {query.length < 2 && (
            <div className="py-8 text-center">
              <p className="text-sm text-slate-400 dark:text-gray-500">Escribe al menos 2 caracteres para buscar</p>
              <p className="text-xs text-slate-300 dark:text-gray-600 mt-1">Busca en productos, clientes, órdenes, proveedores y más</p>
            </div>
          )}

          {results.map((r, i) => {
            const meta = TYPE_META[r.type]
            const Icon = meta.icon
            return (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setSelected(i)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                  selected === i ? 'bg-amazonia-50 dark:bg-amazonia-900/20' : 'hover:bg-slate-50 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  selected === i ? 'bg-amazonia-100 dark:bg-amazonia-900/40' : 'bg-slate-100 dark:bg-gray-700'
                }`}>
                  <Icon size={14} className={meta.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 dark:text-gray-200 truncate">{r.title}</p>
                  <p className="text-xs text-slate-400 dark:text-gray-500 truncate">{r.subtitle}</p>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                  selected === i ? 'bg-amazonia-200 dark:bg-amazonia-800 text-amazonia-700 dark:text-amazonia-300' : 'bg-slate-100 dark:bg-gray-700 text-slate-500 dark:text-gray-400'
                }`}>
                  {meta.label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 dark:border-gray-700 flex items-center gap-4 text-[10px] text-slate-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-gray-700 font-mono border border-slate-200 dark:border-gray-600">↑↓</kbd> navegar
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-gray-700 font-mono border border-slate-200 dark:border-gray-600">↵</kbd> abrir
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-gray-700 font-mono border border-slate-200 dark:border-gray-600">esc</kbd> cerrar
          </span>
        </div>
      </div>
    </div>
  )
}
