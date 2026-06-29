import { useState, useMemo, useRef } from 'react'
import {
  Plus, Search, X, BookOpen, Tag, TrendingUp, Trash2, Pencil,
  LayoutGrid, List, ArrowUpDown, SlidersHorizontal, FileSpreadsheet,
  ImageIcon, ChevronDown, Star, ShoppingCart, DollarSign, Package, ExternalLink, Upload,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import { Product, ProductVariant } from '../data/mockData'
import { usePermissions } from '../hooks/usePermissions'
import ConfirmDelete from '../components/ConfirmDelete'
import Pagination from '../components/Pagination'
import PageHeader from '../components/PageHeader'
import StatCard from '../components/StatCard'
import { formatCOP } from '../utils/currency'
import * as XLSX from 'xlsx'
import ImportModal from '../components/ImportModal'

// ─── Helpers ───────────────────────────────────────────────────────────────
const CATEGORY_EMOJI: Record<string, string> = {
  Macetas:'🪴', Bandejas:'🎨', Jarrones:'🏺', Decoración:'✨', Suculentas:'🌵',
}
const CATEGORY_COLORS: Record<string, string> = {
  Macetas:'badge-green', Bandejas:'badge-blue', Jarrones:'badge-purple',
  Decoración:'badge-yellow', Suculentas:'badge-teal',
}
const GRADIENT_BG = [
  'from-blue-400 to-blue-600', 'from-emerald-400 to-emerald-600',
  'from-violet-400 to-violet-600', 'from-amber-400 to-amber-600',
  'from-rose-400 to-rose-600', 'from-teal-400 to-teal-600',
]
const catBadge  = (cat: string) => CATEGORY_COLORS[cat] ?? 'badge-gray'
const catEmoji  = (cat: string) => CATEGORY_EMOJI[cat] ?? '🛍️'
const catGrad   = (cat: string) => {
  const keys = Object.keys(CATEGORY_EMOJI)
  return GRADIENT_BG[keys.indexOf(cat) % GRADIENT_BG.length] ?? GRADIENT_BG[0]
}
const VARIANT_COLORS  = ['Natural', 'Negro', 'Blanco', 'Terracota', 'Verde musgo']
const VARIANT_ACABADOS = ['Sellado mate', 'Sellado brillante', 'Sin sellar']
const variantLabel = (v: ProductVariant) =>
  [v.attributes.color, v.attributes.acabado].filter(Boolean).join(' / ')

const margin    = (p: Product) => p.price > 0 ? ((p.price - p.cost) / p.price * 100) : 0
const marginColor = (m: number) =>
  m > 40 ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
  : m > 20 ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
  : 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'

// ─── Image upload helper ────────────────────────────────────────────────────
function ImageUpload({ value, onChange }: { value?: string; onChange: (b64: string | undefined) => void }) {
  const ref = useRef<HTMLInputElement>(null)
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => onChange(reader.result as string)
    reader.readAsDataURL(file)
  }
  return (
    <div className="col-span-2">
      <label className="label">Imagen del producto</label>
      <div className="flex items-center gap-3">
        <div
          className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 dark:border-gray-600 flex items-center justify-center overflow-hidden cursor-pointer hover:border-blue-400 transition-colors bg-slate-50 dark:bg-gray-700 flex-shrink-0"
          onClick={() => ref.current?.click()}
        >
          {value
            ? <img src={value} alt="preview" className="w-full h-full object-cover" />
            : <ImageIcon size={24} className="text-slate-300 dark:text-gray-500" />
          }
        </div>
        <div className="flex-1 space-y-1.5">
          <button type="button" onClick={() => ref.current?.click()}
            className="btn btn-secondary btn-sm w-full">
            {value ? 'Cambiar imagen' : 'Subir imagen'}
          </button>
          {value && (
            <button type="button" onClick={() => onChange(undefined)}
              className="btn btn-sm w-full text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800">
              Eliminar imagen
            </button>
          )}
          <p className="text-xs text-slate-400 dark:text-gray-500">JPG, PNG, WEBP — máx 2 MB</p>
        </div>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  )
}

