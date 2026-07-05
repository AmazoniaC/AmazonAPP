import { useState, useMemo, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Plus, X, Search, FileText, CheckCircle, XCircle, Send,
  Clock, Eye, Pencil, Trash2, Download, ShoppingCart,
  TrendingUp, DollarSign, AlertCircle, RotateCcw, MessageCircle,
} from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { useStore } from '../store/useStore'
import { Quotation } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmDelete from '../components/ConfirmDelete'
import Pagination from '../components/Pagination'
import { formatCOP } from '../utils/currency'
import { nextOrderNumber } from '../utils/orderNumber'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { openWhatsApp, buildQuotationShare } from '../utils/whatsapp'
import { toast } from '../components/Toast'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  draft:'Borrador', sent:'Enviada', accepted:'Aceptada', rejected:'Rechazada', expired:'Vencida',
}
const STATUS_BADGE: Record<string, string> = {
  draft:'badge-gray', sent:'badge-blue', accepted:'badge-green', rejected:'badge-red', expired:'badge-yellow',
}
const STATUS_ICON: Record<string, typeof Clock> = {
  draft: Clock, sent: Send, accepted: CheckCircle, rejected: XCircle, expired: AlertCircle,
}

const daysUntil = (d: string): number => {
  // Parse as local noon so timezone shifts can't move it across midnight
  const target = new Date(d + 'T12:00:00').getTime()
  return Math.ceil((target - new Date().setHours(12, 0, 0, 0)) / 86400000)
}

const effectiveStatus = (q: Quotation): Quotation['status'] => {
  if ((q.status === 'draft' || q.status === 'sent') && daysUntil(q.validUntil) < 0) return 'expired'
  return q.status
}

const PAGE_SIZE = 15

