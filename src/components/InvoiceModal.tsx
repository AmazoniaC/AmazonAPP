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

// ── Theme: based on user's PPTX template (black/beige modern) ─────────────────
const C = {
  ink:    '#152E2A',     // dark forest green from PPTX (border + text)
  inkSoft:'#3A4F4B',
  paper:  '#F5F1EA',     // warm beige paper feel
  cream:  '#FAF7F0',
  beige:  '#E8E0D2',
  mute:   '#6B6760',
}

// ── QR content builder ────────────────────────────────────────────────────────
function buildQRText(order: SaleOrder, s: CompanySettings): string {
  const lines = [
    `PAGO — ${s.companyName || 'Amazonia Concrete'}`,
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

// ── Invoice body (rendered for both view and PDF) ─────────────────────────────
function InvoiceBody({ order, settings, qrDataUrl }: {
  order: SaleOrder; settings: CompanySettings; qrDataUrl: string
}) {
  const logo = settings.logo
  const taxRate = settings.taxRate ?? 0.19
  const invoiceNum = (order.invoiceNumber || order.orderNumber).replace(/^VTA-\d{4}-/, '').replace(/^FAC-\d{4}-/, '')

  return (
    <div style={{
      fontFamily: '"Inter", "Helvetica Neue", Arial, sans-serif',
      width: '100%',
      backgroundColor: '#ffffff',
      color: C.ink,
      position: 'relative',
    }}>
      {/* ────────────── TOP BANNER: concrete texture with logo ────────────── */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 210,
        backgroundImage: `url(/invoice/concrete-texture.jpeg)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {logo ? (
          <img src={logo} alt="" style={{ height: 150, width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.18))' }} crossOrigin="anonymous" />
        ) : (
          <img src="/invoice/concrete-banner-top.png" alt="" style={{ height: 150, width: 'auto', objectFit: 'contain' }} crossOrigin="anonymous" />
        )}
      </div>

      {/* ────────────── BODY PADDING ────────────── */}
      <div style={{ padding: '36px 56px 32px 56px' }}>

        {/* ─── FACTURA Nº header (split) ─── */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          paddingBottom: 18,
          borderBottom: `1.5px solid ${C.ink}`,
          marginBottom: 28,
        }}>
          <div>
            <div style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: 6,
              color: C.ink,
              lineHeight: 1,
            }}>
              FACTURA
            </div>
            <div style={{
              fontSize: 14,
              color: C.ink,
              marginTop: 8,
              letterSpacing: 1,
              fontWeight: 600,
            }}>
              Nº: {invoiceNum}
            </div>
          </div>
          <div style={{ textAlign: 'right', fontSize: 11, color: C.inkSoft, lineHeight: 1.6 }}>
            <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', color: C.ink, marginBottom: 4 }}>Fecha de emisión</div>
            <div>{fmt(order.invoiceDate || order.date)}</div>
            {order.deliveryDate && (
              <>
                <div style={{ fontSize: 10, letterSpacing: 2, fontWeight: 700, textTransform: 'uppercase', color: C.ink, marginTop: 8, marginBottom: 4 }}>Entrega</div>
                <div>{fmt(order.deliveryDate)}</div>
              </>
            )}
          </div>
        </div>

        {/* ─── DATOS DEL CLIENTE ─── */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 3,
            color: C.ink,
            textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            Datos del cliente
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 12, color: C.inkSoft }}>
            <div style={{ fontWeight: 700, color: C.ink, fontSize: 14 }}>{order.customer}</div>
            <div style={{ textAlign: 'right' }}>
              Método: <strong style={{ color: C.ink }}>{order.paymentMethod}</strong>
            </div>
          </div>
        </div>

        {/* ─── TABLA DE PRODUCTOS ─── */}
        <table style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 12,
          marginBottom: 0,
        }}>
          <thead>
            <tr>
              {['Detalle', 'Cantidad', 'Precio', 'Total'].map((h, i) => (
                <th key={h} style={{
                  padding: '12px 8px',
                  textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right',
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                  color: C.ink,
                  borderBottom: `2px solid ${C.ink}`,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {order.items.map((item, i) => (
              <tr key={i}>
                <td style={{
                  padding: '14px 8px',
                  borderBottom: `1px solid ${C.beige}`,
                  fontWeight: 500,
                  color: C.ink,
                }}>
                  {item.product}
                  {item.discount ? (
                    <span style={{ color: C.mute, fontSize: 10, marginLeft: 8, fontStyle: 'italic' }}>
                      (−{item.discount}%)
                    </span>
                  ) : null}
                </td>
                <td style={{
                  padding: '14px 8px',
                  borderBottom: `1px solid ${C.beige}`,
                  textAlign: 'center',
                  color: C.ink,
                }}>
                  {String(item.qty).padStart(2, '0')}
                </td>
                <td style={{
                  padding: '14px 8px',
                  borderBottom: `1px solid ${C.beige}`,
                  textAlign: 'right',
                  color: C.ink,
                }}>
                  {formatCOP(item.price)}
                </td>
                <td style={{
                  padding: '14px 8px',
                  borderBottom: `1px solid ${C.beige}`,
                  textAlign: 'right',
                  fontWeight: 700,
                  color: C.ink,
                }}>
                  {formatCOP(item.subtotal)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ─── SUBTOTAL / IVA / TOTAL ─── */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
          <div style={{ minWidth: 280 }}>
            {order.discount ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: 12, color: C.inkSoft }}>
                  <span>Subtotal</span>
                  <span>{formatCOP(order.subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: 12, color: C.inkSoft }}>
                  <span>Descuento</span>
                  <span>−{formatCOP(order.discount)}</span>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: 12, color: C.inkSoft }}>
                <span>Subtotal</span>
                <span>{formatCOP(order.subtotal)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: 12, color: C.inkSoft }}>
              <span>IVA ({(taxRate * 100).toFixed(0)}%)</span>
              <span>{formatCOP(order.tax)}</span>
            </div>

            {/* TOTAL bar */}
            <div style={{
              marginTop: 10,
              padding: '14px 18px',
              border: `2.5px solid ${C.ink}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span style={{
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: 4,
                color: C.ink,
              }}>
                TOTAL
              </span>
              <span style={{
                fontSize: 20,
                fontWeight: 900,
                color: C.ink,
                letterSpacing: 0.5,
              }}>
                {formatCOP(order.total)}
              </span>
            </div>
          </div>
        </div>

        {/* ─── THANK YOU MESSAGE ─── */}
        <div style={{
          marginTop: 36,
          paddingTop: 24,
          borderTop: `1px solid ${C.ink}`,
          textAlign: 'center',
          fontSize: 13,
          color: C.ink,
          fontWeight: 600,
          letterSpacing: 0.3,
          fontStyle: 'italic',
        }}>
          {`${order.customer.split(' ')[0]}@, Gracias por tu compra !!!`}
        </div>

        {/* ─── CONTACT + BANK + QR row ─── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 110px',
          gap: 24,
          marginTop: 24,
          fontSize: 10.5,
          color: C.ink,
        }}>
          {/* Contact / Social */}
          <div style={{ lineHeight: 1.8 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Contacto</div>
            {settings.whatsapp && <div>📱 {settings.whatsapp}</div>}
            {settings.email && <div>✉ {settings.email}</div>}
            {settings.instagram && <div>📷 @{settings.instagramHandle || 'amazonia_concrete'}</div>}
            {settings.tiktok && <div>♪ {settings.tiktok.replace(/^https?:\/\/(www\.)?tiktok\.com\//, '@')}</div>}
            {settings.address && <div>📍 {settings.address}</div>}
          </div>

          {/* Bank details */}
          {(settings.bankKey || settings.bankAccountNumber) && (
            <div style={{ lineHeight: 1.8 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 6 }}>Datos de pago</div>
              {settings.bankName && <div><strong>{settings.bankName}</strong></div>}
              {settings.bankKey && <div>Llave: {settings.bankKey}</div>}
              {settings.bankAccountType && settings.bankAccountNumber && (
                <div>{settings.bankAccountType}: {settings.bankAccountNumber}</div>
              )}
              {settings.bankMessage && (
                <div style={{ color: C.mute, fontStyle: 'italic', marginTop: 3, fontSize: 10 }}>{settings.bankMessage}</div>
              )}
            </div>
          )}

          {/* QR code */}
          {qrDataUrl && (
            <div style={{ textAlign: 'center' }}>
              <img src={qrDataUrl} alt="QR pago" style={{ width: 92, height: 92, display: 'block', margin: '0 auto' }} />
              <div style={{ fontSize: 8.5, color: C.mute, marginTop: 4, letterSpacing: 0.5 }}>Escanea para pagar</div>
            </div>
          )}
        </div>

        {order.notes && (
          <div style={{
            marginTop: 18,
            padding: '10px 14px',
            backgroundColor: C.cream,
            borderLeft: `3px solid ${C.ink}`,
            fontSize: 10.5,
            color: C.inkSoft,
            fontStyle: 'italic',
          }}>
            <strong style={{ color: C.ink }}>Notas:</strong> {order.notes}
          </div>
        )}
      </div>

      {/* ────────────── BOTTOM BANNER: concrete + "Belleza natural en concreto" ────────────── */}
      <div style={{
        width: '100%',
        marginTop: 16,
      }}>
        <img
          src="/invoice/concrete-banner-bottom.png"
          alt="Belleza natural en concreto"
          style={{ width: '100%', display: 'block' }}
          crossOrigin="anonymous"
        />
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function InvoiceModal({ order, settings, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [downloading, setDownloading] = useState(false)

  // Generate QR data URL on mount. Depend on specific fields (not the whole
  // settings object) to avoid regeneration when unrelated store state changes.
  useEffect(() => {
    const text = buildQRText(order, settings)
    QRCode.toDataURL(text, { width: 240, margin: 1, color: { dark: C.ink, light: '#ffffff' } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    order.id, order.total,
    settings.companyName, settings.bankName, settings.bankAccountType,
    settings.bankAccountNumber, settings.whatsapp,
  ])

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
      const pageH = pdf.internal.pageSize.getHeight()
      if (pdfHeight <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      } else {
        // Multi-page
        let y = 0
        while (y < pdfHeight) {
          pdf.addImage(imgData, 'PNG', 0, -y, pdfWidth, pdfHeight)
          y += pageH
          if (y < pdfHeight) pdf.addPage()
        }
      }
      const filename = `${order.invoiceNumber || order.orderNumber}_${order.customer.replace(/\s+/g, '_')}.pdf`
      pdf.save(filename)
    } finally {
      setDownloading(false)
    }
  }

  const handleShare = () => {
    const text = [
      `*${settings.companyName || 'Amazonia Concrete'}*`,
      order.invoiceNumber ? `Factura: ${order.invoiceNumber}` : `Pedido: ${order.orderNumber}`,
      `Cliente: ${order.customer}`,
      `Total: ${formatCOP(order.total)}`,
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

      <div className="fixed inset-0 modal-backdrop flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl my-4 animate-scaleIn">

          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 no-print">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amazonia-100 dark:bg-amazonia-900/40 flex items-center justify-center">
                <FileCheck size={18} className="text-amazonia-700 dark:text-amazonia-400" />
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
              <button onClick={handleShare} className="btn btn-sm btn-success">
                <Share2 size={13} /> WhatsApp
              </button>
              <button onClick={handlePrint} className="btn btn-sm btn-secondary">
                <Printer size={13} /> Imprimir
              </button>
              <button onClick={handleDownload} disabled={downloading} className="btn btn-sm btn-primary">
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
          <div className="p-4 overflow-auto bg-slate-100 dark:bg-gray-900" id="invoice-print-root" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            <div ref={printRef} className="bg-white shadow-xl mx-auto" style={{ width: '100%', maxWidth: 720 }}>
              <InvoiceBody order={order} settings={settings} qrDataUrl={qrDataUrl} />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
