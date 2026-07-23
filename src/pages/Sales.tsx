import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Plus, Search, X, ShoppingCart, DollarSign, Clock, CheckCircle, Trash2, Printer, FileText, Mail, Send, Copy, MessageCircle, Receipt, Loader2, Truck, Banknote, AlertCircle } from 'lucide-react'
import { useStore } from '../store/useStore'
import { SaleOrder } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmDelete from '../components/ConfirmDelete'
import Pagination from '../components/Pagination'
import FacturaModal from '../components/InvoiceModal'
import { formatCOP } from '../utils/currency'
import { nextOrderNumber } from '../utils/orderNumber'
import { toast } from '../components/Toast'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { openWhatsApp, buildOrderConfirmation, buildPaymentReminder, getBankInfo } from '../utils/whatsapp'
import { PaymentModal } from './Payments'

const STATUS_BADGE: Record<string, string> = {
  pending:'badge-yellow', confirmed:'badge-blue', processing:'badge-blue',
  delivered:'badge-green', cancelled:'badge-red',
}
const PAY_BADGE: Record<string, string> = {
  pending:'badge-yellow', partial:'badge-yellow', paid:'badge-green', refunded:'badge-red',
}
const STATUS_LABELS: Record<string, string> = {
  pending:'Pendiente', confirmed:'Confirmado', processing:'En proceso',
  delivered:'Entregado', cancelled:'Cancelado',
}
const PAY_LABELS: Record<string, string> = {
  pending:'Sin pagar', partial:'Pago parcial', paid:'Pagado', refunded:'Reembolsado',
}