// ─── NewQuotationModal ─────────────────────────────────────────────────────────
function NewQuotationModal({ quotation, onClose }: { quotation?: Quotation; onClose: () => void }) {
  const { customers, products, addQuotation, updateQuotation, quotations, priceLists, companySettings } = useStore()

  const defaultValidUntil = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]

  const [customerId, setCustomerId] = useState(quotation?.customerId ?? '')
  const [validUntil, setValidUntil] = useState(quotation?.validUntil ?? defaultValidUntil)
  const [delivery, setDelivery]     = useState(quotation?.deliveryEstimate ?? '')
  const [notes, setNotes]           = useState(quotation?.notes ?? '')
  const [internalNotes, setInternal] = useState(quotation?.internalNotes ?? '')
  const [items, setItems] = useState<{productId:string;variantId:string;product:string;qty:number;price:number;discount:number}[]>(
    quotation?.items.map(i => ({ productId:i.productId??'', variantId:i.variantId??'', product:i.product, qty:i.qty, price:i.price, discount:i.discount??0 })) ?? []
  )

  // Resolve customer discount
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

  const addItem    = () => setItems([...items, { productId:'', variantId:'', product:'', qty:1, price:0, discount: customerDiscount }])
  const removeItem = (i: number) => setItems(items.filter((_,j) => j !== i))
  const updateItem = (i: number, field: string, value: string | number) => {
    const copy = [...items]
    if (field === 'productId') {
      const p = products.find(x => x.id === value)
      copy[i] = { ...copy[i], productId: String(value), variantId:'', product: p?.name ?? '', price: p?.price ?? 0 }
    } else if (field === 'variantId') {
      const p = products.find(x => x.id === copy[i].productId)
      const v = p?.variants?.find(x => x.id === value)
      if (v) {
        const lbl = [v.attributes.color, v.attributes.acabado].filter(Boolean).join(' / ')
        copy[i] = { ...copy[i], variantId: String(value), price: v.priceOverride ?? p?.price ?? 0, product: `${p?.name ?? ''} — ${lbl}` }
      } else {
        const p2 = products.find(x => x.id === copy[i].productId)
        copy[i] = { ...copy[i], variantId:'', product: p2?.name ?? '', price: p2?.price ?? 0 }
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

  const taxRate   = companySettings.taxRate ?? 0.19
  const subtotal  = items.reduce((a, x) => a + x.qty * x.price, 0)
  const totalDisc = items.reduce((a, x) => a + (x.discount > 0 ? x.qty * x.price * x.discount / 100 : 0), 0)
  const afterDisc = subtotal - totalDisc
  const tax       = afterDisc * taxRate
  const total     = afterDisc + tax

  const handleSave = () => {
    const customer = customers.find(c => c.id === customerId)
    if (!customer || items.length === 0) return
    const q: Quotation = {
      id: quotation?.id ?? `q${Date.now()}`,
      quoteNumber: quotation?.quoteNumber ?? nextOrderNumber(quotations.map(x => x.quoteNumber), `COT-${new Date().getFullYear()}-`, 3),
      customer: customer.name, customerId,
      items: items.map(x => ({ product:x.product, productId:x.productId||undefined, variantId:x.variantId||undefined, qty:x.qty, price:x.price, discount: x.discount || undefined, subtotal: Math.round(calcItemSubtotal(x)) })),
      subtotal: Math.round(subtotal), discount: totalDisc > 0 ? Math.round(totalDisc) : undefined,
      tax: Math.round(tax), total: Math.round(total),
      status: quotation?.status ?? 'draft',
      validUntil, date: quotation?.date ?? new Date().toISOString().split('T')[0],
      deliveryEstimate: delivery || undefined,
      notes: notes || undefined, internalNotes: internalNotes || undefined,
      convertedToOrderId: quotation?.convertedToOrderId,
      priceListId: customer.priceListId || undefined,
    }
    if (quotation) updateQuotation(q)
    else addQuotation(q)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800">
          <h3 className="font-semibold text-slate-800 dark:text-white">
            {quotation ? `Editar ${quotation.quoteNumber}` : 'Nueva cotización'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Cliente *</label>
              <select className="input" value={customerId} onChange={e => handleCustomerChange(e.target.value)}>
                <option value="">-- Seleccionar cliente --</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` · ${c.company}` : ''}</option>)}
              </select>
              {customerDiscount > 0 && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Descuento automático: {customerDiscount}%</p>
              )}
            </div>
            <div>
              <label className="label">Válida hasta *</label>
              <input className="input" type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} />
            </div>
            <div>
              <label className="label">Tiempo estimado de entrega</label>
              <input className="input" value={delivery} onChange={e => setDelivery(e.target.value)} placeholder="ej. 15 días hábiles" />
            </div>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="label mb-0">Productos *</label>
              <button className="btn btn-secondary btn-sm" onClick={addItem}><Plus size={12} /> Agregar</button>
            </div>
            {items.length === 0 && (
              <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-gray-600 rounded-lg text-slate-400 text-sm">
                Agrega productos a la cotización
              </div>
            )}
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-start">
                <div className="col-span-4">
                  {i === 0 && <label className="label">Producto</label>}
                  <select className="input" value={item.productId} onChange={e => updateItem(i, 'productId', e.target.value)}>
                    <option value="">-- Producto --</option>
                    {products.filter(p => p.isActive).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  {(() => {
                    const p = products.find(x => x.id === item.productId)
                    const activeVars = p?.variants?.filter(v => v.isActive) ?? []
                    if (activeVars.length === 0) return null
                    return (
                      <select className="input mt-1 text-xs" value={item.variantId} onChange={e => updateItem(i, 'variantId', e.target.value)}>
                        <option value="">— Color / Acabado —</option>
                        {activeVars.map(v => {
                          const lbl = [v.attributes.color, v.attributes.acabado].filter(Boolean).join(' / ')
                          return <option key={v.id} value={v.id}>{lbl}{v.priceOverride ? ` · ${v.priceOverride.toLocaleString('es-CO')}` : ''}</option>
                        })}
                      </select>
                    )
                  })()}
                </div>
                <div className="col-span-1">
                  {i === 0 && <label className="label">Cant.</label>}
                  <input className="input" type="number" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', parseFloat(e.target.value)||1)} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Precio</label>}
                  <input className="input" type="number" min="0" step="1" value={item.price} onChange={e => updateItem(i, 'price', parseFloat(e.target.value)||0)} />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Dto. %</label>}
                  <input className="input" type="number" min="0" max="100" step="0.5" value={item.discount || ''}
                    onChange={e => updateItem(i, 'discount', parseFloat(e.target.value)||0)} placeholder="0" />
                </div>
                <div className="col-span-2">
                  {i === 0 && <label className="label">Subtotal</label>}
                  <p className="py-2 text-xs font-semibold text-slate-700 dark:text-gray-200">
                    {formatCOP(calcItemSubtotal(item))}
                    {item.discount > 0 && <span className="text-green-600 dark:text-green-400 ml-1">-{item.discount}%</span>}
                  </p>
                </div>
                <div className="col-span-1 pt-6">
                  <button onClick={() => removeItem(i)} className="w-8 h-9 flex items-center justify-center text-red-400 hover:text-red-600"><X size={14} /></button>
                </div>
              </div>
            ))}
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

          {/* Notes */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Notas para el cliente</label>
              <textarea className="input resize-none" rows={3} placeholder="Términos, condiciones, instrucciones de envío..."
                value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div>
              <label className="label">Notas internas</label>
              <textarea className="input resize-none" rows={3} placeholder="No visible en el PDF del cliente..."
                value={internalNotes} onChange={e => setInternal(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-5 sticky bottom-0 bg-white dark:bg-gray-800 border-t border-slate-100 dark:border-gray-700 pt-4">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}>
            {quotation ? 'Guardar cambios' : 'Crear cotización'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── QuotePrintTemplate ───────────────────────────────────────────────────────
function QuotePrintTemplate({ quotation, printRef }: { quotation: Quotation; printRef: React.RefObject<HTMLDivElement> }) {
  const { companySettings, customers } = useStore()
  const customerObj = customers.find(c => c.id === quotation.customerId)
  const co = companySettings

  return (
    <div ref={printRef} style={{ position:'absolute', left:'-9999px', top:0, background:'white' }}>
      <div style={{ fontFamily:'Arial,sans-serif', width:'794px', padding:'40px', background:'white', color:'#1a1a1a' }}>
        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'28px' }}>
          <div>
            {co.logo && <img src={co.logo} alt={co.companyName} style={{ height:'56px', objectFit:'contain', marginBottom:'8px', display:'block' }} />}
            <h1 style={{ margin:0, fontSize:'22px', fontWeight:'bold', color:'#1a472a' }}>{co.companyName}</h1>
            {co.slogan && <p style={{ margin:'2px 0', color:'#666', fontSize:'11px', fontStyle:'italic' }}>{co.slogan}</p>}
            {co.email && <p style={{ margin:'2px 0', color:'#444', fontSize:'11px' }}>{co.email}</p>}
            {co.phone && <p style={{ margin:'2px 0', color:'#444', fontSize:'11px' }}>{co.phone}</p>}
            {co.address && <p style={{ margin:'2px 0', color:'#444', fontSize:'11px' }}>{co.address}</p>}
          </div>
          <div style={{ textAlign:'right' }}>
            <h2 style={{ margin:0, fontSize:'26px', fontWeight:'bold', color:'#1a472a', textTransform:'uppercase', letterSpacing:'2px' }}>Cotización</h2>
            <p style={{ margin:'6px 0 2px', fontSize:'18px', fontWeight:'bold', color:'#333' }}>N° {quotation.quoteNumber}</p>
            <p style={{ margin:'2px 0', fontSize:'11px', color:'#666' }}>Fecha: {quotation.date}</p>
            <p style={{ margin:'2px 0', fontSize:'11px', color:'#e65100', fontWeight:'600' }}>Válida hasta: {quotation.validUntil}</p>
          </div>
        </div>

        <div style={{ borderTop:'3px solid #1a472a', marginBottom:'20px' }} />

        {/* Customer */}
        <div style={{ background:'#f5f9f5', border:'1px solid #c8e6c9', borderRadius:'8px', padding:'14px 16px', marginBottom:'20px' }}>
          <p style={{ margin:'0 0 4px', fontSize:'10px', color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:'600' }}>Cotización para:</p>
          <p style={{ margin:0, fontSize:'16px', fontWeight:'bold' }}>{quotation.customer}</p>
          {customerObj?.company && <p style={{ margin:'2px 0', color:'#555', fontSize:'12px' }}>{customerObj.company}</p>}
          {customerObj?.email && <p style={{ margin:'2px 0', color:'#666', fontSize:'11px' }}>{customerObj.email}</p>}
          {customerObj?.city && <p style={{ margin:'2px 0', color:'#666', fontSize:'11px' }}>{customerObj.city}</p>}
        </div>

        {/* Items table */}
        <table style={{ width:'100%', borderCollapse:'collapse', marginBottom:'20px' }}>
          <thead>
            <tr style={{ background:'#1a472a', color:'white' }}>
              {['#','Producto / Descripción','Cant.','Precio unit.','Dto.','Subtotal'].map((h,i) => (
                <th key={h} style={{ padding:'9px 10px', textAlign: i >= 2 ? 'right' : i === 0 ? 'center' : 'left', fontSize:'11px', fontWeight:'600', letterSpacing:'0.03em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {quotation.items.map((item, idx) => (
              <tr key={idx} style={{ background: idx%2 === 0 ? 'white' : '#f9fafb', borderBottom:'1px solid #e8e8e8' }}>
                <td style={{ padding:'9px 10px', fontSize:'12px', color:'#888', textAlign:'center' }}>{idx+1}</td>
                <td style={{ padding:'9px 10px', fontSize:'12px' }}>{item.product}</td>
                <td style={{ padding:'9px 10px', fontSize:'12px', textAlign:'right' }}>{item.qty}</td>
                <td style={{ padding:'9px 10px', fontSize:'12px', textAlign:'right' }}>{formatCOP(item.price)}</td>
                <td style={{ padding:'9px 10px', fontSize:'12px', textAlign:'right', color: item.discount ? '#16a34a' : '#888' }}>{item.discount ? `${item.discount}%` : '—'}</td>
                <td style={{ padding:'9px 10px', fontSize:'13px', textAlign:'right', fontWeight:'700' }}>{formatCOP(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'20px' }}>
          <div style={{ width:'260px' }}>
            {[[quotation.discount ? 'Subtotal bruto' : 'Subtotal', quotation.subtotal],
              ...(quotation.discount ? [['Descuento', -quotation.discount]] : []),
              [`IVA (${((companySettings.taxRate ?? 0.19) * 100).toFixed(0)}%)`, quotation.tax]].map(([l,v]) => (
              <div key={String(l)} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid #eee', fontSize:'12px' }}>
                <span style={{ color:'#666' }}>{l}</span><span>{formatCOP(Number(v))}</span>
              </div>
            ))}
            <div style={{ display:'flex', justifyContent:'space-between', padding:'10px 0 6px', borderTop:'3px solid #1a472a', marginTop:'4px', fontSize:'17px', fontWeight:'bold', color:'#1a472a' }}>
              <span>TOTAL</span><span>{formatCOP(quotation.total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery + Notes */}
        {(quotation.deliveryEstimate || quotation.notes) && (
          <div style={{ background:'#f0f9f0', border:'1px solid #c8e6c9', borderRadius:'8px', padding:'14px 16px', marginBottom:'20px' }}>
            {quotation.deliveryEstimate && (
              <p style={{ margin:'0 0 6px', fontSize:'12px' }}>
                <strong>Tiempo estimado de entrega:</strong> {quotation.deliveryEstimate}
              </p>
            )}
            {quotation.notes && (
              <p style={{ margin:0, fontSize:'12px' }}><strong>Notas:</strong> {quotation.notes}</p>
            )}
          </div>
        )}

        {/* Bank info */}
        {(co.bankName || co.bankAccountNumber) && (
          <div style={{ borderTop:'1px solid #ddd', paddingTop:'14px', marginBottom:'14px' }}>
            <p style={{ margin:'0 0 6px', fontSize:'10px', color:'#888', textTransform:'uppercase', letterSpacing:'0.08em', fontWeight:'600' }}>Datos bancarios</p>
            <p style={{ margin:'2px 0', fontSize:'11px' }}>{co.bankName} · {co.bankAccountType}</p>
            {co.bankAccountNumber && <p style={{ margin:'2px 0', fontSize:'11px' }}>N° {co.bankAccountNumber}</p>}
            {co.bankMessage && <p style={{ margin:'4px 0', fontSize:'11px', color:'#666', fontStyle:'italic' }}>{co.bankMessage}</p>}
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign:'center', color:'#aaa', fontSize:'10px', borderTop:'1px solid #eee', paddingTop:'10px' }}>
          Esta cotización es válida hasta el {quotation.validUntil} · {co.companyName}
          {co.email ? ` · ${co.email}` : ''}{co.whatsapp ? ` · WhatsApp: ${co.whatsapp}` : ''}
        </div>
      </div>
    </div>
  )
}

// ─── QuotationDrawer ──────────────────────────────────────────────────────────
function QuotationDrawer({ quotation, onClose, onEdit, onConvert, onDownload, converting }: {
  quotation: Quotation
  onClose: () => void
  onEdit: () => void
  onConvert: () => void
  onDownload: () => void
  converting: boolean
}) {
  const { updateQuotation, companySettings, customers, addActivity, opportunities, addOpportunity } = useStore()
  const [q, setQ] = useState(quotation)
  const detailTaxRate = companySettings.taxRate ?? 0.19
  const drawerCustomer = customers.find(c => c.id === q.customerId)

  const updateStatus = (status: Quotation['status']) => {
    const updated = { ...q, status }
    setQ(updated)
    updateQuotation(updated)

    // ── Cotización aceptada → auto-crear oportunidad si no existe ──
    if (status === 'accepted') {
      const existing = opportunities.find(op => op.quotationId === q.id)
      if (!existing) {
        const today = new Date().toISOString().split('T')[0]
        const inTwoWeeks = new Date()
        inTwoWeeks.setDate(inTwoWeeks.getDate() + 14)
        addOpportunity({
          id: `opp${Date.now()}`,
          title: `${q.quoteNumber} — ${q.customer}`,
          customerId: q.customerId,
          customer: q.customer,
          stage: 'negotiating',
          value: q.total,
          probability: 70,
          expectedClose: inTwoWeeks.toISOString().split('T')[0],
          quotationId: q.id,
          notes: `Oportunidad generada automáticamente al aceptar la cotización ${q.quoteNumber}.`,
          createdAt: today,
          updatedAt: today,
        })
        toast.success('Oportunidad creada en el Pipeline')
      }
    }
  }

  const handleSendWhatsApp = () => {
    if (!drawerCustomer?.phone) {
      toast.error('El cliente no tiene teléfono registrado')
      return
    }
    const itemsSummary = q.items.slice(0, 5).map(it => `• ${it.qty}× ${it.product}`).join('\n') +
                        (q.items.length > 5 ? `\n… y ${q.items.length - 5} ítems más` : '')
    const msg = buildQuotationShare({
      companyName: companySettings.companyName || 'Amazonia Concrete',
      customer: drawerCustomer.name.split(' ')[0],
      quoteNumber: q.quoteNumber,
      total: q.total,
      validUntil: q.validUntil,
      itemsSummary,
    })
    openWhatsApp(drawerCustomer.phone, msg)

    // If still draft, promote to "sent" and log a follow-up activity
    if (q.status === 'draft') {
      const updated = { ...q, status: 'sent' as const }
      setQ(updated)
      updateQuotation(updated)
    }
    // Schedule follow-up activity in 3 days
    const followUpDate = new Date()
    followUpDate.setDate(followUpDate.getDate() + 3)
    addActivity({
      id: `act${Date.now()}`,
      customerId: q.customerId,
      type: 'whatsapp',
      date: followUpDate.toISOString().split('T')[0],
      subject: `Seguimiento cotización ${q.quoteNumber}`,
      notes: `Revisar respuesta a la cotización enviada por WhatsApp.`,
      done: false,
      createdAt: new Date().toISOString(),
    })
    toast.success('Cotización enviada · seguimiento programado en 3 días')
  }

  const eff = effectiveStatus(q)
  const days = daysUntil(q.validUntil)
  const StatusIcon = STATUS_ICON[eff] ?? Clock

  const FLOW: { status: Quotation['status']; label: string }[] = [
    { status:'draft',    label:'Borrador' },
    { status:'sent',     label:'Enviada'  },
    { status:'accepted', label:'Aceptada' },
    { status:'rejected', label:'Rechazada'},
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-end z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 w-full max-w-md h-full sm:h-screen overflow-y-auto animate-slideIn"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-slate-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="text-xs font-mono text-slate-400 dark:text-gray-500">{q.quoteNumber}</p>
            <h3 className="font-semibold text-slate-800 dark:text-white">{q.customer}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm btn-secondary flex items-center gap-1" onClick={onEdit}>
              <Pencil size={12} /> Editar
            </button>
            <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className={`badge ${STATUS_BADGE[eff]} flex items-center gap-1`}>
                <StatusIcon size={11} />
                {STATUS_LABELS[eff]}
              </span>
              {eff === 'sent' && days >= 0 && (
                <span className="text-xs text-amber-600 dark:text-amber-400">Vence en {days}d</span>
              )}
              {eff === 'expired' && (
                <span className="text-xs text-red-600 dark:text-red-400">Venció hace {Math.abs(days)}d</span>
              )}
            </div>
            <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-2">Cambiar estado</p>
            <div className="flex gap-1.5 flex-wrap">
              {FLOW.map(f => (
                <button key={f.status}
                  onClick={() => updateStatus(f.status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                    q.status === f.status
                      ? 'bg-slate-700 dark:bg-gray-600 text-white border-slate-700 dark:border-gray-600'
                      : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label:'Fecha',           val: q.date },
              { label:'Válida hasta',    val: q.validUntil },
              { label:'Entrega estimada',val: q.deliveryEstimate ?? '—' },
              { label:'# Productos',     val: `${q.items.length} líneas` },
            ].map(({ label, val }) => (
              <div key={label} className="bg-slate-50 dark:bg-gray-700 rounded-xl p-3">
                <p className="text-xs text-slate-400 dark:text-gray-500">{label}</p>
                <p className="font-semibold text-slate-700 dark:text-gray-200 text-sm">{val}</p>
              </div>
            ))}
          </div>

          {/* Items */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-3">Productos</h4>
            <div className="space-y-0 divide-y divide-slate-100 dark:divide-gray-700 border border-slate-100 dark:border-gray-700 rounded-xl overflow-hidden">
              {q.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex-1 min-w-0 pr-3">
                    <p className="text-sm font-medium text-slate-700 dark:text-gray-200 truncate">{item.product}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-500">{item.qty} × {formatCOP(item.price)}</p>
                  </div>
                  <p className="font-bold text-slate-800 dark:text-white text-sm">{formatCOP(item.subtotal)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-gray-400">Subtotal</span>
              <span className="text-slate-700 dark:text-gray-200">{formatCOP(q.subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500 dark:text-gray-400">IVA ({(detailTaxRate * 100).toFixed(0)}%)</span>
              <span className="text-slate-700 dark:text-gray-200">{formatCOP(q.tax)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 dark:text-white text-lg pt-2 border-t border-slate-200 dark:border-gray-600">
              <span>Total</span><span>{formatCOP(q.total)}</span>
            </div>
          </div>

          {/* Notes */}
          {q.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl p-4">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Notas para el cliente</p>
              <p className="text-sm text-slate-600 dark:text-gray-300">{q.notes}</p>
            </div>
          )}
          {q.internalNotes && (
            <div className="bg-slate-50 dark:bg-gray-700 border border-slate-200 dark:border-gray-600 rounded-xl p-4">
              <p className="text-xs font-semibold text-slate-400 dark:text-gray-500 mb-1">Notas internas</p>
              <p className="text-sm text-slate-600 dark:text-gray-300">{q.internalNotes}</p>
            </div>
          )}

          {/* Converted notice */}
          {q.convertedToOrderId && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-emerald-700 dark:text-emerald-300 text-sm">Convertida a venta</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-mono">{q.convertedToOrderId}</p>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2">
            <button
              className="btn w-full flex items-center gap-2 justify-center text-white"
              style={{ background: 'linear-gradient(135deg, #25d366 0%, #128c7e 100%)' }}
              onClick={handleSendWhatsApp}
              disabled={!drawerCustomer?.phone}
              title={!drawerCustomer?.phone ? 'Cliente sin teléfono' : 'Compartir por WhatsApp'}
            >
              <MessageCircle size={15} /> Enviar por WhatsApp
            </button>
            <button className="btn btn-secondary w-full flex items-center gap-2 justify-center" onClick={onDownload}>
              <Download size={15} /> Descargar PDF
            </button>
            {eff === 'accepted' && !q.convertedToOrderId && (
              <button
                className="btn btn-primary w-full flex items-center gap-2 justify-center"
                onClick={onConvert}
                disabled={converting}
              >
                {converting ? (
                  <><RotateCcw size={15} className="animate-spin" /> Convirtiendo...</>
                ) : (
                  <><ShoppingCart size={15} /> Convertir a Venta</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Quotations page ─────────────────────────────────────────────────────
export default function Quotations() {
  const { quotations, deleteQuotation, convertQuotation } = useStore()
  const { canEdit, canDelete } = usePermissions()
  const [searchParams, setSearchParams] = useSearchParams()

  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState<'all' | Quotation['status'] | 'expired'>('all')
  const [page, setPage]             = useState(1)
  const [showModal, setShowModal]   = useState(false)
  const [editTarget, setEditTarget] = useState<Quotation | undefined>()
  const [drawer, setDrawer]         = useState<Quotation | null>(null)
  const [deleteTarget, setDelTarget]= useState<Quotation | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [converting, setConverting] = useState(false)
  const [printQ, setPrintQ]         = useState<Quotation | null>(null)
  const printRef = useRef<HTMLDivElement>(null)

  // Deep link: ?open=ID → auto-open the quotation drawer
  useEffect(() => {
    const id = searchParams.get('open')
    if (!id || quotations.length === 0) return
    const q = quotations.find((q) => q.id === id)
    if (q) {
      setDrawer(q)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, quotations, setSearchParams])

  // ── PDF generation ──────────────────────────────────────────────────────────
  const handleDownload = async (q: Quotation) => {
    setPrintQ(q)
    await new Promise(r => setTimeout(r, 120))
    if (!printRef.current) return
    const canvas = await html2canvas(printRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const pdf = new jsPDF('p', 'mm', 'a4')
    const imgData = canvas.toDataURL('image/png')
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(`${q.quoteNumber}.pdf`)
    setPrintQ(null)
  }

  const handleConvert = async (id: string) => {
    setConverting(true)
    await convertQuotation(id)
    setConverting(false)
    setDrawer(null)
  }

  // ── Computed lists ──────────────────────────────────────────────────────────
  const enriched = useMemo(() =>
    quotations.map(q => ({ ...q, _eff: effectiveStatus(q), _days: daysUntil(q.validUntil) })),
    [quotations]
  )

  const filtered = useMemo(() => {
    return enriched.filter(q => {
      const matchS = q.customer.toLowerCase().includes(search.toLowerCase()) ||
                     q.quoteNumber.toLowerCase().includes(search.toLowerCase())
      const matchSt = statusFilter === 'all' || q._eff === statusFilter
      return matchS && matchSt
    })
  }, [enriched, search, statusFilter])

  const paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const total       = quotations.length
  const pipeline    = enriched.filter(q => q._eff === 'sent' || q._eff === 'accepted').reduce((a,q)=>a+q.total,0)
  const acceptedN   = enriched.filter(q => q._eff === 'accepted').length
  const closedN     = enriched.filter(q => q._eff === 'accepted' || q._eff === 'rejected').length
  const acceptRate  = closedN > 0 ? Math.round(acceptedN / closedN * 100) : 0
  const expiringSoon = enriched.filter(q => q._eff === 'sent' && q._days >= 0 && q._days <= 7).length

  const statusCounts: Record<string, number> = {}
  for (const q of enriched) { statusCounts[q._eff] = (statusCounts[q._eff] ?? 0) + 1 }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileText}
        title="Cotizaciones"
        subtitle="Propuestas comerciales y seguimiento"
        accent="rgba(139, 92, 246, 0.20)"
        actions={canEdit('sales') ? (
          <button className="btn btn-sm btn-primary" onClick={() => { setEditTarget(undefined); setShowModal(true) }}>
            <Plus size={14} /> Nueva cotización
          </button>
        ) : undefined}
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard icon={FileText}    label="Total cotizaciones" value={total}              accent="#2563eb" hint={`${statusCounts['sent']??0} enviadas`} />
        <StatCard icon={DollarSign}  label="Pipeline activo"    value={formatCOP(pipeline)} accent="#8b5cf6" hint="En propuestas abiertas" />
        <StatCard icon={TrendingUp}  label="Tasa de cierre"     value={`${acceptRate}%`}    accent="#10b981" hint={`${acceptedN} aceptadas`} />
        <StatCard icon={AlertCircle} label="Vencen pronto"      value={expiringSoon}        accent={expiringSoon > 0 ? '#f59e0b' : '#94a3b8'} hint="Próximos 7 días" />
      </div>

      {/* Filters */}
      <div className="card p-4 space-y-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9" placeholder="Buscar por N° cotización o cliente..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            ['all','Todas'],
            ['draft',`Borrador${statusCounts['draft'] ? ` (${statusCounts['draft']})` : ''}`],
            ['sent',`Enviadas${statusCounts['sent'] ? ` (${statusCounts['sent']})` : ''}`],
            ['accepted',`Aceptadas${statusCounts['accepted'] ? ` (${statusCounts['accepted']})` : ''}`],
            ['rejected',`Rechazadas${statusCounts['rejected'] ? ` (${statusCounts['rejected']})` : ''}`],
            ['expired',`Vencidas${statusCounts['expired'] ? ` (${statusCounts['expired']})` : ''}`],
          ].map(([v,l]) => (
            <button key={v} onClick={() => { setStatus(v as typeof statusFilter); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === v
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
              }`}>{l}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
              {['Cotización','Cliente','Productos','Valor total','Estado','Válida hasta','Acciones'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map(q => {
              const eff = q._eff
              const days = q._days
              return (
                <tr key={q.id} className="table-row cursor-pointer" onClick={() => setDrawer(q)}>
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">{q.quoteNumber}</p>
                    <p className="text-xs text-slate-400 dark:text-gray-500">{q.date}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-gray-200">{q.customer}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-gray-300 text-xs">
                    {q.items.length} {q.items.length === 1 ? 'producto' : 'productos'}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{formatCOP(q.total)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_BADGE[eff]} flex items-center gap-1 w-fit`}>
                      {STATUS_LABELS[eff]}
                    </span>
                    {q.convertedToOrderId && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">→ Venta creada</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-slate-600 dark:text-gray-300">{q.validUntil}</p>
                    {(eff === 'sent' || eff === 'draft') && days >= 0 && days <= 7 && (
                      <p className="text-xs text-amber-600 dark:text-amber-400">⚡ {days}d restantes</p>
                    )}
                    {eff === 'expired' && (
                      <p className="text-xs text-red-500">Vencida</p>
                    )}
                  </td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1.5">
                      <button className="btn btn-sm btn-secondary p-1.5" title="Ver detalle" onClick={() => setDrawer(q)}>
                        <Eye size={12} />
                      </button>
                      {canEdit('sales') && (
                        <button className="btn btn-sm btn-secondary p-1.5" title="Editar" onClick={() => { setEditTarget(q); setShowModal(true) }}>
                          <Pencil size={12} />
                        </button>
                      )}
                      <button className="btn btn-sm btn-secondary p-1.5" title="Descargar PDF" onClick={() => handleDownload(q)}>
                        <Download size={12} />
                      </button>
                      {eff === 'accepted' && !q.convertedToOrderId && (
                        <button className="btn btn-sm bg-emerald-600 text-white hover:bg-emerald-700 p-1.5 border-0" title="Convertir a venta"
                          onClick={async () => { setConverting(true); await convertQuotation(q.id); setConverting(false) }}>
                          <ShoppingCart size={12} />
                        </button>
                      )}
                      {canDelete('sales') && (
                        <button className="btn btn-sm p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                          onClick={() => setDelTarget(q)}>
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

        {filtered.length === 0 && (
          <div className="text-center py-14 text-slate-400 dark:text-gray-600">
            <FileText size={36} className="mx-auto mb-3 opacity-30" />
            <p>No se encontraron cotizaciones</p>
            {canEdit('sales') && (
              <button className="btn btn-primary mt-4" onClick={() => { setEditTarget(undefined); setShowModal(true) }}>
                <Plus size={14} /> Crear primera cotización
              </button>
            )}
          </div>
        )}
        <div className="px-4 pb-2">
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      {/* Modals / Drawers */}
      {showModal && (
        <NewQuotationModal quotation={editTarget} onClose={() => { setShowModal(false); setEditTarget(undefined) }} />
      )}
      {drawer && (
        <QuotationDrawer
          quotation={drawer}
          onClose={() => setDrawer(null)}
          onEdit={() => { setEditTarget(drawer); setShowModal(true); setDrawer(null) }}
          onConvert={() => handleConvert(drawer.id)}
          onDownload={() => handleDownload(drawer)}
          converting={converting}
        />
      )}
      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.quoteNumber}
          loading={deleting}
          onCancel={() => setDelTarget(null)}
          onConfirm={async () => {
            setDeleting(true)
            try {
              await deleteQuotation(deleteTarget.id)
              setDelTarget(null)
            } finally {
              setDeleting(false)
            }
          }}
        />
      )}

      {/* Hidden PDF print template */}
      {printQ && <QuotePrintTemplate quotation={printQ} printRef={printRef} />}
    </div>
  )
}
