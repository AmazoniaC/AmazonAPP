import { useState, useEffect, useMemo } from 'react'
import { Search, ShoppingBag, MessageCircle, Share2, Check, Phone, Mail, MapPin, ChevronDown } from 'lucide-react'

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
function ProductCard({ product, settings, idx }: {
  product: Product
  settings: Settings
  idx: number
}) {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(
    product.variants?.length ? product.variants[0] : null
  )

  const price = selectedVariant?.price ?? product.price
  const waLink = buildWALink(product, selectedVariant, settings)

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
        <div className="mt-auto flex items-center justify-between gap-2">
          <div>
            <p className="text-xl font-bold text-emerald-700">{formatCOP(price)}</p>
            <p className="text-xs text-slate-400">por {product.unit}</p>
          </div>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold px-3 py-2 rounded-xl transition-colors shadow-sm"
          >
            <MessageCircle size={15} />
            Pedir
          </a>
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

  useEffect(() => {
    Promise.all([
      fetch('/api/products').then(r => r.json()),
      fetch('/api/settings').then(r => r.json()),
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
              <ProductCard key={product.id} product={product} settings={co} idx={i} />
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
    </div>
  )
}