function NewSaleModal({ onClose }: { onClose: () => void }) {
  const { customers, products, addSaleOrder, saleOrders, companySettings, priceLists } = useStore()
  const [customerId, setCustomerId] = useState('')
  const [payMethod, setPayMethod]   = useState('Efectivo')
  const [items, setItems]           = useState<{productId:string;variantId:string;product:string;qty:number;price:number;discount:number}[]>([])
  const [delDate, setDelDate]       = useState('')
  const [notes, setNotes]           = useState('')

  // Resolve customer discount (from price list or customer default)
  const selectedCustomer = customers.find((c) => c.id === customerId)
  const customerDiscount = (() => {
    if (!selectedCustomer) return 0
    if (selectedCustomer.defaultDiscount) return selectedCustomer.defaultDiscount
    if (selectedCustomer.priceListId) {
      const pl = priceLists.find((p) => p.id === selectedCustomer.priceListId)
      return pl?.discountPercent ?? 0
    }
    return 0
  })()

  // Auto-apply customer discount when customer changes
  const handleCustomerChange = (cid: string) => {
    setCustomerId(cid)
    const cust = customers.find((c) => c.id === cid)
    if (cust) {
      let disc = 0
      if (cust.defaultDiscount) disc = cust.defaultDiscount
      else if (cust.priceListId) {
        const pl = priceLists.find((p) => p.id === cust.priceListId)
        disc = pl?.discountPercent ?? 0
      }
      if (disc > 0) setItems((prev) => prev.map((it) => ({ ...it, discount: disc })))
    }
  }

  const addItem = () => setItems([...items, { productId:'', variantId:'', product:'', qty:1, price:0, discount: customerDiscount }])
  const removeItem = (i: number) => setItems(items.filter((_,j) => j !== i))
  const updateItem = (i: number, field: string, value: string | number) => {
    const copy = [...items]
    if (field === 'productId') {
      const p = products.find((x) => x.id === value)
      copy[i] = { ...copy[i], productId: String(value), variantId: '', product: p?.name ?? '', price: p?.price ?? 0 }
    } else if (field === 'variantId') {
      const p = products.find((x) => x.id === copy[i].productId)
      const v = p?.variants?.find((x) => x.id === value)
      if (v) {
        const label = [v.attributes.color, v.attributes.acabado].filter(Boolean).join(' / ')
        copy[i] = { ...copy[i], variantId: String(value), price: v.priceOverride ?? p?.price ?? 0, product: `${p?.name ?? ''} — ${label}` }
      } else {
        const p2 = products.find((x) => x.id === copy[i].productId)
        copy[i] = { ...copy[i], variantId: '', product: p2?.name ?? '', price: p2?.price ?? 0 }
      }
    } else {
      copy[i] = { ...copy[i], [field]: value }
    }
    setItems(copy)
  }

  const calcItemSubtotal = (item: typeof items[0]) => {
    const raw = item.qty * item.price
    return item.discount > 0 ? raw * (1 - item.discount / 100) : raw
  }

  const taxRate    = companySettings.taxRate ?? 0.19
  const subtotal   = items.reduce((a, x) => a + x.qty * x.price, 0)
  const totalDisc  = items.reduce((a, x) => a + (x.discount > 0 ? x.qty * x.price * x.discount / 100 : 0), 0)
  const afterDisc  = subtotal - totalDisc
  const tax        = afterDisc * taxRate
  const total      = afterDisc + tax

  // ── Detect over-sold lines (qty > available stock) ──────────────────────
  const overSold = items.map((it, idx) => {
    const p = products.find((x) => x.id === it.productId)
    if (!p) return null
    const v = p.variants?.find((x) => x.id === it.variantId)
    const activeVars = p.variants?.filter(x => x.isActive) ?? []
    if (activeVars.length > 0 && !it.variantId) return null // still choosing variant
    const stock = v ? v.stock : p.stock
    return it.qty > stock ? { idx, product: p.name, qty: it.qty, stock } : null
  }).filter(Boolean) as { idx: number; product: string; qty: number; stock: number }[]
  const hasOverSold = overSold.length > 0

  const handleSave = () => {
    const customer = customers.find((c) => c.id === customerId)
    if (!customer || items.length === 0) return
    if (hasOverSold) {
      const line = overSold[0]
      toast.error(`Stock insuficiente para ${line.product} (disponibles: ${line.stock})`)
      return
    }
    const order: SaleOrder = {
      id: `so${Date.now()}`, orderNumber: nextOrderNumber(saleOrders.map(o => o.orderNumber), `${companySettings.invoicePrefix || 'VTA'}-${new Date().getFullYear()}-`),
      customer: customer.name, customerId,
      items: items.map((x) => ({ product:x.product, productId:x.productId||undefined, variantId:x.variantId||undefined, qty:x.qty, price:x.price, discount: x.discount || undefined, subtotal: Math.round(calcItemSubtotal(x)) })),
      subtotal: Math.round(subtotal),
      discount: totalDisc > 0 ? Math.round(totalDisc) : undefined,
      tax: Math.round(tax),
      total: Math.round(total),
      status: 'confirmed', paymentStatus: 'pending',
      paymentMethod: payMethod,
      date: new Date().toISOString().split('T')[0],
      deliveryDate: delDate || undefined,
      notes: notes || undefined,
      priceListId: customer.priceListId || undefined,
    }
    addSaleOrder(order)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-slate-800 dark:text-white">Nueva venta</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente *</label>
              <select className="input" value={customerId} onChange={(e) => handleCustomerChange(e.target.value)}>
                <option value="">-- Seleccionar --</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>)}
              </select>
              {customerDiscount > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Descuento automático: {customerDiscount}%</p>
              )}
            </div>
            <div>
              <label className="label">Método de pago</label>
              <select className="input" value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>
                {['Efectivo','Tarjeta','Transferencia','Cheque','Nequi','Daviplata'].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Fecha de entrega</label>
              <input className="input" type="date" value={delDate} onChange={(e) => setDelDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Notas</label>
              <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Comentarios..." />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Productos *</label>
              <button className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={12} /> Agregar</button>
            </div>
            {items.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-gray-600 rounded-lg text-slate-400 dark:text-gray-500 text-sm">
                Agrega productos a la venta
              </div>
            )}
            {items.map((item, i) => {
              // ── Live stock for this line ──────────────────────────────
              const line_p = products.find((x) => x.id === item.productId)
              const line_var = line_p?.variants?.find((v) => v.id === item.variantId)
              const line_stock = line_var ? line_var.stock : (line_p?.stock ?? 0)
              const line_hasProduct = Boolean(line_p)
              const line_needsVariant = (line_p?.variants?.filter(v => v.isActive)?.length ?? 0) > 0 && !item.variantId
              const line_shortfall = line_hasProduct && !line_needsVariant && item.qty > line_stock
              const line_lowWarn   = line_hasProduct && !line_needsVariant && !line_shortfall && item.qty > line_stock * 0.75 && line_stock > 0

              return (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-end">
                <div className="col-span-4">
                  {i === 0 && <label className="label">Producto</label>}
                  <select className="input" value={item.productId}
                    onChange={(e) => updateItem(i, 'productId', e.target.value)}>
                    <option value="">-- Producto --</option>
                    {products.filter((p) => p.isActive).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {(() => {
                    const p = products.find((x) => x.id === item.productId)
                    const activeVars = p?.variants?.filter(v => v.isActive) ?? []
                    if (activeVars.length === 0) return null
                    return (
                      <select className="input mt-1 text-xs" value={item.variantId}
                        onChange={(e) => updateItem(i, 'variantId', e.target.value)}>
                        <option value="">— Color / Acabado —</option>
                        {activeVars.map(v => {
                          const lbl = [v.attributes.color, v.attributes.acabado].filter(Boolean).join(' / ')
                          return <option key={v.id} value={v.id}>{lbl} · {v.stock} disp.{v.priceOverride ? ` · $${v.priceOverride.toLocaleString('es-CO')}` : ''}</option>
                        })}
                      </select>
                    )
                  })()}
                  {line_hasProduct && !line_needsVariant && (
                    <p className={`text-[11px] mt-1 font-medium tabular-nums ${
                      line_shortfall
                        ? 'text-red-600 dark:text-red-400'
                        : line_lowWarn
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {line_shortfall
                        ? `⚠ Solo hay ${line_stock} disponibles`
                        : line_lowWarn
                          ? `${line_stock} disponibles — stock justo`
                          : `${line_stock} disponibles`}
                    </p>
                  )}
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="label">Cant.</label>}
                  <input className={`input ${line_shortfall ? 'ring-2 ring-red-400/60 border-red-400' : ''}`} type="number" min="1" value={item.qty}
                    onChange={(e) => updateItem(i, 'qty', parseFloat(e.target.value) || 1)} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Precio</label>}
                  <input className="input" type="number" min="0" step="1" value={item.price}
                    onChange={(e) => updateItem(i, 'price', parseFloat(e.target.value) || 0)} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Dto. %</label>}
                  <input className="input" type="number" min="0" max="100" step="0.5" value={item.discount || ''}
                    onChange={(e) => updateItem(i, 'discount', parseFloat(e.target.value) || 0)}
                    placeholder="0" />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Subtotal</label>}
                  <p className="py-2 text-xs font-semibold text-slate-700 dark:text-gray-200">
                    {formatCOP(calcItemSubtotal(item))}
                    {item.discount > 0 && <span className="text-green-600 dark:text-green-400 ml-1">-{item.discount}%</span>}
                  </p>
                </div>
                <div className="col-span-1">
                  <button onClick={() => removeItem(i)} className="w-8 h-9 flex items-center justify-center text-red-400 hover:text-red-600">
                    <X size={14} />
                  </button>
                </div>
              </div>
              )
            })}
          </div>

          {/* Totals */}
          {items.length > 0 && (
            <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-4 space-y-2 animate-fadeIn">
              <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-gray-400">Subtotal bruto</span><span className="dark:text-white">{formatCOP(subtotal)}</span></div>
              {totalDisc > 0 && (
                <div className="flex justify-between text-sm"><span className="text-green-600 dark:text-green-400">Descuento</span><span className="text-green-600 dark:text-green-400">-{formatCOP(totalDisc)}</span></div>
              )}
              <div className="flex justify-between text-sm"><span className="text-slate-500 dark:text-gray-400">IVA ({(taxRate * 100).toFixed(0)}%)</span><span className="dark:text-white">{formatCOP(tax)}</span></div>
              <div className="flex justify-between font-bold text-slate-800 dark:text-white text-base pt-2 border-t border-slate-200 dark:border-gray-600">
                <span>Total</span><span>{formatCOP(total)}</span>
              </div>
            </div>
          )}

          {hasOverSold && (
            <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50/70 dark:bg-red-900/20 px-4 py-3 text-sm text-red-800 dark:text-red-300 flex items-start gap-2 animate-scaleIn">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold">Stock insuficiente</p>
                <ul className="text-xs mt-1 space-y-0.5">
                  {overSold.map((o) => (
                    <li key={o.idx}>· {o.product}: piden <b>{o.qty}</b>, disponibles <b>{o.stock}</b></li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-5 sticky bottom-0 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 pt-4">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={handleSave} disabled={hasOverSold}>
            {hasOverSold ? 'Ajusta cantidades' : 'Confirmar venta'}
          </button>
        </div>
      </div>
    </div>
  )
}

function OrderDetail({ order, onClose, onInvoice }: { order: SaleOrder; onClose: () => void; onInvoice: () => void }) {
  const { updateSaleOrder, customers, companySettings } = useStore()
  const customer = customers.find(c => c.id === order.customerId)
  const [localOrder, setLocalOrder] = useState(order)

  const update = (patch: Partial<SaleOrder>) => {
    const updated = { ...localOrder, ...patch }
    setLocalOrder(updated)
    updateSaleOrder(updated)
  }

  const ORDER_FLOW: SaleOrder['status'][] = ['pending','confirmed','processing','delivered']

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">{localOrder.orderNumber}</h3>
            <p className="text-xs text-slate-500 dark:text-gray-400">{localOrder.customer}</p>
          </div>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">

          {/* Order status flow */}
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Estado de la orden</p>
            <div className="flex gap-1.5 flex-wrap">
              {ORDER_FLOW.map((s) => (
                <button key={s}
                  onClick={() => update({ status: s })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    localOrder.status === s
                      ? `${STATUS_BADGE[s] === 'badge-green' ? 'bg-emerald-600' : STATUS_BADGE[s] === 'badge-blue' ? 'bg-blue-600' : 'bg-amber-500'} text-white border-transparent`
                      : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
                  }`}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          {/* Payment status */}
          <div>
            <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Estado de pago</p>
            <div className="flex gap-1.5">
              {(['pending','partial','paid'] as const).map((ps) => (
                <button key={ps}
                  onClick={() => update({ paymentStatus: ps })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    localOrder.paymentStatus === ps
                      ? ps === 'paid' ? 'bg-emerald-600 text-white border-transparent'
                        : ps === 'partial' ? 'bg-amber-500 text-white border-transparent'
                        : 'bg-slate-600 text-white border-transparent'
                      : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
                  }`}>
                  {PAY_LABELS[ps]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm border-t border-slate-100 dark:border-gray-700 pt-3">
            <div><p className="text-slate-400 dark:text-gray-500 text-xs">Método pago</p><p className="font-medium dark:text-gray-200">{localOrder.paymentMethod}</p></div>
            <div><p className="text-slate-400 dark:text-gray-500 text-xs">Fecha</p><p className="font-medium dark:text-gray-200">{localOrder.date}</p></div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-500 dark:text-gray-400 mb-2">PRODUCTOS</p>
            {localOrder.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-slate-50 dark:border-gray-700">
                <span className="text-slate-700 dark:text-gray-300">{item.product}</span>
                <span className="text-slate-500 dark:text-gray-400">{item.qty} × {formatCOP(item.price)}</span>
                <span className="font-semibold text-slate-800 dark:text-white">{formatCOP(item.subtotal)}</span>
              </div>
            ))}
          </div>
          <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-3 space-y-1.5 text-sm">
            <div className="flex justify-between text-slate-500 dark:text-gray-400"><span>Subtotal</span><span>{formatCOP(localOrder.subtotal)}</span></div>
            <div className="flex justify-between text-slate-500 dark:text-gray-400"><span>IVA</span><span>{formatCOP(localOrder.tax)}</span></div>
            <div className="flex justify-between font-bold text-slate-800 dark:text-white pt-1.5 border-t border-slate-200 dark:border-gray-600">
              <span>Total</span><span>{formatCOP(localOrder.total)}</span>
            </div>
          </div>
          <button className="btn btn-secondary w-full flex items-center justify-center gap-2" onClick={onInvoice}>
            <FileText size={15} /> Ver Factura
          </button>

          {/* WhatsApp Actions */}
          {customer?.phone && (
            <div className="flex gap-2">
              <button
                className="flex-1 btn flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                onClick={() => openWhatsApp(customer.phone, buildOrderConfirmation({
                  companyName: companySettings.companyName,
                  customer: localOrder.customer,
                  phone: customer.phone,
                  orderNumber: localOrder.orderNumber,
                  date: localOrder.date,
                  total: localOrder.total,
                  paymentMethod: localOrder.paymentMethod,
                  items: localOrder.items,
                  deliveryDate: localOrder.deliveryDate,
                  bankInfo: getBankInfo(companySettings),
                }))}>
                <MessageCircle size={15} /> Confirmar pedido
              </button>
              {localOrder.paymentStatus !== 'paid' && (
                <button
                  className="flex-1 btn flex items-center justify-center gap-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                  onClick={() => openWhatsApp(customer.phone, buildPaymentReminder({
                    companyName: companySettings.companyName,
                    customer: localOrder.customer,
                    orderNumber: localOrder.orderNumber,
                    date: localOrder.date,
                    total: localOrder.total,
                    paymentStatus: localOrder.paymentStatus,
                    bankInfo: getBankInfo(companySettings),
                  }))}>
                  <DollarSign size={15} /> Cobrar pago
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Invoice / Factura Modal ───────────────────────────────────────────────────
function InvoiceModal({ order, onClose }: { order: SaleOrder; onClose: () => void }) {
  const { customers, companySettings } = useStore()
  const customer = customers.find((c) => c.id === order.customerId)

  // Email modal state
  const [emailModal, setEmailModal]   = useState(false)
  const [emailTo, setEmailTo]         = useState(customer?.email ?? '')
  const [emailSending, setEmailSending] = useState(false)
  const [emailResult, setEmailResult] = useState<{ ok: boolean; text: string } | null>(null)

  const generatePdfBase64 = async (): Promise<string | null> => {
    const el = document.getElementById('invoice-print-content')
    if (!el) return null
    try {
      // scale 1.5 + JPEG 0.88 gives good quality at ~1/5 the size of scale:2 PNG
      const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff' })
      const imgData = canvas.toDataURL('image/jpeg', 0.88)
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = pdf.internal.pageSize.getWidth()
      const pageH = pdf.internal.pageSize.getHeight()
      const ratio = canvas.height / canvas.width
      const imgH = pageW * ratio
      if (imgH <= pageH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pageW, imgH)
      } else {
        // Multi-page: split into A4-height slices
        const slicePx = Math.floor(canvas.width * (pageH / pageW))
        let y = 0
        while (y < canvas.height) {
          const h = Math.min(slicePx, canvas.height - y)
          const slice = document.createElement('canvas')
          slice.width  = canvas.width
          slice.height = h
          slice.getContext('2d')!.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
          if (y > 0) pdf.addPage()
          pdf.addImage(slice.toDataURL('image/jpeg', 0.88), 'JPEG', 0, 0, pageW, h * (pageW / canvas.width))
          y += h
        }
      }
      return pdf.output('datauristring').split(',')[1]
    } catch {
      return null
    }
  }

  const handleSendEmail = async () => {
    if (!emailTo.trim()) return
    setEmailSending(true)
    setEmailResult(null)
    try {
      const pdfBase64 = await generatePdfBase64()
      const userHeader: Record<string, string> = (() => { try { const r = localStorage.getItem('erp_auth'); if (!r) return {}; const u = JSON.parse(r); return u.token ? { 'Authorization': `Bearer ${u.token}` } as Record<string, string> : {} } catch { return {} } })()
      const res = await fetch('/api/email/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...userHeader },
        body: JSON.stringify({
          order: { ...order, items: order.items },
          customer: {
            name:  customer?.name  ?? order.customer,
            email: customer?.email ?? '',
            phone: customer?.phone ?? '',
            city:  customer?.city  ?? '',
          },
          recipientEmail: emailTo.trim(),
          pdfBase64,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        // If the PDF couldn't be generated the invoice still goes out, but the
        // recipient gets no attachment — tell the user so it isn't a silent loss.
        const base = data.message ?? 'Factura enviada con éxito'
        setEmailResult({
          ok: true,
          text: pdfBase64
            ? base
            : `${base} — ⚠ sin adjunto PDF (no se pudo generar). El correo se envió solo con el contenido HTML.`,
        })
      } else {
        setEmailResult({ ok: false, text: data.error ?? 'Error al enviar' })
      }
    } catch {
      setEmailResult({ ok: false, text: 'Error de conexión con el servidor' })
    } finally {
      setEmailSending(false)
    }
  }

  // Extract numeric invoice number from order number (e.g. "VTA-2024-007" → "007")
  const invoiceNum = (order.orderNumber ?? '').split('-').pop() ?? order.orderNumber ?? '001'

  const fmt = (n: number) =>
    '$ ' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const handlePrint = () => window.print()

  // Concrete-grey gradient for header/footer
  const concreteBg = 'linear-gradient(120deg,#888 0%,#b0aea8 20%,#ccc9c4 45%,#b5b2ad 70%,#909090 100%)'
  const darkConcreteBg = 'linear-gradient(120deg,#2c2c2c 0%,#454545 30%,#3a3a3a 60%,#252525 100%)'

  return (
    <>
      {/* Print-only style — visibility trick so modal chrome is hidden */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print-content,
          #invoice-print-content * { visibility: visible; }
          #invoice-print-content {
            position: fixed;
            top: 0; left: 0;
            width: 100%;
            background: white;
          }
          .invoice-no-print { display: none !important; }
          @page { margin: 0; size: A4 portrait; }
        }
      `}</style>

      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
        <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">

          {/* Toolbar — hidden when printing */}
          <div className="invoice-no-print flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-slate-200 flex-shrink-0">
            <h3 className="font-semibold text-slate-800 text-sm">Vista previa — Factura {order.orderNumber}</h3>
            <div className="flex items-center gap-2">
              {/* WhatsApp button — opens wa.me with pre-filled invoice message */}
              {(() => {
                const phone = (customer?.phone ?? '').replace(/\D/g, '')
                const msg = encodeURIComponent(
                  `Hola ${customer?.name ?? order.customer}, adjunto la factura *${order.orderNumber}* por un valor de *${fmt(order.total)}*. Gracias por tu compra 🙏`
                )
                return phone ? (
                  <a href={`https://wa.me/${phone}?text=${msg}`} target="_blank" rel="noreferrer"
                    className="invoice-no-print flex items-center gap-2 px-3 py-2 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-medium rounded-lg transition-colors">
                    <MessageCircle size={15} /> WhatsApp
                  </a>
                ) : null
              })()}
              <button onClick={() => { setEmailModal(true); setEmailResult(null) }}
                className="invoice-no-print flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Mail size={15} /> Correo
              </button>
              <button onClick={handlePrint}
                className="invoice-no-print flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                <Printer size={15} /> Imprimir
              </button>
              <button onClick={onClose} className="invoice-no-print text-slate-400 hover:text-slate-600 ml-1">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* ── Email modal ── */}
          {emailModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Enviar factura por correo</h3>
                    <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">{order.orderNumber}</p>
                  </div>
                  <button onClick={() => { setEmailModal(false); setEmailResult(null) }}
                    className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-gray-200">
                    <X size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="label">Correo del destinatario</label>
                    <input className="input" type="email"
                      placeholder="cliente@email.com"
                      value={emailTo}
                      onChange={(e) => setEmailTo(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !emailSending) handleSendEmail() }} />
                  </div>

                  {emailResult && (
                    <div className={`text-sm px-3 py-2.5 rounded-lg border ${emailResult.ok
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                      {emailResult.text}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-1">
                    <button onClick={() => { setEmailModal(false); setEmailResult(null) }}
                      className="btn btn-secondary" disabled={emailSending}>
                      {emailResult?.ok ? 'Cerrar' : 'Cancelar'}
                    </button>
                    {!emailResult?.ok && (
                      <button onClick={handleSendEmail} disabled={emailSending || !emailTo.trim()}
                        className="btn btn-primary disabled:opacity-60 flex items-center gap-2">
                        {emailSending
                          ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generando PDF y enviando...</>
                          : <><Send size={14} /> Enviar factura</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Invoice body — scrollable in modal, fills page when printing */}
          <div className="overflow-y-auto flex-1">
            <div id="invoice-print-content" style={{ background: 'white', fontFamily: 'Arial, Helvetica, sans-serif', color: '#111' }}>

              {/* ── HEADER (concrete texture) ─────────────────── */}
              <div style={{ background: concreteBg, padding: '40px 48px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '56px', fontWeight: '900', color: '#1B4332', letterSpacing: '-1px', lineHeight: 1, textTransform: 'uppercase' }}>
                    FACTURA
                  </div>
                  <div style={{ marginTop: '12px', background: 'white', border: '1.5px solid #888', padding: '5px 20px', display: 'inline-block' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#222' }}>Nº: {invoiceNum}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {companySettings.logo ? (
                    <img src={companySettings.logo} alt="Logo"
                      style={{ height: '130px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.25))' }} />
                  ) : (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '34px', fontWeight: '900', color: '#1B4332', letterSpacing: '2px' }}>AMAZONIA</div>
                      <div style={{ fontSize: '11px', letterSpacing: '5px', color: '#444', borderTop: '1px solid #666', paddingTop: '4px', marginTop: '3px' }}>CONCRETE</div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── CLIENT + COMPANY INFO ─────────────────────── */}
              <div style={{ padding: '36px 48px', display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
                {/* Left: client */}
                <div style={{ flex: 1, borderRight: '1.5px solid #ccc', paddingRight: '40px' }}>
                  <p style={{ fontWeight: '800', fontSize: '12px', marginBottom: '14px', letterSpacing: '0.5px', color: '#1B4332' }}>
                    DATOS DEL CLIENTE
                  </p>
                  <p style={{ fontSize: '14px', margin: '5px 0', color: '#1B4332' }}>{customer?.name ?? order.customer}</p>
                  {customer?.email  && <p style={{ fontSize: '13px', margin: '5px 0', color: '#1B4332' }}>{customer.email}</p>}
                  {customer?.phone  && <p style={{ fontSize: '13px', margin: '5px 0', color: '#1B4332' }}>{customer.phone}</p>}
                  {customer?.city   && <p style={{ fontSize: '13px', margin: '5px 0', color: '#1B4332' }}>{customer.city}</p>}
                </div>
                {/* Right: company */}
                <div style={{ flex: 1, paddingLeft: '40px', textAlign: 'right' }}>
                  <p style={{ fontWeight: '800', fontSize: '15px', marginBottom: '12px', color: '#111', textTransform: 'uppercase' }}>
                    {companySettings.companyName}
                  </p>
                  {companySettings.email           && <p style={{ fontSize: '13px', margin: '5px 0', color: '#555' }}>{companySettings.email}</p>}
                  {companySettings.instagramHandle && <p style={{ fontSize: '13px', margin: '5px 0', color: '#555' }}>{companySettings.instagramHandle}</p>}
                </div>
              </div>

              {/* ── ITEMS TABLE ───────────────────────────────── */}
              <div style={{ padding: '32px 48px 16px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #333' }}>
                  <thead>
                    <tr style={{ borderBottom: '1.5px solid #333', backgroundColor: '#f5f5f5' }}>
                      <th style={{ textAlign: 'left', padding: '12px 18px', fontSize: '14px', fontWeight: '700', borderRight: '1px solid #bbb' }}>Detalle</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '14px', fontWeight: '700', borderRight: '1px solid #bbb', width: '100px' }}>Cantidad</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '14px', fontWeight: '700', borderRight: '1px solid #bbb', width: '140px' }}>Precio</th>
                      <th style={{ textAlign: 'center', padding: '12px 16px', fontSize: '14px', fontWeight: '700', width: '140px' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: '13px 18px', fontSize: '13px', borderRight: '1px solid #eee', borderBottom: '1px solid #f0f0f0' }}>{item.product}</td>
                        <td style={{ padding: '13px 16px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #eee', borderBottom: '1px solid #f0f0f0' }}>
                          {String(item.qty).padStart(2, '0')}
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'center', fontSize: '13px', borderRight: '1px solid #eee', borderBottom: '1px solid #f0f0f0' }}>
                          {fmt(item.price)}
                        </td>
                        <td style={{ padding: '13px 16px', textAlign: 'center', fontSize: '13px', borderBottom: '1px solid #f0f0f0' }}>
                          {fmt(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                    {/* empty rows to fill space like the design */}
                    {order.items.length < 4 && Array.from({ length: 4 - order.items.length }).map((_, i) => (
                      <tr key={`empty-${i}`}>
                        <td style={{ padding: '13px 18px', borderRight: '1px solid #eee', borderBottom: '1px solid #f0f0f0' }}>&nbsp;</td>
                        <td style={{ borderRight: '1px solid #eee', borderBottom: '1px solid #f0f0f0' }} />
                        <td style={{ borderRight: '1px solid #eee', borderBottom: '1px solid #f0f0f0' }} />
                        <td style={{ borderBottom: '1px solid #f0f0f0' }} />
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── DIVIDER ───────────────────────────────────── */}
              <div style={{ margin: '8px 48px', borderTop: '1.5px solid #999' }} />

              {/* ── TOTAL ─────────────────────────────────────── */}
              <div style={{ padding: '24px 48px', display: 'flex', justifyContent: 'flex-end' }}>
                <table style={{ border: '2px solid #222', minWidth: '300px' }}>
                  <tbody>
                    <tr>
                      <td style={{ padding: '13px 24px', fontWeight: '800', fontSize: '15px', letterSpacing: '1.5px' }}>TOTAL</td>
                      <td style={{ padding: '13px 24px', textAlign: 'right', fontWeight: '700', fontSize: '15px', borderLeft: '1px solid #ccc' }}>
                        {fmt(order.total)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ── BANK INFO ─────────────────────────────────── */}
              <div style={{ padding: '16px 48px 32px' }}>
                {(companySettings.bankKey || companySettings.bankAccountNumber) && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '14px' }}>
                    {/* Bancolombia pill */}
                    <div style={{ background: '#fcd116', border: '1px solid #e8b800', borderRadius: '4px', padding: '5px 10px', fontWeight: '800', fontSize: '13px', color: '#333', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span>{companySettings.bankName || 'Bancolombia'}</span>
                      <span>🇨🇴</span>
                    </div>
                    <div style={{ fontSize: '13px', lineHeight: '1.9', color: '#333' }}>
                      {companySettings.bankKey           && <div>Llave: {companySettings.bankKey}</div>}
                      {companySettings.bankAccountNumber && <div>{companySettings.bankAccountType || 'Cuenta Ahorros'}: {companySettings.bankAccountNumber}</div>}
                    </div>
                  </div>
                )}
                {companySettings.bankMessage && (
                  <div style={{ border: '1.5px solid #222', display: 'inline-block', padding: '7px 18px', fontSize: '13px', color: '#111' }}>
                    {companySettings.bankMessage}
                  </div>
                )}
              </div>

              {/* ── FOOTER (dark concrete) ────────────────────── */}
              <div style={{ background: darkConcreteBg, padding: '24px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ color: 'white', fontSize: '13px', lineHeight: '2.2' }}>
                  {companySettings.tiktok && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: '#010101', borderRadius: '50%', width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>♪</span>
                      <span>{companySettings.tiktok}</span>
                    </div>
                  )}
                  {companySettings.whatsapp && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: '#25D366', borderRadius: '50%', width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>✆</span>
                      <span>{companySettings.whatsapp}</span>
                    </div>
                  )}
                  {companySettings.instagram && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: 'linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)', borderRadius: '50%', width: '26px', height: '26px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>◉</span>
                      <span>{companySettings.instagram}</span>
                    </div>
                  )}
                  {/* fallback if no social links configured */}
                  {!companySettings.tiktok && !companySettings.whatsapp && !companySettings.instagram && (
                    <span style={{ color: '#aaa', fontSize: '12px' }}>Configure las redes sociales en Configuración → Empresa</span>
                  )}
                </div>
                <div style={{ borderLeft: '3px solid #666', paddingLeft: '20px', marginLeft: '20px' }}>
                  <div style={{ color: '#ddd', fontSize: '16px', fontStyle: 'italic', fontWeight: '300', letterSpacing: '0.5px', textAlign: 'right' }}>
                    {companySettings.slogan || 'Belleza natural en concreto'}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default function Sales() {
  const { saleOrders, deleteSaleOrder, addSaleOrder, updateSaleOrder, generateInvoice, dispatches, companySettings, customers } = useStore()
  const navigate = useNavigate()
  const { canDelete } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('all')
  const [showModal, setShowModal]   = useState(false)
  const [detail, setDetail]         = useState<SaleOrder | null>(null)
  const [invoice, setInvoice]       = useState<SaleOrder | null>(null)
  const [invoiceOrder, setInvoiceOrder] = useState<SaleOrder | null>(null)
  const [generatingInv, setGeneratingInv] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SaleOrder | null>(null)
  const [deleting, setDeleting]         = useState(false)
  const [payTarget, setPayTarget]       = useState<SaleOrder | null>(null)
  const [duplicated, setDuplicated]     = useState<string | null>(null)
  const [dateFrom, setDateFrom]         = useState('')
  const [dateTo, setDateTo]             = useState('')
  const [payFilter, setPayFilter]       = useState('all')
  const [page, setPage]                 = useState(1)
  const PAGE_SIZE = 20

  // Open invoice modal (generate if not yet generated)
  const handleInvoice = async (order: SaleOrder) => {
    setGeneratingInv(order.id)
    try {
      const updated = await generateInvoice(order.id)
      setInvoiceOrder(updated)
    } finally {
      setGeneratingInv(null)
    }
  }

  // Deep link: ?open=ID → auto-open the sale order detail panel
  useEffect(() => {
    const id = searchParams.get('open')
    if (!id || saleOrders.length === 0) return
    const order = saleOrders.find((o) => o.id === id)
    if (order) {
      setDetail(order)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, saleOrders, setSearchParams])

  const handleDuplicate = (o: SaleOrder) => {
    const newOrder: SaleOrder = {
      ...o,
      id: `so${Date.now()}`,
      orderNumber: nextOrderNumber(saleOrders.map(x => x.orderNumber), `${companySettings.invoicePrefix || 'VTA'}-${new Date().getFullYear()}-`),
      date: new Date().toISOString().split('T')[0],
      status: 'pending',
      paymentStatus: 'pending',
    }
    addSaleOrder(newOrder)
    setDuplicated(newOrder.orderNumber)
    setTimeout(() => setDuplicated(null), 3000)
  }

  const filtered = saleOrders.filter((o) => {
    const q = search.toLowerCase()
    const matchSearch = (o.orderNumber ?? '').toLowerCase().includes(q) ||
                        (o.customer ?? '').toLowerCase().includes(q) ||
                        (o.invoiceNumber ?? '').toLowerCase().includes(q)
    const matchStatus = statusFilter === 'all' || o.status === statusFilter
    const matchPay    = payFilter === 'all' || o.paymentStatus === payFilter
    const matchFrom   = !dateFrom || o.date >= dateFrom
    const matchTo     = !dateTo   || o.date <= dateTo
    return matchSearch && matchStatus && matchPay && matchFrom && matchTo
  })

  const hasActiveFilters = dateFrom || dateTo || payFilter !== 'all' || statusFilter !== 'all'
  const clearFilters = () => { setDateFrom(''); setDateTo(''); setPayFilter('all'); setStatus('all'); setSearch(''); setPage(1) }
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalRevenue = saleOrders.reduce((a,o) => a + o.total, 0)
  const pendingPay   = saleOrders.filter((o) => o.paymentStatus === 'pending').reduce((a,o) => a + o.total, 0)
  const todayOrders  = saleOrders.length

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShoppingCart}
        title="Ventas"
        subtitle="Gestión de órdenes de venta"
        accent="rgba(37, 99, 235, 0.20)"
        actions={
          <button className="btn btn-sm btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={14} /> Nueva venta
          </button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3 stagger-children">
        <StatCard icon={DollarSign}  label="Ingresos totales" value={formatCOP(totalRevenue)} accent="#2563eb" hint={`${saleOrders.length} órdenes`} />
        <StatCard icon={Clock}       label="Por cobrar"       value={formatCOP(pendingPay)}   accent="#f59e0b" hint={pendingPay > 0 ? 'Pagos pendientes' : 'Todo cobrado'} />
        <StatCard icon={CheckCircle} label="Órdenes totales"  value={String(todayOrders)}     accent="#0d9488" />
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar orden o cliente..." value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          {/* Date range */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">Desde</label>
            <input type="date" className="input text-xs py-1.5 w-36" value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)} />
            <label className="text-xs text-slate-500 dark:text-gray-400 whitespace-nowrap">Hasta</label>
            <input type="date" className="input text-xs py-1.5 w-36" value={dateTo}
              onChange={(e) => setDateTo(e.target.value)} />
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters}
              className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-gray-600 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors whitespace-nowrap">
              <X size={12} className="inline mr-1" />Limpiar
            </button>
          )}
        </div>
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[10px] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-wider mr-1">Estado</span>
          {[['all','Todas'],['pending','Pendiente'],['confirmed','Confirmado'],['processing','En proceso'],['delivered','Entregado']].map(([v,l]) => (
            <button key={v} onClick={() => setStatus(v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                statusFilter === v
                  ? 'bg-blue-600 text-white shadow-soft ring-1 ring-inset ring-blue-500/30'
                  : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-600 hover:border-blue-400 hover:text-blue-700'
              }`}>{l}</button>
          ))}
          <span className="text-[10px] text-slate-500 dark:text-gray-500 font-bold uppercase tracking-wider ml-3 mr-1">Pago</span>
          {[['all','Todos'],['pending','Pendiente'],['paid','Pagado'],['partial','Parcial']].map(([v,l]) => (
            <button key={v} onClick={() => setPayFilter(v)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                payFilter === v
                  ? 'bg-emerald-600 text-white shadow-soft ring-1 ring-inset ring-emerald-500/30'
                  : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border border-slate-200 dark:border-gray-600 hover:border-emerald-400 hover:text-emerald-700'
              }`}>{l}</button>
          ))}
          {filtered.length !== saleOrders.length && (
            <span className="ml-auto text-[11px] text-slate-500 dark:text-gray-400 font-medium">
              {filtered.length} de {saleOrders.length}
            </span>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
              {['Orden','Cliente','Productos','Total','Pago','Estado pedido','Método','Fecha','Acciones'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((o) => (
              <tr key={o.id} className="table-row cursor-pointer" onClick={() => setDetail(o)}>
                <td className="px-4 py-3">
                  <div className="font-mono text-xs text-blue-600 dark:text-blue-400">{o.orderNumber}</div>
                  {o.invoiceNumber && (
                    <div className="font-mono text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">{o.invoiceNumber}</div>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-gray-200">{o.customer}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-gray-400 text-xs">{o.items.length} ítem(s)</td>
                <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{formatCOP(o.total)}</td>
                <td className="px-4 py-3"><span className={`badge ${PAY_BADGE[o.paymentStatus] ?? 'badge-yellow'}`}>{PAY_LABELS[o.paymentStatus] ?? o.paymentStatus}</span></td>
                <td className="px-4 py-3"><span className={`badge ${STATUS_BADGE[o.status] ?? 'badge-yellow'}`}>{STATUS_LABELS[o.status] ?? o.status}</span></td>
                <td className="px-4 py-3 text-slate-500 dark:text-gray-400 text-xs">{o.paymentMethod}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-gray-400 text-xs">{o.date}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button className="btn btn-sm btn-secondary" onClick={() => setDetail(o)}>Ver</button>
                    {o.paymentStatus !== 'paid' && (
                      <button className="btn btn-sm flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                        onClick={() => updateSaleOrder({ ...o, paymentStatus: 'paid' })} title="Marcar como pagado">
                        <CheckCircle size={12} />
                      </button>
                    )}
                    <button className="btn btn-sm flex items-center gap-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
                      onClick={() => setInvoice(o)} title="Ver recibo de pedido">
                      <FileText size={12} />
                    </button>
                    <button
                      className={`btn btn-sm flex items-center gap-1.5 ${
                        o.invoiceNumber
                          ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-400'
                          : 'text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-900/20 border border-violet-200 dark:border-violet-800'
                      }`}
                      onClick={() => handleInvoice(o)}
                      disabled={generatingInv === o.id}
                      title={o.invoiceNumber ? `Factura ${o.invoiceNumber}` : 'Generar factura'}
                    >
                      {generatingInv === o.id
                        ? <Loader2 size={12} className="animate-spin" />
                        : <Receipt size={12} />
                      }
                      {o.invoiceNumber ? o.invoiceNumber.split('-').pop() : 'FAC'}
                    </button>
                    {/* Despachar: show when order is confirmed or processing */}
                    {['confirmed','processing'].includes(o.status) && (() => {
                      const hasDispatch = dispatches.some((d) => d.saleOrderId === o.id)
                      return (
                        <button
                          className={`btn btn-sm flex items-center gap-1 ${
                            hasDispatch
                              ? 'text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-400'
                              : 'text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                          }`}
                          title={hasDispatch ? 'Ver despacho' : 'Crear despacho'}
                          onClick={() => navigate(`/dispatch`)}
                        >
                          <Truck size={12} />
                        </button>
                      )
                    })()}
                    {(() => {
                      const cust = customers.find(c => c.id === o.customerId)
                      if (!cust?.phone) return null
                      return o.paymentStatus !== 'paid' ? (
                        <button className="btn btn-sm flex items-center gap-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-200 dark:border-green-800"
                          onClick={() => openWhatsApp(cust.phone, buildPaymentReminder({
                            companyName: companySettings.companyName, customer: o.customer,
                            orderNumber: o.orderNumber, date: o.date, total: o.total,
                            paymentStatus: o.paymentStatus, bankInfo: getBankInfo(companySettings),
                          }))} title="Cobrar por WhatsApp">
                          <MessageCircle size={12} />
                        </button>
                      ) : (
                        <button className="btn btn-sm flex items-center gap-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 border border-green-200 dark:border-green-800"
                          onClick={() => openWhatsApp(cust.phone, buildOrderConfirmation({
                            companyName: companySettings.companyName, customer: o.customer,
                            phone: cust.phone, orderNumber: o.orderNumber, date: o.date,
                            total: o.total, paymentMethod: o.paymentMethod, items: o.items,
                            deliveryDate: o.deliveryDate, bankInfo: getBankInfo(companySettings),
                          }))} title="Enviar confirmación por WhatsApp">
                          <MessageCircle size={12} />
                        </button>
                      )
                    })()}
                    {o.paymentStatus !== 'paid' && (
                      <button className="btn btn-sm flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800"
                        onClick={() => setPayTarget(o)} title="Registrar pago">
                        <Banknote size={12} />
                      </button>
                    )}
                    <button className="btn btn-sm flex items-center gap-1 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-amber-200 dark:border-amber-800"
                      onClick={() => handleDuplicate(o)} title="Duplicar orden">
                      <Copy size={12} />
                    </button>
                    {canDelete('sales') && (
                      <button className="btn btn-sm flex items-center gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                        onClick={() => setDeleteTarget(o)}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400 dark:text-gray-600">
            <ShoppingCart size={36} className="mx-auto mb-3 opacity-30" />
            <p>No se encontraron ventas</p>
          </div>
        )}
        <div className="px-4 pb-2">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      {/* Duplicate success toast */}
      {duplicated && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-amber-600 text-white px-4 py-3 rounded-xl shadow-2xl animate-fadeIn">
          <Copy size={16} />
          <span className="text-sm font-medium">Orden duplicada: <strong>{duplicated}</strong></span>
        </div>
      )}

      {showModal && <NewSaleModal onClose={() => setShowModal(false)} />}
      {detail    && <OrderDetail order={detail} onClose={() => setDetail(null)} onInvoice={() => { setInvoice(detail); setDetail(null) }} />}
      {invoice   && <InvoiceModal order={invoice} onClose={() => setInvoice(null)} />}
      {invoiceOrder && <FacturaModal order={invoiceOrder} settings={companySettings} onClose={() => setInvoiceOrder(null)} />}
      {payTarget && (
        <PaymentModal
          onClose={() => setPayTarget(null)}
          prefill={{
            saleOrderId: payTarget.id,
            saleOrderNumber: payTarget.orderNumber,
            customer: payTarget.customer,
            customerId: payTarget.customerId,
            remaining: payTarget.total,
          }}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          name={`${deleteTarget.orderNumber} — ${deleteTarget.customer}`}
          loading={deleting}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deleteSaleOrder(deleteTarget.id)
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
