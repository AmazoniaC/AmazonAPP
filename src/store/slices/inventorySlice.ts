import type { StateCreator } from 'zustand'
import type { AppState } from '../state'
import type { Supply, Product, Recipe, InventoryMovement } from '../../data/mockData'
import { apiFetch } from '../api'
import { toast } from '../../components/Toast'

export interface InventorySlice {
  supplies:           Supply[]
  products:           Product[]
  recipes:            Recipe[]
  inventoryMovements: InventoryMovement[]

  addSupply:    (s: Supply)    => Promise<void>
  updateSupply: (s: Supply)    => Promise<void>
  deleteSupply: (id: string)   => Promise<void>
  addProduct:   (p: Product)   => Promise<void>
  updateProduct:(p: Product)   => Promise<void>
  deleteProduct:(id: string)   => Promise<void>
  addRecipe:    (r: Recipe)  => Promise<void>
  deleteRecipe: (id: string) => Promise<void>
  addInventoryMovement:   (m: InventoryMovement) => Promise<void>
  loadInventoryMovements: () => Promise<void>
}

export const createInventorySlice: StateCreator<AppState, [], [], InventorySlice> = (set) => ({
  supplies:           [],
  products:           [],
  recipes:            [],
  inventoryMovements: [],

  addSupply: async (supply) => {
    await apiFetch('/api/supplies', { method: 'POST', body: JSON.stringify(supply) })
    set((s) => ({ supplies: [...s.supplies, supply] }))
    toast.success('Insumo creado correctamente')
  },
  updateSupply: async (supply) => {
    await apiFetch(`/api/supplies/${supply.id}`, { method: 'PUT', body: JSON.stringify(supply) })
    set((s) => ({ supplies: s.supplies.map((x) => x.id === supply.id ? supply : x) }))
    toast.success('Insumo actualizado')
  },
  deleteSupply: async (id) => {
    await apiFetch(`/api/supplies/${id}`, { method: 'DELETE' })
    set((s) => ({ supplies: s.supplies.filter((x) => x.id !== id) }))
    toast.success('Insumo eliminado')
  },

  addProduct: async (product) => {
    await apiFetch('/api/products', { method: 'POST', body: JSON.stringify(product) })
    set((s) => ({ products: [...s.products, product] }))
    toast.success('Producto creado correctamente')
  },
  updateProduct: async (product) => {
    await apiFetch(`/api/products/${product.id}`, { method: 'PUT', body: JSON.stringify(product) })
    set((s) => ({ products: s.products.map((x) => x.id === product.id ? product : x) }))
    toast.success('Producto actualizado')
  },
  deleteProduct: async (id) => {
    await apiFetch(`/api/products/${id}`, { method: 'DELETE' })
    set((s) => ({ products: s.products.filter((x) => x.id !== id) }))
    toast.success('Producto eliminado')
  },

  addRecipe: async (recipe) => {
    await apiFetch('/api/recipes', { method: 'POST', body: JSON.stringify(recipe) })
    set((s) => ({ recipes: [...s.recipes, recipe] }))
  },
  deleteRecipe: async (id) => {
    await apiFetch(`/api/recipes/${id}`, { method: 'DELETE' })
    set((s) => ({ recipes: s.recipes.filter((x) => x.id !== id) }))
  },

  addInventoryMovement: async (m) => {
    await apiFetch('/api/inventory-movements', { method: 'POST', body: JSON.stringify(m) })
    set((st) => ({ inventoryMovements: [m, ...st.inventoryMovements] }))
  },
  loadInventoryMovements: async () => {
    const data = await apiFetch<InventoryMovement[]>('/api/inventory-movements').catch(() => [] as InventoryMovement[])
    set({ inventoryMovements: data })
  },
})
