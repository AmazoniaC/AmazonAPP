import { useEffect, useRef, useState } from 'react'
import { X, Printer, Download, Share2, FileCheck, Loader2 } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import QRCode from 'qrcode'
import { SaleOrder } from '../data/mockData'
import { CompanySettings } from '../store/useStore'
import { formatCOP } from '../utils/currency'

interface Props {
  order:    SaleOrder
  settings: CompanySettings
  onClose:  () => void
}

// ── QR content builder ────────────────────────────────────────────────────────
function buildQRText(order: SaleOrder, s: CompanySettings): string {
  const lines = [
    `PAGO — ${s.companyName}`,
    order.invoiceNumber ? `Factura: ${order.invoiceNumber}` : `Pedido: ${order.orderNumber}`,
    `Valor: ${formatCOP(order.total)}`,
    s.bankName           ? `Banco: ${s.bankName}`                 : '',
    s.bankAccountType    ? `Tipo: ${s.bankAccountType}`           : '',
    s.bankAccountNumber  ? `Cuenta: ${s.bankAccountNumber}`       : '',
    s.whatsapp           ? `WhatsApp: ${s.whatsapp}`              : '',
  ].filter(Boolean)
  return lines.join('\n')
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(d?: string) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendiente', paid: 'Pagado', partial: 'Pago parcial', refunded: 'Reembolsado',
}
const STATUS_COLOR: Record<string, string> = {
  pending: '#b45309', paid: '#15803d', partial: '#1d4ed8', refunded: '#9f1239',
}