// ─── ProductModal ──────────────────────────────────────────────────────────
function ProductModal({ product, onClose }: { product?: Product; onClose: () => void }) {
  const { addProduct, updateProduct, recipes, products } = useStore()
  const [form, setForm] = useState<Partial<Product>>(product ?? {
    sku: `PRD-${String(products.length + 1).padStart(4, '0')}`,
    name: '', category: '', unit: 'u',
    stock: 0, price: 0, cost: 0,
    isActive: true, description: '', image: undefined, variants: [],
  })
  const [modalTab, setModalTab] = useState<'general' | 'variants'>('general')

  // ── Variant helpers ──────────────────────────────────────────────────────
  const variants: ProductVariant[] = (form.variants ?? []) as ProductVariant[]
  const setVariants = (v: ProductVariant[]) => setForm({ ...form, variants: v })

  const addVariantRow = () => setVariants([...variants, {
    id: `v${Date.now()}`,
    sku: `${form.sku ?? 'PRD'}-V${String(variants.length + 1).padStart(2, '0')}`,
    attributes: { color: 'Natural', acabado: 'Sellado mate' },
    stock: 0,
    isActive: true,
  }])
  const removeVariantRow = (idx: number) => setVariants(variants.filter((_, i) => i !== idx))
  const patchVariant = (idx: number, patch: Partial<ProductVariant>) =>
    setVariants(variants.map((v, i) => i === idx ? { ...v, ...patch } : v))

  const handleSave = () => {
    if (!form.name?.trim()) return
    const p = { ...form, id: product?.id ?? `p${Date.now()}` } as Product
    if (product) updateProduct(p)
    else addProduct(p)
    onClose()
  }

  const m = margin(form as Product)
  const profit = (form.price ?? 0) - (form.cost ?? 0)
  const existingCategories = [...new Set(products.map(p => p.category).filter(Boolean))]
  const totalVariantStock = variants.reduce((a, v) => a + v.stock, 0)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="font-semibold text-slate-800 dark:text-white">
            {product ? 'Editar producto' : 'Nuevo producto'}
          </h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        {/* Tab switcher */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex gap-1 bg-slate-100 dark:bg-gray-700 p-1 rounded-xl">
            {(['general', 'variants'] as const).map((t) => (
              <button key={t} type="button" onClick={() => setModalTab(t)}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  modalTab === t
                    ? 'bg-white dark:bg-gray-800 text-slate-800 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200'
                }`}>
                {t === 'general' ? '📋 Datos generales' : `🎨 Variantes${variants.length > 0 ? ` (${variants.length})` : ''}`}
              </button>
            ))}
          </div>
        </div>

        {/* GENERAL TAB */}
        {modalTab === 'general' && (
          <div className="px-6 py-4 grid grid-cols-2 gap-4">
            <ImageUpload value={form.image} onChange={(v) => setForm({ ...form, image: v })} />
            <div>
              <label className="label">SKU</label>
              <input className="input" value={form.sku ?? ''}
                onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <label className="label">Nombre *</label>
              <input className="input" value={form.name ?? ''}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Categoría</label>
              <input className="input" list="cat-list" value={form.category ?? ''}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder="Ej: Macetas, Jarrones..." />
              <datalist id="cat-list">
                {existingCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="label">Unidad</label>
              <select className="input" value={form.unit ?? 'u'}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                {['u','kg','g','L','mL','doc','caja','par','rollo','set'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Precio de venta ($)</label>
              <input className="input" type="number" min="0" step="1" value={form.price ?? 0}
                onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Costo de producción ($)</label>
              <input className="input" type="number" min="0" step="1" value={form.cost ?? 0}
                onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Stock actual</label>
              <input className="input" type="number" min="0" value={form.stock ?? 0}
                onChange={(e) => setForm({ ...form, stock: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input" value={form.isActive ? 'activo' : 'inactivo'}
                onChange={(e) => setForm({ ...form, isActive: e.target.value === 'activo' })}>
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Fórmula vinculada</label>
              <select className="input" value={form.recipeId ?? ''}
                onChange={(e) => setForm({ ...form, recipeId: e.target.value || undefined })}>
                <option value="">— Sin fórmula —</option>
                {recipes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Descripción</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Describe brevemente el producto..."
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
        )}

        {/* VARIANTS TAB */}
        {modalTab === 'variants' && (
          <div className="px-6 py-4 space-y-4">
            {/* Info callout */}
            <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl p-3 text-xs text-violet-700 dark:text-violet-300">
              <p className="font-semibold mb-0.5">¿Qué son las variantes?</p>
              <p>Permiten ofrecer este producto en diferentes colores o acabados, con stock y precio propios. Precio base: <strong>{formatCOP(form.price ?? 0)}</strong></p>
            </div>

            {/* Variants list */}
            <div className="space-y-2">
              {variants.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-gray-600 rounded-xl text-slate-400 dark:text-gray-500 text-sm">
                  Sin variantes. Agrega la primera con el botón de abajo.
                </div>
              )}
              {variants.map((v, idx) => (
                <div key={v.id} className="bg-slate-50 dark:bg-gray-700 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    {/* Color */}
                    <select className="input flex-1 text-xs" value={v.attributes.color ?? ''}
                      onChange={(e) => patchVariant(idx, { attributes: { ...v.attributes, color: e.target.value } })}>
                      <option value="">— Color —</option>
                      {VARIANT_COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {/* Acabado */}
                    <select className="input flex-1 text-xs" value={v.attributes.acabado ?? ''}
                      onChange={(e) => patchVariant(idx, { attributes: { ...v.attributes, acabado: e.target.value } })}>
                      <option value="">— Acabado —</option>
                      {VARIANT_ACABADOS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    {/* Active */}
                    <button type="button" onClick={() => patchVariant(idx, { isActive: !v.isActive })}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex-shrink-0 ${v.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-slate-200 text-slate-500 dark:bg-gray-600 dark:text-gray-400'}`}>
                      {v.isActive ? 'Activa' : 'Inactiva'}
                    </button>
                    {/* Delete */}
                    <button type="button" onClick={() => removeVariantRow(idx)}
                      className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-600 flex-shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Price override */}
                    <div>
                      <label className="text-xs text-slate-400 dark:text-gray-500 mb-1 block">Precio (vacío = precio base)</label>
                      <input className="input text-xs" type="number" min="0" step="1"
                        placeholder={String(form.price ?? 0)}
                        value={v.priceOverride ?? ''}
                        onChange={(e) => patchVariant(idx, { priceOverride: e.target.value ? parseFloat(e.target.value) : undefined })} />
                    </div>
                    {/* Stock */}
                    <div>
                      <label className="text-xs text-slate-400 dark:text-gray-500 mb-1 block">Stock ({form.unit ?? 'u'})</label>
                      <input className="input text-xs" type="number" min="0" value={v.stock}
                        onChange={(e) => patchVariant(idx, { stock: parseFloat(e.target.value) || 0 })} />
                    </div>
                  </div>
                  {/* SKU preview */}
                  <p className="text-xs text-slate-400 dark:text-gray-500">SKU: <span className="font-mono">{v.sku}</span></p>
                </div>
              ))}
            </div>

            {/* Add button */}
            <button type="button" className="btn btn-secondary w-full flex items-center gap-2 justify-center"
              onClick={addVariantRow}>
              <Plus size={14} /> Agregar variante
            </button>

            {/* Total stock summary */}
            {variants.length > 0 && (
              <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-3 flex justify-between text-sm">
                <span className="text-slate-500 dark:text-gray-400">Stock total variantes</span>
                <span className="font-bold text-slate-800 dark:text-white">{totalVariantStock} {form.unit ?? 'u'}</span>
              </div>
            )}
          </div>
        )}

        {/* Margin preview (general tab only) */}
        {modalTab === 'general' && (form.price ?? 0) > 0 && (form.cost ?? 0) > 0 && (
          <div className="mx-6 mb-4 grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-slate-400 dark:text-gray-500">Ganancia / u</p>
              <p className="font-bold text-slate-800 dark:text-white">{formatCOP(profit)}</p>
            </div>
            <div className={`rounded-lg p-3 ${marginColor(m)}`}>
              <p className="text-xs opacity-70">Margen</p>
              <p className="font-bold text-lg">{m.toFixed(1)}%</p>
            </div>
            <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-3">
              <p className="text-xs text-slate-400 dark:text-gray-500">Precio × costo</p>
              <p className="font-bold text-slate-800 dark:text-white">
                {((form.price ?? 0) / Math.max(form.cost ?? 1, 0.01)).toFixed(2)}×
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 px-6 pb-5 border-t border-slate-100 dark:border-gray-700 pt-4">
          <button className="btn btn-secondary flex-1" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary flex-1" onClick={handleSave}>
            {product ? 'Actualizar' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ProductCard (grid view) ────────────────────────────────────────────────
function ProductCard({ product, soldUnits, revenue, onEdit, onDelete, onClick, canEdit, canDelete }: {
  product: Product; soldUnits: number; revenue: number
  onEdit: () => void; onDelete: () => void; onClick: () => void
  canEdit: boolean; canDelete: boolean
}) {
  const m = margin(product)
  const mc = marginColor(m)

  return (
    <div
      className={`card overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 ${!product.isActive ? 'opacity-55' : ''}`}
      onClick={onClick}
    >
      {/* Product image or gradient placeholder */}
      <div className="relative h-36 overflow-hidden">
        {product.image
          ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
          : (
            <div className={`w-full h-full bg-gradient-to-br ${catGrad(product.category)} flex items-center justify-center`}>
              <span className="text-5xl drop-shadow-sm">{catEmoji(product.category)}</span>
            </div>
          )
        }
        {/* Status badge overlay */}
        {!product.isActive && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="bg-white/90 text-slate-700 text-xs font-bold px-3 py-1 rounded-full">INACTIVO</span>
          </div>
        )}
        {/* Category badge top-left */}
        <span className={`absolute top-2 left-2 badge ${catBadge(product.category)}`}>{product.category}</span>
        {/* Margin badge top-right */}
        <span className={`absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full ${mc}`}>{m.toFixed(0)}%</span>
      </div>

      <div className="p-4">
        <p className="text-xs font-mono text-slate-400 dark:text-gray-500 mb-0.5">{product.sku}</p>
        <h3 className="font-semibold text-slate-800 dark:text-white text-sm leading-tight mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-slate-500 dark:text-gray-400 mb-2 line-clamp-2">{product.description}</p>
        )}

        {/* Price / Cost */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400 dark:text-gray-400">Precio</p>
            <p className="font-bold text-slate-800 dark:text-white text-sm">{formatCOP(product.price)}</p>
          </div>
          <div className="bg-slate-50 dark:bg-gray-700 rounded-lg p-2 text-center">
            <p className="text-xs text-slate-400 dark:text-gray-400">Costo</p>
            <p className="font-semibold text-slate-600 dark:text-gray-300 text-sm">{formatCOP(product.cost)}</p>
          </div>
        </div>

        {/* Sales stats */}
        {soldUnits > 0 && (
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5 mb-3">
            <span className="flex items-center gap-1"><ShoppingCart size={10} />{soldUnits} u vendidas</span>
            <span className="flex items-center gap-1 ml-auto"><TrendingUp size={10} />{formatCOP(revenue)}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 flex-wrap">
            {product.recipeId && <span className="badge badge-blue text-xs">Fórmula</span>}
            {(product.variants?.length ?? 0) > 0 && (
              <span className="badge badge-purple text-xs">{product.variants!.length} vars.</span>
            )}
            <span className={`badge ${product.isActive ? 'badge-green' : 'badge-gray'} text-xs`}>
              {product.isActive ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
            {canEdit && (
              <button className="btn btn-sm btn-secondary flex items-center gap-1" onClick={onEdit}>
                <Pencil size={11} />
              </button>
            )}
            {canDelete && (
              <button className="btn btn-sm flex items-center gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                onClick={onDelete}>
                <Trash2 size={11} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Product Detail Drawer ──────────────────────────────────────────────────
function ProductDrawer({ product, onClose, onEdit, soldUnits, revenue, orderHistory }: {
  product: Product
  onClose: () => void
  onEdit: () => void
  soldUnits: number
  revenue: number
  orderHistory: { orderNumber: string; date: string; qty: number; subtotal: number }[]
}) {
  const { recipes } = useStore()
  const m = margin(product)
  const recipe = recipes.find(r => r.id === product.recipeId)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-end z-50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 w-full max-w-md h-full overflow-y-auto animate-slideIn"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-slate-100 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="font-semibold dark:text-white">Detalle del producto</h3>
          <div className="flex items-center gap-2">
            <button className="btn btn-sm btn-secondary flex items-center gap-1" onClick={onEdit}>
              <Pencil size={12} /> Editar
            </button>
            <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Image + Identity */}
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
              {product.image
                ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                : <div className={`w-full h-full bg-gradient-to-br ${catGrad(product.category)} flex items-center justify-center`}>
                    <span className="text-3xl">{catEmoji(product.category)}</span>
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-mono text-slate-400 dark:text-gray-500">{product.sku}</p>
              <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">{product.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className={`badge ${catBadge(product.category)}`}>{product.category}</span>
                <span className={`badge ${product.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {product.isActive ? 'Activo' : 'Inactivo'}
                </span>
              </div>
            </div>
          </div>

          {product.description && (
            <p className="text-sm text-slate-600 dark:text-gray-300 leading-relaxed">{product.description}</p>
          )}

          {/* Pricing */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-3">Precios</h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                <p className="text-xs text-blue-500 dark:text-blue-400">Precio venta</p>
                <p className="font-bold text-slate-800 dark:text-white">{formatCOP(product.price)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-3">
                <p className="text-xs text-slate-400 dark:text-gray-500">Costo</p>
                <p className="font-bold text-slate-700 dark:text-gray-200">{formatCOP(product.cost)}</p>
              </div>
              <div className={`rounded-xl p-3 ${marginColor(m)}`}>
                <p className="text-xs opacity-70">Margen</p>
                <p className="font-bold text-lg">{m.toFixed(1)}%</p>
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-3">
                <p className="text-xs text-slate-400 dark:text-gray-500">Ganancia unitaria</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400">{formatCOP(product.price - product.cost)}</p>
              </div>
              <div className="bg-slate-50 dark:bg-gray-700 rounded-xl p-3">
                <p className="text-xs text-slate-400 dark:text-gray-500">Stock actual</p>
                <p className="font-bold text-slate-800 dark:text-white">{product.stock} {product.unit}</p>
              </div>
            </div>
          </div>

          {/* Sales analytics */}
          <div>
            <h4 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-3">Analítica de ventas</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <ShoppingCart size={14} className="text-emerald-600 dark:text-emerald-400" />
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">Unidades vendidas</p>
                </div>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">{soldUnits}</p>
                <p className="text-xs text-slate-400 dark:text-gray-500">{product.unit}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign size={14} className="text-blue-600 dark:text-blue-400" />
                  <p className="text-xs text-blue-600 dark:text-blue-400">Revenue total</p>
                </div>
                <p className="text-lg font-bold text-slate-800 dark:text-white">{formatCOP(revenue)}</p>
                <p className="text-xs text-slate-400 dark:text-gray-500">
                  {soldUnits > 0 ? `${orderHistory.length} órdenes` : 'Sin ventas'}
                </p>
              </div>
            </div>
          </div>

          {/* Variants */}
          {(product.variants?.length ?? 0) > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Variantes ({product.variants!.length})
              </h4>
              <div className="overflow-hidden rounded-xl border border-slate-100 dark:border-gray-700">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-gray-700/50">
                      <th className="text-left px-3 py-2 font-semibold text-slate-500 dark:text-gray-400">Variante</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-gray-400">Precio</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-500 dark:text-gray-400">Stock</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-500 dark:text-gray-400">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-gray-700">
                    {product.variants!.map((v) => (
                      <tr key={v.id} className={!v.isActive ? 'opacity-50' : ''}>
                        <td className="px-3 py-2">
                          <p className="font-medium text-slate-700 dark:text-gray-200">{variantLabel(v)}</p>
                          <p className="text-slate-400 dark:text-gray-500 font-mono">{v.sku}</p>
                        </td>
                        <td className="px-3 py-2 text-right font-semibold text-slate-700 dark:text-gray-200">
                          {formatCOP(v.priceOverride ?? product.price)}
                          {v.priceOverride && v.priceOverride !== product.price && (
                            <span className="block text-slate-400 dark:text-gray-500 font-normal">precio especial</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 dark:text-gray-300">
                          {v.stock} {product.unit}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`badge ${v.isActive ? 'badge-green' : 'badge-gray'}`}>
                            {v.isActive ? '✓' : '✗'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-50 dark:bg-gray-700/50">
                      <td colSpan={2} className="px-3 py-2 text-xs text-slate-400 dark:text-gray-500">Stock total variantes</td>
                      <td className="px-3 py-2 text-right font-bold text-slate-700 dark:text-gray-200">
                        {product.variants!.reduce((a, v) => a + v.stock, 0)} {product.unit}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Recipe */}
          {recipe && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-3">Fórmula vinculada</h4>
              <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 rounded-xl p-4">
                <p className="font-semibold text-violet-800 dark:text-violet-300 mb-1">{recipe.name}</p>
                <p className="text-xs text-slate-500 dark:text-gray-400 mb-3">Rinde {recipe.yieldQty} {recipe.yieldUnit} · Costo/u {formatCOP(recipe.costPerUnit)}</p>
                <div className="space-y-1.5">
                  {recipe.ingredients.map((ing, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-gray-300">{ing.supplyName}</span>
                      <span className="font-medium text-slate-700 dark:text-gray-200">{ing.qty} {ing.unit}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Order history */}
          {orderHistory.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-3">Últimas ventas</h4>
              <div className="space-y-0 divide-y divide-slate-100 dark:divide-gray-700">
                {orderHistory.slice(0, 8).map((o, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <p className="font-mono text-xs text-blue-600 dark:text-blue-400">{o.orderNumber}</p>
                      <p className="text-xs text-slate-400 dark:text-gray-500">{o.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-700 dark:text-gray-200">{o.qty} {product.unit}</p>
                      <p className="text-xs text-slate-400 dark:text-gray-500">{formatCOP(o.subtotal)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Catalog page ──────────────────────────────────────────────────────
type SortKey = 'name' | 'price' | 'margin' | 'stock' | 'revenue'
type ViewMode = 'grid' | 'list'
type StatusFilter = 'all' | 'active' | 'inactive'

export default function Catalog() {
  const { products, saleOrders, deleteProduct, loadAllData } = useStore()
  const { canEdit, canDelete } = usePermissions()

  const [search, setSearch]         = useState('')
  const [catFilter, setCat]         = useState('Todos')
  const [statusFilter, setStatus]   = useState<StatusFilter>('all')
  const [sortKey, setSortKey]       = useState<SortKey>('name')
  const [sortAsc, setSortAsc]       = useState(true)
  const [view, setView]             = useState<ViewMode>('grid')
  const [page, setPage]             = useState(1)
  const [showModal, setShowModal]   = useState(false)
  const [editProduct, setEdit]      = useState<Product | undefined>()
  const [selected, setSelected]     = useState<Product | null>(null)
  const [deleteTarget, setDel]      = useState<Product | null>(null)
  const [deleting, setDeleting]     = useState(false)
  const [showImport, setShowImport] = useState(false)
  const PAGE_SIZE = view === 'grid' ? 12 : 20

  // ── Per-product sales stats ──────────────────────────────────────────────
  const productStats = useMemo(() => {
    const stats: Record<string, { units: number; revenue: number; history: { orderNumber: string; date: string; qty: number; subtotal: number }[] }> = {}
    for (const order of saleOrders) {
      for (const item of order.items ?? []) {
        const pid = (item as any).productId as string
        if (!pid) continue
        if (!stats[pid]) stats[pid] = { units: 0, revenue: 0, history: [] }
        stats[pid].units += item.qty
        stats[pid].revenue += item.subtotal
        stats[pid].history.push({ orderNumber: order.orderNumber, date: order.date, qty: item.qty, subtotal: item.subtotal })
      }
    }
    return stats
  }, [saleOrders])

  // ── Derived categories ──────────────────────────────────────────────────
  const categories = useMemo(
    () => ['Todos', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))],
    [products],
  )

  // ── Filter + sort ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = products.filter(p => {
      const matchS = p.name.toLowerCase().includes(search.toLowerCase()) ||
                     (p.sku ?? '').toLowerCase().includes(search.toLowerCase()) ||
                     (p.description ?? '').toLowerCase().includes(search.toLowerCase())
      const matchC = catFilter === 'Todos' || p.category === catFilter
      const matchStatus = statusFilter === 'all' || (statusFilter === 'active' ? p.isActive : !p.isActive)
      return matchS && matchC && matchStatus
    })
    list = [...list].sort((a, b) => {
      let diff = 0
      if (sortKey === 'name')    diff = a.name.localeCompare(b.name)
      if (sortKey === 'price')   diff = a.price - b.price
      if (sortKey === 'margin')  diff = margin(a) - margin(b)
      if (sortKey === 'stock')   diff = a.stock - b.stock
      if (sortKey === 'revenue') diff = (productStats[a.id]?.revenue ?? 0) - (productStats[b.id]?.revenue ?? 0)
      return sortAsc ? diff : -diff
    })
    return list
  }, [products, search, catFilter, statusFilter, sortKey, sortAsc, productStats])

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // ── Summary KPIs ─────────────────────────────────────────────────────────
  const avgMarginAll  = products.length > 0 ? products.reduce((a, p) => a + margin(p), 0) / products.length : 0
  const totalRevenue  = Object.values(productStats).reduce((a, s) => a + s.revenue, 0)
  const bestSeller    = products.reduce<Product | null>((best, p) =>
    (productStats[p.id]?.units ?? 0) > (best ? productStats[best.id]?.units ?? 0 : -1) ? p : best, null)
  const highestMargin = products.reduce<Product | null>((best, p) =>
    margin(p) > (best ? margin(best) : -1) ? p : best, null)

  // ── Excel export ─────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = filtered.map(p => ({
      SKU: p.sku,
      Nombre: p.name,
      Categoría: p.category,
      Descripción: p.description ?? '',
      Unidad: p.unit,
      'Precio venta': p.price,
      'Costo producción': p.cost,
      'Margen (%)': margin(p).toFixed(1),
      'Ganancia/u': (p.price - p.cost).toFixed(2),
      Stock: p.stock,
      Estado: p.isActive ? 'Activo' : 'Inactivo',
      'Unidades vendidas': productStats[p.id]?.units ?? 0,
      'Revenue total': productStats[p.id]?.revenue ?? 0,
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Catálogo')
    XLSX.writeFile(wb, `catalogo-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  // ── Sort toggle ───────────────────────────────────────────────────────────
  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortAsc(!sortAsc)
    else { setSortKey(k); setSortAsc(true) }
    setPage(1)
  }
  const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
    <button onClick={() => toggleSort(k)}
      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
        sortKey === k
          ? 'bg-slate-700 dark:bg-gray-600 text-white border-slate-700 dark:border-gray-600'
          : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
      }`}>
      {label}
      {sortKey === k && <ArrowUpDown size={10} className={sortAsc ? 'opacity-100' : 'opacity-100 rotate-180'} />}
    </button>
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BookOpen}
        title="Catálogo"
        subtitle="Gestión de productos, precios y rentabilidad"
        accent="rgba(168, 112, 80, 0.20)"
        actions={
          <>
            <a href="/catalogo" target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
              <ExternalLink size={13} /> Ver catálogo
            </a>
            <button className="btn btn-sm btn-secondary" onClick={handleExport}>
              <FileSpreadsheet size={13} /> Exportar
            </button>
            <button className="btn btn-sm btn-secondary" onClick={() => setShowImport(true)}>
              <Upload size={13} /> Importar
            </button>
            {canEdit('products') && (
              <button className="btn btn-sm btn-primary" onClick={() => { setEdit(undefined); setShowModal(true) }}>
                <Plus size={14} /> Nuevo producto
              </button>
            )}
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 stagger-children">
        <StatCard icon={BookOpen}    label="Total productos"   value={products.length}            accent="#2563eb" hint={`${products.filter(p=>p.isActive).length} activos`} />
        <StatCard icon={TrendingUp}  label="Margen promedio"   value={`${avgMarginAll.toFixed(1)}%`} accent="#10b981" hint={highestMargin ? `Mejor: ${highestMargin.name.split(' ')[0]}` : '—'} />
        <StatCard icon={DollarSign}  label="Revenue catálogo"  value={formatCOP(totalRevenue)}    accent="#8b5cf6" hint="De ventas registradas" />
        <StatCard icon={Star}        label="Más vendido"       value={bestSeller?.name.split(' ')[0] ?? '—'} accent="#f59e0b" hint={bestSeller ? `${productStats[bestSeller.id]?.units ?? 0} u vendidas` : 'Sin ventas'} />
      </div>

      {/* Filters bar */}
      <div className="card p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Buscar por nombre, SKU o descripción..."
              value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
          </div>
          {/* View toggle */}
          <div className="flex rounded-lg border border-slate-200 dark:border-gray-600 overflow-hidden">
            <button onClick={() => { setView('grid'); setPage(1) }}
              className={`px-3 py-2 transition-colors ${view === 'grid' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-600'}`}>
              <LayoutGrid size={14} />
            </button>
            <button onClick={() => { setView('list'); setPage(1) }}
              className={`px-3 py-2 transition-colors border-l border-slate-200 dark:border-gray-600 ${view === 'list' ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-700 text-slate-500 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-600'}`}>
              <List size={14} />
            </button>
          </div>
        </div>

        {/* Category + status + sort */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Category pills */}
          {categories.map(c => (
            <button key={c} onClick={() => { setCat(c); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                catFilter === c
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
              }`}>{c}</button>
          ))}

          <div className="w-px h-5 bg-slate-200 dark:bg-gray-600 mx-1" />

          {/* Status filter */}
          {(['all','active','inactive'] as StatusFilter[]).map(s => (
            <button key={s} onClick={() => { setStatus(s); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                statusFilter === s
                  ? s === 'active' ? 'bg-emerald-600 text-white border-emerald-600'
                    : s === 'inactive' ? 'bg-gray-500 text-white border-gray-500'
                    : 'bg-slate-600 text-white border-slate-600'
                  : 'bg-white dark:bg-gray-700 text-slate-600 dark:text-gray-300 border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-600'
              }`}>
              {s === 'all' ? 'Todos' : s === 'active' ? 'Activos' : 'Inactivos'}
            </button>
          ))}

          <div className="w-px h-5 bg-slate-200 dark:bg-gray-600 mx-1" />

          {/* Sort options */}
          <span className="text-xs text-slate-400 dark:text-gray-500 flex items-center gap-1">
            <SlidersHorizontal size={12} /> Ordenar:
          </span>
          <SortBtn k="name"    label="Nombre" />
          <SortBtn k="price"   label="Precio" />
          <SortBtn k="margin"  label="Margen" />
          <SortBtn k="stock"   label="Stock" />
          <SortBtn k="revenue" label="Revenue" />

          {filtered.length !== products.length && (
            <span className="ml-auto text-xs text-slate-400 dark:text-gray-500">
              {filtered.length} de {products.length}
            </span>
          )}
        </div>
      </div>

      {/* Grid view */}
      {view === 'grid' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map(p => (
              <ProductCard key={p.id} product={p}
                soldUnits={productStats[p.id]?.units ?? 0}
                revenue={productStats[p.id]?.revenue ?? 0}
                canEdit={canEdit('products')} canDelete={canDelete('products')}
                onClick={() => setSelected(p)}
                onEdit={() => { setEdit(p); setShowModal(true) }}
                onDelete={() => setDel(p)}
              />
            ))}
            {filtered.length === 0 && (
              <div className="col-span-4 text-center py-16 text-slate-400 dark:text-gray-600">
                <Package size={40} className="mx-auto mb-3 opacity-30" />
                <p>No se encontraron productos</p>
              </div>
            )}
          </div>
          <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
        </>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-gray-700/50 border-b border-slate-100 dark:border-gray-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400 w-14"></th>
                {[
                  { k:'name' as SortKey,    l:'Producto' },
                  { k:'price' as SortKey,   l:'Precio' },
                  { k:'margin' as SortKey,  l:'Margen' },
                  { k:'stock' as SortKey,   l:'Stock' },
                  { k:'revenue' as SortKey, l:'Revenue' },
                ].map(({ k, l }) => (
                  <th key={k} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400">
                    <button onClick={() => toggleSort(k)} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-gray-200 transition-colors">
                      {l}
                      <ArrowUpDown size={11} className={sortKey === k ? 'text-blue-500' : 'opacity-30'} />
                    </button>
                  </th>
                ))}
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400">Estado</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-gray-400">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => {
                const m = margin(p)
                const stats = productStats[p.id]
                return (
                  <tr key={p.id} className={`table-row cursor-pointer ${!p.isActive ? 'opacity-55' : ''}`}
                    onClick={() => setSelected(p)}>
                    {/* Thumbnail */}
                    <td className="px-4 py-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
                        {p.image
                          ? <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                          : <div className={`w-full h-full bg-gradient-to-br ${catGrad(p.category)} flex items-center justify-center`}>
                              <span className="text-lg">{catEmoji(p.category)}</span>
                            </div>
                        }
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800 dark:text-gray-200">{p.name}</p>
                      <p className="text-xs text-slate-400 dark:text-gray-500">{p.sku} · {p.category}</p>
                      {p.description && <p className="text-xs text-slate-400 dark:text-gray-500 truncate max-w-[200px]">{p.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{formatCOP(p.price)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${marginColor(m)}`}>
                        {m.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-gray-300">{p.stock} {p.unit}</td>
                    <td className="px-4 py-3">
                      {stats ? (
                        <div>
                          <p className="font-semibold text-slate-700 dark:text-gray-200">{formatCOP(stats.revenue)}</p>
                          <p className="text-xs text-slate-400 dark:text-gray-500">{stats.units} u</p>
                        </div>
                      ) : <span className="text-slate-400 dark:text-gray-500 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`badge ${p.isActive ? 'badge-green' : 'badge-gray'}`}>
                        {p.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {canEdit('products') && (
                          <button className="btn btn-sm btn-secondary flex items-center gap-1"
                            onClick={() => { setEdit(p); setShowModal(true) }}>
                            <Pencil size={11} />
                          </button>
                        )}
                        {canDelete('products') && (
                          <button className="btn btn-sm flex items-center gap-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-red-200 dark:border-red-800"
                            onClick={() => setDel(p)}>
                            <Trash2 size={11} />
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
            <div className="text-center py-12 text-slate-400 dark:text-gray-600">
              <Package size={36} className="mx-auto mb-3 opacity-30" />
              <p>No se encontraron productos</p>
            </div>
          )}
          <div className="px-4 pb-2">
            <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onPage={setPage} />
          </div>
        </div>
      )}

      {/* Product detail drawer */}
      {selected && (
        <ProductDrawer
          product={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { setEdit(selected); setShowModal(true); setSelected(null) }}
          soldUnits={productStats[selected.id]?.units ?? 0}
          revenue={productStats[selected.id]?.revenue ?? 0}
          orderHistory={productStats[selected.id]?.history ?? []}
        />
      )}

      {showModal && <ProductModal product={editProduct} onClose={() => { setShowModal(false); setEdit(undefined) }} />}
      {deleteTarget && (
        <ConfirmDelete
          name={deleteTarget.name}
          loading={deleting}
          onCancel={() => setDel(null)}
          onConfirm={async () => {
            setDeleting(true)
            await deleteProduct(deleteTarget.id)
            setDeleting(false)
            setDel(null)
          }}
        />
      )}
      {showImport && (
        <ImportModal
          entity="products"
          onClose={() => setShowImport(false)}
          onSuccess={() => loadAllData(true)}
        />
      )}
    </div>
  )
}
