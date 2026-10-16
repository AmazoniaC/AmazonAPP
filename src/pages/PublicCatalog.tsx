import { useState, useEffect, useMemo } from 'react'
import {
  Search, ShoppingBag, MessageCircle, Share2, Check, Phone, Mail, MapPin, ChevronDown,
  ShoppingCart, X, Plus, Minus, Trash2, CheckCircle2, Star, SlidersHorizontal, ArrowUpDown,
  PackageX, Sparkles, Users, Truck, RotateCcw, HelpCircle, ChevronUp,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────
interface ProductVariant {
  id: string
  sku?: string
  attributes: Record<string, string>
  stock: number
  priceOverride?: number
}

interface Product {
  id: string
  name: string
  category: string
  description: string
  price: number
  unit: string
  stock: number
  isFeatured?: boolean
  createdAt?: string
  image?: string
  variants?: ProductVariant[]
}

interface FaqEntry {
  id: string
  question: string
  answer: string
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
  catalogAbout?: string
  catalogShippingPolicy?: string
  catalogReturnsPolicy?: string
  catalogFaq?: FaqEntry[]
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

// A variant's own price if set, otherwise the product's base price — the
// variant field is `priceOverride`, not `price`; using the wrong key here
// silently fell back to the base price for every variant, no matter what
// was configured in the admin catalog.
const effectivePrice = (product: Product, variant: ProductVariant | null) =>
  variant?.priceOverride ?? product.price

// For sorting/filtering by price, a product with variants is represented by
// its cheapest option — the usual "desde $X" convention.
const productMinPrice = (product: Product) =>
  product.variants?.length
    ? Math.min(...product.variants.map((v) => v.priceOverride ?? product.price))
    : product.price

const isProductAvailable = (product: Product) =>
  product.variants?.length
    ? product.variants.some((v) => v.stock > 0)
    : product.stock > 0

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
  const price = effectivePrice(product, variant)
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
function ProductCard({ product, settings, idx, cart, featured }: {
  product: Product
  settings: Settings
  idx: number
  cart: UseCartReturn
  featured?: boolean
}) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.length ? product.variants[0] : null
  )
  const [justAdded, setJustAdded] = useState(false)

  const price = effectivePrice(product, selectedVariant)
  const waLink = buildWALink(product, selectedVariant, settings)
  const available = selectedVariant ? selectedVariant.stock > 0 : product.stock > 0

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
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow flex flex-col ${
      featured ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-100'
    }`}>
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
        {featured && (
          <span className="absolute top-3 right-3 flex items-center gap-1 bg-amber-400 text-amber-950 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
            <Star size={11} fill="currentColor" /> Destacado
          </span>
        )}
        {!available && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white/95 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5">
              <PackageX size={13} /> Agotado
            </span>
          </div>
        )}
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
                <option key={v.id} value={v.id}>{variantLabel(v)}{v.stock <= 0 ? ' (agotado)' : ''}</option>
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
            disabled={!available}
            className={`w-full flex items-center justify-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm ${
              !available ? 'bg-slate-200 text-slate-400 cursor-not-allowed' :
              justAdded ? 'bg-emerald-600 text-white' : 'bg-[#1B4332] hover:bg-[#2D6A4F] text-white'
            }`}
          >
            {!available ? 'Agotado' : justAdded ? <><Check size={15} /> Agregado</> : <><ShoppingCart size={15} /> Agregar al pedido</>}
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
  onSuccess: (quoteNumber: string, customerNotified: boolean) => void
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
      onSuccess(data.quoteNumber, !!data.customerNotified)
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

// ─── Filters ──────────────────────────────────────────────────────────────────
type SortKey = 'featured' | 'price-asc' | 'price-desc' | 'name' | 'newest'
const SORT_LABELS: Record<SortKey, string> = {
  featured: 'Destacados primero',
  'price-asc': 'Precio: menor a mayor',
  'price-desc': 'Precio: mayor a menor',
  name: 'Nombre (A-Z)',
  newest: 'Más nuevos',
}

function attrKey(k: string, v: string) { return `${k}::${v}` }

// ─── Institutional pages (Nosotros / Envíos / Devoluciones) ───────────────────
function InfoPage({ icon: Icon, title, text, onBack }: {
  icon: React.ElementType
  title: string
  text: string
  onBack: () => void
}) {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button onClick={onBack} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium mb-6 flex items-center gap-1">
        ← Volver al catálogo
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <Icon size={20} className="text-emerald-700" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-4">
        {text.split('\n').filter(p => p.trim()).map((p, i) => (
          <p key={i} className="text-slate-600 leading-relaxed">{p}</p>
        ))}
      </div>
    </div>
  )
}

function FaqPage({ faq, onBack }: { faq: FaqEntry[]; onBack: () => void }) {
  const [openId, setOpenId] = useState<string | null>(faq[0]?.id ?? null)
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <button onClick={onBack} className="text-sm text-emerald-700 hover:text-emerald-800 font-medium mb-6 flex items-center gap-1">
        ← Volver al catálogo
      </button>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
          <HelpCircle size={20} className="text-emerald-700" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Preguntas frecuentes</h1>
      </div>
      <div className="space-y-2">
        {faq.map((item) => {
          const open = openId === item.id
          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <button
                onClick={() => setOpenId(open ? null : item.id)}
                className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
              >
                <span className="font-semibold text-slate-800 text-sm">{item.question}</span>
                {open ? <ChevronUp size={16} className="text-slate-400 shrink-0" /> : <ChevronDown size={16} className="text-slate-400 shrink-0" />}
              </button>
              {open && (
                <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{item.answer}</p>
              )}
            </div>
          )
        })}
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
  const [confirmedNotified, setConfirmedNotified] = useState(false)
  const [view, setView] = useState<'productos' | 'nosotros' | 'envios' | 'devoluciones' | 'faq'>('productos')

  // Filters
  const [showFilters, setShowFilters] = useState(false)
  const [sortBy, setSortBy]           = useState<SortKey>('featured')
  const [priceMin, setPriceMin]       = useState('')
  const [priceMax, setPriceMax]       = useState('')
  const [onlyAvailable, setOnlyAvailable] = useState(false)
  const [selectedAttrs, setSelectedAttrs] = useState<Set<string>>(new Set())

  useEffect(() => {
    Promise.all([
      fetch('/api/public/products').then(r => r.json()),
      fetch('/api/public/settings').then(r => r.json()),
    ])
      .then(([prods, cfg]) => {
        setProducts(Array.isArray(prods) ? prods : [])
        setSettings(cfg ?? null)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // The server already returns only active + publicly-visible products.
  const all = products

  const categories = useMemo(() => {
    const cats = [...new Set(all.map(p => p.category))].sort()
    return ['Todos', ...cats]
  }, [all])

  // Distinct variant attribute values across the whole catalog, grouped by
  // key (e.g. { color: ['Rojo','Gris'], acabado: ['Mate','Brillante'] }) —
  // the facets shown as filter chips.
  const attrOptions = useMemo(() => {
    const map: Record<string, Set<string>> = {}
    for (const p of all) {
      for (const v of p.variants ?? []) {
        for (const [k, val] of Object.entries(v.attributes)) {
          if (!val) continue
          ;(map[k] ??= new Set()).add(val)
        }
      }
    }
    return Object.fromEntries(Object.entries(map).map(([k, s]) => [k, [...s].sort()]))
  }, [all])

  const featuredProducts = useMemo(() => all.filter(p => p.isFeatured), [all])

  const noOtherFiltersActive = category === 'Todos' && search.trim() === '' &&
    !priceMin && !priceMax && !onlyAvailable && selectedAttrs.size === 0

  const toggleAttr = (k: string, v: string) => {
    const key = attrKey(k, v)
    setSelectedAttrs(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const productMatchesAttrs = (product: Product) => {
    if (selectedAttrs.size === 0) return true
    if (!product.variants?.length) return false
    const byKey: Record<string, string[]> = {}
    for (const s of selectedAttrs) {
      const [k, v] = s.split('::')
      ;(byKey[k] ??= []).push(v)
    }
    return Object.entries(byKey).every(([k, vals]) =>
      product.variants!.some(v => vals.includes(v.attributes[k] ?? ''))
    )
  }

  const filtered = useMemo(() => {
    let list = all
    if (category !== 'Todos') list = list.filter(p => p.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description ?? '').toLowerCase().includes(q)
      )
    }
    const min = priceMin ? Number(priceMin) : null
    const max = priceMax ? Number(priceMax) : null
    if (min !== null) list = list.filter(p => productMinPrice(p) >= min)
    if (max !== null) list = list.filter(p => productMinPrice(p) <= max)
    if (onlyAvailable) list = list.filter(isProductAvailable)
    if (selectedAttrs.size > 0) list = list.filter(productMatchesAttrs)

    const sorted = [...list]
    switch (sortBy) {
      case 'price-asc':  sorted.sort((a, b) => productMinPrice(a) - productMinPrice(b)); break
      case 'price-desc': sorted.sort((a, b) => productMinPrice(b) - productMinPrice(a)); break
      case 'name':       sorted.sort((a, b) => a.name.localeCompare(b.name)); break
      case 'newest':     sorted.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '')); break
      default:           sorted.sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured))
    }
    return sorted
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, category, search, priceMin, priceMax, onlyAvailable, selectedAttrs, sortBy])

  const activeFilterCount =
    (priceMin ? 1 : 0) + (priceMax ? 1 : 0) + (onlyAvailable ? 1 : 0) + selectedAttrs.size

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
      {/* ── Hero ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#1B4332] via-[#2D6A4F] to-[#1B4332] text-white">
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
        <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Logo */}
            <div className="flex-shrink-0">
              {co?.logo ? (
                <img src={co.logo} alt={co.companyName} className="h-24 w-24 rounded-2xl object-contain bg-white p-1 shadow-xl" />
              ) : (
                <div className="h-24 w-24 rounded-2xl bg-white/20 flex items-center justify-center shadow-xl">
                  <ShoppingBag size={40} className="text-white/80" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <span className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm text-emerald-100 text-xs font-semibold px-3 py-1 rounded-full mb-2">
                <Sparkles size={12} /> Catálogo en línea
              </span>
              <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
                {co?.companyName ?? 'Catálogo'}
              </h1>
              {co?.slogan && (
                <p className="mt-2 text-emerald-200 text-lg">{co.slogan}</p>
              )}
              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4 text-emerald-100 text-sm">
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
              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs text-emerald-100/80">
                <span>{all.length} producto{all.length === 1 ? '' : 's'}</span>
                <span className="opacity-40">·</span>
                <span>{categories.length - 1} categoría{categories.length - 1 === 1 ? '' : 's'}</span>
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

      {/* ── Institutional nav ── */}
      {(co?.catalogAbout || co?.catalogShippingPolicy || co?.catalogReturnsPolicy || (co?.catalogFaq?.length ?? 0) > 0) && (
        <nav className="bg-white border-b border-slate-100">
          <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto">
            <button onClick={() => setView('productos')}
              className={`flex items-center gap-1.5 text-sm font-medium px-4 py-3 border-b-2 transition-colors shrink-0 ${
                view === 'productos' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}>
              <ShoppingBag size={14} /> Productos
            </button>
            {co?.catalogAbout && (
              <button onClick={() => setView('nosotros')}
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-3 border-b-2 transition-colors shrink-0 ${
                  view === 'nosotros' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                <Users size={14} /> Nosotros
              </button>
            )}
            {co?.catalogShippingPolicy && (
              <button onClick={() => setView('envios')}
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-3 border-b-2 transition-colors shrink-0 ${
                  view === 'envios' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                <Truck size={14} /> Envíos
              </button>
            )}
            {co?.catalogReturnsPolicy && (
              <button onClick={() => setView('devoluciones')}
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-3 border-b-2 transition-colors shrink-0 ${
                  view === 'devoluciones' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                <RotateCcw size={14} /> Devoluciones
              </button>
            )}
            {(co?.catalogFaq?.length ?? 0) > 0 && (
              <button onClick={() => setView('faq')}
                className={`flex items-center gap-1.5 text-sm font-medium px-4 py-3 border-b-2 transition-colors shrink-0 ${
                  view === 'faq' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}>
                <HelpCircle size={14} /> Preguntas frecuentes
              </button>
            )}
          </div>
        </nav>
      )}

      {/* ── Institutional pages ── */}
      {view === 'nosotros' && co?.catalogAbout && (
        <InfoPage icon={Users} title="Nosotros" text={co.catalogAbout} onBack={() => setView('productos')} />
      )}
      {view === 'envios' && co?.catalogShippingPolicy && (
        <InfoPage icon={Truck} title="Envíos y entregas" text={co.catalogShippingPolicy} onBack={() => setView('productos')} />
      )}
      {view === 'devoluciones' && co?.catalogReturnsPolicy && (
        <InfoPage icon={RotateCcw} title="Devoluciones y garantía" text={co.catalogReturnsPolicy} onBack={() => setView('productos')} />
      )}
      {view === 'faq' && (co?.catalogFaq?.length ?? 0) > 0 && (
        <FaqPage faq={co!.catalogFaq!} onBack={() => setView('productos')} />
      )}

      {view === 'productos' && <>
      {/* ── Featured strip ── */}
      {featuredProducts.length > 0 && noOtherFiltersActive && co && (
        <section className="max-w-6xl mx-auto px-4 pt-8">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800 mb-3">
            <Star size={18} className="text-amber-500" fill="currentColor" /> Destacados
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1">
            {featuredProducts.map((product, i) => (
              <div key={product.id} className="w-64 flex-shrink-0">
                <ProductCard product={product} settings={co} idx={i} cart={cart} featured />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Filters ── */}
      <div className="sticky top-0 z-20 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
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

            {/* Sort */}
            <div className="relative flex-shrink-0">
              <ArrowUpDown size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as SortKey)}
                className="border border-slate-200 rounded-lg pl-7 pr-7 py-2 text-xs font-medium text-slate-600 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
              <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setShowFilters(s => !s)}
              className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal size={13} /> Filtros
              {activeFilterCount > 0 && (
                <span className="bg-emerald-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>

            <p className="text-xs text-slate-400 flex-shrink-0">{filtered.length} producto{filtered.length === 1 ? '' : 's'}</p>
          </div>

          {/* Expandable filter panel */}
          {showFilters && (
            <div className="flex flex-wrap items-start gap-6 pt-3 border-t border-slate-100">
              {/* Price range */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Precio</p>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={priceMin} onChange={e => setPriceMin(e.target.value)}
                    placeholder="Desde" className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                  <span className="text-slate-300 text-xs">—</span>
                  <input type="number" min="0" value={priceMax} onChange={e => setPriceMax(e.target.value)}
                    placeholder="Hasta" className="w-24 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400" />
                </div>
              </div>

              {/* Availability */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Disponibilidad</p>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs text-slate-600">
                  <input type="checkbox" checked={onlyAvailable} onChange={e => setOnlyAvailable(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-emerald-600" />
                  Solo disponibles
                </label>
              </div>

              {/* Variant attribute facets */}
              {Object.entries(attrOptions).map(([key, values]) => (
                <div key={key}>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{key}</p>
                  <div className="flex flex-wrap gap-1.5 max-w-xs">
                    {values.map(v => {
                      const active = selectedAttrs.has(attrKey(key, v))
                      return (
                        <button key={v} onClick={() => toggleAttr(key, v)}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            active ? 'bg-[#1B4332] border-[#1B4332] text-white' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}>
                          {v}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setPriceMin(''); setPriceMax(''); setOnlyAvailable(false); setSelectedAttrs(new Set()) }}
                  className="text-xs text-red-500 hover:text-red-700 font-medium self-end mb-0.5"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Product Grid ── */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {filtered.length === 0 ? (
          <div className="text-center py-24 text-slate-400">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No se encontraron productos</p>
            <p className="text-sm mt-1">Intenta con otra búsqueda o ajusta los filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {co && filtered.map((product, i) => (
              <ProductCard key={product.id} product={product} settings={co} idx={i} cart={cart} />
            ))}
          </div>
        )}
      </main>
      </>}

      {/* ── Footer ── */}
      <footer className="bg-[#1B4332] text-emerald-200 text-center text-xs py-6 mt-8">
        <p className="font-semibold text-white text-sm">{co?.companyName}</p>
        {co?.slogan && <p className="mt-0.5">{co.slogan}</p>}
        <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
          {co?.catalogAbout && (
            <button onClick={() => setView('nosotros')} className="hover:text-white transition-colors">
              Nosotros
            </button>
          )}
          {co?.catalogShippingPolicy && (
            <button onClick={() => setView('envios')} className="hover:text-white transition-colors">
              Envíos y entregas
            </button>
          )}
          {co?.catalogReturnsPolicy && (
            <button onClick={() => setView('devoluciones')} className="hover:text-white transition-colors">
              Devoluciones y garantía
            </button>
          )}
          {(co?.catalogFaq?.length ?? 0) > 0 && (
            <button onClick={() => setView('faq')} className="hover:text-white transition-colors">
              Preguntas frecuentes
            </button>
          )}
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
          onSuccess={(quoteNumber, customerNotified) => { setShowCheckout(false); setConfirmedQuote(quoteNumber); setConfirmedNotified(customerNotified) }}
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
            {confirmedNotified && (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg py-2 px-3 mb-4">
                ✅ Te enviamos la confirmación a tu WhatsApp
              </p>
            )}
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
