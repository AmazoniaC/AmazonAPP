import { useState, useEffect, useMemo } from 'react'
import {
  Search, ShoppingBag, MessageCircle, Share2, Check, Phone, Mail, MapPin, ChevronDown,
  ShoppingCart, X, Plus, Minus, Trash2, CheckCircle2,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProductVariant {
  id: string
  sku: string
  attributes: Record<string, string>
  stock: number
  price?: number
}

interface Product {
  id: string
  name: string
  category: string
  description: string
  price: number
  unit: string
  isActive: boolean
  image?: string
  variants?: ProductVariant[]
}

interface Settings {
  companyName: string
  slogan: string
  phone: string
  email: string
  address: string
  whatsapp: string
  instagram: string
  instagramHandle: string
  tiktok: string
  logo: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const GRADIENT_BG = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600',
  'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600',
  'from-teal-400 to-teal-600',
]
const CATEGORY_EMOJI: Record<string, string> = {
  Macetas: '🪴', Bandejas: '🎨', Jarrones: '🏺', Decoración: '✨', Suculentas: '🌵',
}
const catEmoji = (cat: string) => CATEGORY_EMOJI[cat] ?? '🛍️'
const catGrad  = (cat: string, idx: number) =>
  GRADIENT_BG[idx % GRADIENT_BG.length]

const formatCOP = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const variantLabel = (v: ProductVariant) =>
  Object.values(v.attributes).filter(Boolean).join(' / ')

const cleanWA = (raw: string) => raw.replace(/\D/g, '')

// ─── Cart ────────────────────────────────────────────────────────────────────
interface CartItem {
  productId: string
  variantId?: string
  name: string
  price: number
  unit: string
  qty: number
}

const CART_KEY = 'public_cart'
const cartItemKey = (productId: string, variantId?: string) => `${productId}::${variantId ?? ''}`

function loadCart(): CartItem[] {
  try {
    const raw = sessionStorage.getItem(CART_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveCart(items: CartItem[]) {
  try { sessionStorage.setItem(CART_KEY, JSON.stringify(items)) } catch { /* private mode, etc. */ }
}

function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => loadCart())

  const persist = (next: CartItem[]) => { setItems(next); saveCart(next) }

  const addItem = (item: CartItem) => {
    const key = cartItemKey(item.productId, item.variantId)
    const existing = items.find((i) => cartItemKey(i.productId, i.variantId) === key)
    const next = existing
      ? items.map((i) => cartItemKey(i.productId, i.variantId) === key ? { ...i, qty: i.qty + item.qty } : i)
      : [...items, item]
    persist(next)
  }
  const updateQty = (productId: string, variantId: string | undefined, qty: number) => {
    const key = cartItemKey(productId, variantId)
    if (qty <= 0) {
      persist(items.filter((i) => cartItemKey(i.productId, i.variantId) !== key))
      return
    }
    persist(items.map((i) => cartItemKey(i.productId, i.variantId) === key ? { ...i, qty } : i))
  }
  const remove = (productId: string, variantId: string | undefined) => {
    const key = cartItemKey(productId, variantId)
    persist(items.filter((i) => cartItemKey(i.productId, i.variantId) !== key))
  }
  const clear = () => persist([])

  const count = items.reduce((s, i) => s + i.qty, 0)
  const total = items.reduce((s, i) => s + i.price * i.qty, 0)

  return { items, addItem, updateQty, remove, clear, count, total }
}
type UseCartReturn = ReturnType<typeof useCart>

function buildWALink(product: Product, variant: ProductVariant | null, settings: Settings) {
  const varStr = variant ? ` — ${variantLabel(variant)}` : ''
  const price = (variant?.price ?? product.price)
  const msg = encodeURIComponent(
    `Hola ${settings.companyName} 👋\n` +
    `Me interesa: *${product.name}*${varStr}\n` +
    `Precio: ${formatCOP(price)}\n` +
    `¿Tienen disponibilidad?`
  )
  const num = cleanWA(settings.whatsapp || settings.phone || '')
  return `https://wa.me/${num}?text=${msg}`
}

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, settings, idx, cart }: {
  product: Product
  settings: Settings
  idx: number
  cart: UseCartReturn
}) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.length ? product.variants[0] : null
  )
  const [justAdded, setJustAdded] = useState(false)

  const price = selectedVariant?.price ?? product.price
  const waLink = buildWALink(product, selectedVariant, settings)

  const handleAdd = () => {
    cart.addItem({
      productId: product.id,
      variantId: selectedVariant?.id,
      name: selectedVariant ? `${product.name} — ${variantLabel(selectedVariant)}` : product.name,
      price,
      unit: product.unit,
      qty: 1,
    })
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1500)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Image / Gradient placeholder */}
      <div className="h-48 flex-shrink-0 overflow-hidden relative">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${catGrad(product.category, idx)} flex items-center justify-center`}>
            <span className="text-5xl drop-shadow">{catEmoji(product.category)}</span>
          </div>
        )}
        {/* Category badge */}
        <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-slate-700 text-xs font-semibold px-2 py-1 rounded-full shadow-sm">
          {catEmoji(product.category)} {product.category}
        </span>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        <div>
          <h3 className="font-bold text-slate-800 text-base leading-tight">{product.name}</h3>
          {product.description && (
            <p className="text-slate-500 text-sm mt-1 line-clamp-2">{product.description}</p>
          )}
        </div>

        {/* Variant selector */}
        {product.variants && product.variants.length > 1 && (
          <div className="relative">
            <select
              value={selectedVariant?.id ?? ''}
              onChange={e => {
                const v = product.variants!.find(x => x.id === e.target.value) ?? null
                setSelectedVariant(v)
              }}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-1.5 pr-8 appearance-none bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {product.variants.map(v => (
                <option key={v.id} value={v.id}>{variantLabel(v)}</option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        )}

        {/* Price + CTA */}
        <div className="mt-auto">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <p className="text-xl font-bold text-emerald-700">{formatCOP(price)}</p>
              <p className="text-xs text-slate-400">por {product.unit}</p>
            </div>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              title="Preguntar por WhatsApp"
              className="flex items-center justify-center w-9 h-9 bg-green-50 hover:bg-green-100 text-green-600 rounded-xl transition-colors border border-green-200 shrink-0"
            >
              <MessageCircle size={16} />
            </a>
          </div>
          <button
            onClick={handleAdd}
            className={`w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm ${
              justAdded ? 'bg-emerald-600 text-white' : 'bg-[#1B4332] hover:bg-[#2D6A4F] text-white'
            }`}
          >
            {justAdded ? <><Check size={15} /> Agregado</> : <><ShoppingCart size={15} /> Agregar al pedido</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────
function CartDrawer({ cart, onClose, onCheckout }: {
  cart: UseCartReturn
  onClose: () => void
  onCheckout: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white h-full shadow-2xl flex flex-col animate-fadeIn">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingCart size={18} /> Tu pedido</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {cart.items.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ShoppingCart size={36} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">Tu carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.items.map((item) => (
                <div key={cartItemKey(item.productId, item.variantId)} className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                    <p className="text-xs text-slate-400">{formatCOP(item.price)} / {item.unit}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <button onClick={() => cart.updateQty(item.productId, item.variantId, item.qty - 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                        <Minus size={12} />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">{item.qty}</span>
                      <button onClick={() => cart.updateQty(item.productId, item.variantId, item.qty + 1)}
                        className="w-6 h-6 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600">
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-slate-800">{formatCOP(item.price * item.qty)}</p>
                    <button onClick={() => cart.remove(item.productId, item.variantId)}
                      className="text-red-400 hover:text-red-600 mt-1">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-100 space-y-3">
            <div className="flex items-center justify-between font-bold text-slate-800">
              <span>Total</span>
              <span>{formatCOP(cart.total)}</span>
            </div>
            <button onClick={onCheckout}
              className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold py-3 rounded-xl transition-colors">
              Continuar pedido
            </button>
            <p className="text-[11px] text-slate-400 text-center">
              Esto envía una solicitud de pedido — nuestro equipo la confirma antes de despachar.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Checkout Modal ───────────────────────────────────────────────────────────
function CheckoutModal({ cart, onClose, onSuccess }: {
  cart: UseCartReturn
  onClose: () => void
  onSuccess: (quoteNumber: string) => void
}) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      setError('Nombre y teléfono son requeridos')
      return
    }
    setError('')
    setSending(true)
    try {
      const res = await fetch('/api/public/order-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name.trim(),
          customerPhone: phone.trim(),
          customerEmail: email.trim() || undefined,
          notes: notes.trim() || undefined,
          items: cart.items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el pedido')
      cart.clear()
      onSuccess(data.quoteNumber)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo enviar el pedido')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
          <h2 className="font-bold text-slate-800">Confirmar pedido</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Nombre *</label>
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Tu nombre" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Teléfono / WhatsApp *</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="300 123 4567" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Email (opcional)</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="tu@email.com" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 block mb-1">Notas de entrega (opcional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Dirección, horario preferido, etc." />
          </div>

          <div className="bg-slate-50 rounded-xl p-3 space-y-1">
            {cart.items.map((item) => (
              <div key={cartItemKey(item.productId, item.variantId)} className="flex justify-between text-xs text-slate-600">
                <span>{item.name} × {item.qty}</span>
                <span>{formatCOP(item.price * item.qty)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm font-bold text-slate-800 pt-1.5 mt-1.5 border-t border-slate-200">
              <span>Total</span>
              <span>{formatCOP(cart.total)}</span>
            </div>
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button onClick={handleSubmit} disabled={sending}
            className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors">
            {sending ? 'Enviando...' : 'Enviar pedido'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PublicCatalog() {
  const [products, setProducts]   = useState<Product[]>([])
  const [settings, setSettings]   = useState<Settings | null>(null)
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [category, setCategory]   = useState('Todos')
  const [copied, setCopied]       = useState(false)
  const cart = useCart()
  const [showCart, setShowCart]       = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)
  const [confirmedQuote, setConfirmedQuote] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/public/settings').then(r => r.json()),
    ])
      .then(([prods, cfg]) => {
        setProducts(Array.isArray(prods) ? prods : [])
        setSettings(cfg ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const active = useMemo(() => products.filter(p => p.isActive), [products])

  const categories = useMemo(() => {
    const cats = [...new Set(active.map(p => p.category))].sort()
    return ['Todos', ...cats]
  }, [active])

  const filtered = useMemo(() => {
    let list = active
    if (category !== 'Todos') list = list.filter(p => p.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [active, category, search])

  const handleShare = () => {
    const url = window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Cargando catálogo…</p>
        </div>
      </div>
    )
  }

  const co = settings

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero Header ── */}
      <header className="bg-gradient-to-br from-[#1B4332] to-[#2D6A4F] text-white">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              {co?.logo ? (
                <img src={co.logo} alt={co.companyName} className="h-24 w-24 rounded-2xl object-contain bg-white p-1 shadow-lg" />
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-white/20 flex items-center justify-center shadow-lg">
                  <ShoppingBag size={40} className="text-white/80" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                {co?.companyName ?? 'Catálogo'}
              </h1>
              {co?.slogan && (
                <p className="mt-1 text-emerald-200 text-lg">{co.slogan}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-4 text-emerald-100 text-sm">
                {co?.phone && (
                  <span className="flex items-center gap-1"><Phone size={13} />{co.phone}</span>
                )}
                {co?.email && (
                  <span className="flex items-center gap-1"><Mail size={13} />{co.email}</span>
                )}
                {co?.address && (
                  <span className="flex items-center gap-1"><MapPin size={13} />{co.address}</span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 flex-shrink-0">
              {(co?.whatsapp || co?.phone) && (
                <a
                  href={`https://wa.me/${cleanWA(co.whatsapp || co.phone || '')}?text=${encodeURIComponent('Hola, quiero información sobre sus productos')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-400 text-white font-semibold px-4 py-2 rounded-xl transition-colors shadow"
                >
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              <button
                onClick={handleShare}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                {copied ? <><Check size={16} /> ¡Copiado!</> : <><Share2 size={16} /> Compartir</>}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Filters ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3 items-center">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar productos…"
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 flex-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 text-sm px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  category === cat
                    ? 'bg-[#1B4332] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat !== 'Todos' && catEmoji(cat)} {cat}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-400 flex-shrink-0">{filtered.length} productos</p>
        </div>
      </div>

      {/* ── Product Grid ── */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No se encontraron productos</p>
            <p className="text-sm mt-1">Intenta con otra búsqueda o categoría</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {co && filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} settings={co} idx={i} cart={cart} />
            ))}
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#1B4332] text-emerald-200 text-center text-xs py-6 mt-8">
        <p className="font-semibold text-white text-sm">{co?.companyName}</p>
        {co?.slogan && <p className="mt-0.5">{co.slogan}</p>}
        <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
          {co?.instagramHandle && (
            <a href={co.instagram || '#'} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              @{co.instagramHandle}
            </a>
          )}
          {co?.tiktok && (
            <a href={co.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              TikTok
            </a>
          )}
          {co?.email && <span>{co.email}</span>}
        </div>
      </footer>

      {/* ── Floating cart button ── */}
      {cart.count > 0 && !showCart && !showCheckout && !confirmedQuote && (
        <button
          onClick={() => setShowCart(true)}
          className="fixed bottom-5 right-5 z-30 flex items-center gap-2 bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold px-4 py-3 rounded-full shadow-lg transition-colors"
        >
          <ShoppingCart size={18} />
          {cart.count} · {formatCOP(cart.total)}
        </button>
      )}

      {showCart && (
        <CartDrawer
          cart={cart}
          onClose={() => setShowCart(false)}
          onCheckout={() => { setShowCart(false); setShowCheckout(true) }}
        />
      )}

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          onClose={() => setShowCheckout(false)}
          onSuccess={(quoteNumber) => { setShowCheckout(false); setConfirmedQuote(quoteNumber) }}
        />
      )}

      {confirmedQuote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-emerald-600" />
            </div>
            <h2 className="font-bold text-slate-800 text-lg mb-1">¡Pedido recibido!</h2>
            <p className="text-sm text-slate-500 mb-4">
              Tu solicitud <span className="font-mono font-semibold">{confirmedQuote}</span> fue enviada.
              Nuestro equipo te contactará pronto para confirmarla.
            </p>
            <button
              onClick={() => setConfirmedQuote(null)}
              className="w-full bg-[#1B4332] hover:bg-[#2D6A4F] text-white font-semibold py-2.5 rounded-xl transition-colors"
            >
              Seguir viendo el catálogo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