// ── Invoice body (rendered for both view and PDF) ─────────────────────────────
function InvoiceBody({ order, settings, qrDataUrl }: {
  order: SaleOrder; settings: CompanySettings; qrDataUrl: string
}) {
  const logo = settings.logo
  const hasBank = settings.bankName || settings.bankAccountNumber

  return (
    <div className="bg-white text-slate-800" style={{ fontFamily: 'Arial, sans-serif', width: '100%' }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, borderBottom: '3px solid #166534', paddingBottom: 20 }}>
        {/* Company */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {logo && <img src={logo} alt="" style={{ height: 64, width: 64, objectFit: 'contain', borderRadius: 8 }} />}
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#14532d', lineHeight: 1.2 }}>{settings.companyName}</div>
            {settings.slogan && <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>{settings.slogan}</div>}
            {settings.address && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{settings.address}</div>}
            {settings.phone   && <div style={{ fontSize: 11, color: '#64748b' }}>Tel: {settings.phone}</div>}
            {settings.email   && <div style={{ fontSize: 11, color: '#64748b' }}>{settings.email}</div>}
          </div>
        </div>
        {/* Invoice info */}
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#14532d' }}>FACTURA</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#166534', marginTop: 4 }}>
            {order.invoiceNumber || order.orderNumber}
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>
            <div><strong>Fecha:</strong> {fmt(order.invoiceDate || order.date)}</div>
            {order.deliveryDate && <div><strong>Entrega:</strong> {fmt(order.deliveryDate)}</div>}
            <div style={{
              marginTop: 6, padding: '4px 10px', borderRadius: 6,
              backgroundColor: STATUS_COLOR[order.paymentStatus] ?? '#64748b',
              color: 'white', fontSize: 11, fontWeight: 700, display: 'inline-block',
            }}>
              {STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
            </div>
          </div>
        </div>
      </div>

      {/* ── Customer ── */}
      <div style={{ backgroundColor: '#f0fdf4', borderRadius: 8, padding: '12px 16px', marginBottom: 20, border: '1px solid #bbf7d0' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>Facturado a</div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#14532d' }}>{order.customer}</div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 2 }}>
          Método de pago: <strong>{order.paymentMethod}</strong>
        </div>
      </div>

      {/* ── Items table ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20, fontSize: 12 }}>
        <thead>
          <tr style={{ backgroundColor: '#166534', color: 'white' }}>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: 700, borderRadius: '6px 0 0 6px' }}>#</th>
            <th style={{ padding: '8px 10px', textAlign: 'left',  fontWeight: 700 }}>Producto / Descripción</th>
            <th style={{ padding: '8px 10px', textAlign: 'center',fontWeight: 700 }}>Cant.</th>
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>Precio unit.</th>
            {order.items.some(it => it.discount) && <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>Dto.</th>}
            <th style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, borderRadius: '0 6px 6px 0' }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, i) => (
            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#f8fafc' : 'white', borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{i + 1}</td>
              <td style={{ padding: '8px 10px', fontWeight: 600, color: '#1e293b' }}>{item.product}</td>
              <td style={{ padding: '8px 10px', textAlign: 'center', color: '#475569' }}>{item.qty}</td>
              <td style={{ padding: '8px 10px', textAlign: 'right', color: '#475569' }}>{formatCOP(item.price)}</td>
              {order.items.some(it => it.discount) && <td style={{ padding: '8px 10px', textAlign: 'right', color: item.discount ? '#16a34a' : '#94a3b8' }}>{item.discount ? `${item.discount}%` : '—'}</td>}
              <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, color: '#14532d' }}>{formatCOP(item.subtotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals + QR ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
        {/* QR + Bank info */}
        <div style={{ flex: 1 }}>
          {hasBank && (
            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Datos de pago</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {qrDataUrl && (
                  <img src={qrDataUrl} alt="QR pago" style={{ width: 88, height: 88, borderRadius: 6, border: '1px solid #e2e8f0' }} />
                )}
                <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.7 }}>
                  {settings.bankName         && <div><strong>Banco:</strong> {settings.bankName}</div>}
                  {settings.bankAccountType  && <div><strong>Tipo:</strong> {settings.bankAccountType}</div>}
                  {settings.bankAccountNumber && <div><strong>No. cuenta:</strong> {settings.bankAccountNumber}</div>}
                  {settings.bankKey          && <div><strong>Nequi/Daviplata:</strong> {settings.bankKey}</div>}
                  {settings.bankMessage      && <div style={{ color: '#64748b', fontStyle: 'italic', marginTop: 4 }}>{settings.bankMessage}</div>}
                </div>
              </div>
              {qrDataUrl && <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 6, textAlign: 'center' }}>Escanea el QR para ver los datos de pago</div>}
            </div>
          )}
          {order.notes && (
            <div style={{ marginTop: 10, fontSize: 11, color: '#64748b', fontStyle: 'italic' }}>
              <strong>Notas:</strong> {order.notes}
            </div>
          )}
        </div>

        {/* Totals box */}
        <div style={{ minWidth: 220 }}>
          <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
            {[
              { label: order.discount ? 'Subtotal bruto' : 'Subtotal', value: order.subtotal },
              ...(order.discount ? [{ label: 'Descuento', value: -order.discount }] : []),
              { label: `IVA (${(((settings.taxRate ?? 0.19)) * 100).toFixed(0)}%)`, value: order.tax },
            ].map((r) => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 14px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>{r.label}</span>
                <span style={{ fontWeight: 600 }}>{formatCOP(r.value)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#166534', color: 'white' }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>TOTAL</span>
              <span style={{ fontWeight: 900, fontSize: 16 }}>{formatCOP(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Footer ── */}
      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 10, color: '#94a3b8' }}>
          {settings.whatsapp   && <span>WhatsApp: {settings.whatsapp}  </span>}
          {settings.instagram  && <span>Instagram: @{settings.instagramHandle}  </span>}
          {settings.tiktok     && <span>TikTok: {settings.tiktok}</span>}
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right' }}>
          ¡Gracias por su compra! • {settings.companyName}
        </div>
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function InvoiceModal({ order, settings, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Generate QR data URL on mount
  useEffect(() => {
    const text = buildQRText(order, settings)
    QRCode.toDataURL(text, { width: 200, margin: 1, color: { dark: '#166534', light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [order, settings])

  const handlePrint = () => window.print()

  const handleDownload = async () => {
    if (!printRef.current) return
    setDownloading(true)
    try {
      const canvas = await html2canvas(printRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false,
      })
      const pdf      = new jsPDF('p', 'mm', 'a4')
      const imgData  = canvas.toDataURL('image/png')
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, Math.min(pdfHeight, pdf.internal.pageSize.getHeight()))
      const filename = `${order.invoiceNumber || order.orderNumber}_${order.customer.replace(/\s+/g, '_')}.pdf`
      pdf.save(filename)
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = () => {
    const text = [
      `*${settings.companyName}*`,
      order.invoiceNumber ? `Factura: ${order.invoiceNumber}` : `Pedido: ${order.orderNumber}`,
      `Cliente: ${order.customer}`,
      `Total: ${formatCOP(order.total)}`,
      `Estado: ${STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}`,
      settings.bankAccountNumber ? `\nCuenta ${settings.bankName}: ${settings.bankAccountNumber}` : '',
    ].filter(Boolean).join('\n')
    const phone = settings.whatsapp?.replace(/\D/g, '') || ''
    const url   = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
    window.open(url, '_blank')
  }

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > *:not(#invoice-print-root) { display: none !important; }
          #invoice-print-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl my-4">

          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 no-print">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <FileCheck size={18} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="font-semibold text-slate-800 dark:text-white text-sm">
                  {order.invoiceNumber || order.orderNumber}
                </p>
                <p className="text-xs text-slate-400">
                  {order.invoiceNumber ? 'Factura generada' : 'Vista previa de factura'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={handleShare}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-lg text-xs font-medium transition-colors">
                <Share2 size={13} /> WhatsApp
              </button>
              <button onClick={handlePrint}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-700 dark:text-gray-300 rounded-lg text-xs font-medium transition-colors">
                <Printer size={13} /> Imprimir
              </button>
              <button onClick={handleDownload} disabled={downloading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amazonia-600 hover:bg-amazonia-700 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-60">
                {downloading
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Download size={13} />
                }
                PDF
              </button>
              <button onClick={onClose} className="ml-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Invoice preview */}
          <div className="p-6 overflow-auto" id="invoice-print-root">
            <div ref={printRef} className="border border-slate-200 rounded-xl p-6 bg-white">
              <InvoiceBody order={order} settings={settings} qrDataUrl={qrDataUrl} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
