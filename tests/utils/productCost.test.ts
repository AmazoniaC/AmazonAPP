import { describe, it, expect } from 'vitest'
import { computeProductCost, computeProductCostAudit } from '../../src/utils/productCost'
import type { Product, Recipe, Supply } from '../../src/data/mockData'

function supply(id: string, cost: number): Supply {
  return { id, sku: id, name: id, category: 'general', unit: 'kg', stock: 0, minStock: 0, cost }
}

function recipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: 'r1', name: 'Receta', productId: 'p1',
    yieldQty: 10, yieldUnit: 'u',
    ingredients: [],
    totalCost: 0, costPerUnit: 0,
    ...overrides,
  }
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: 'p1', sku: 'P1', name: 'Producto', category: 'general',
    unit: 'u', stock: 0, price: 100, cost: 50, isActive: true,
    ...overrides,
  }
}

describe('computeProductCost', () => {
  it('falls back to the stored cost when the product has no recipeId', () => {
    expect(computeProductCost(product({ recipeId: undefined, cost: 42 }), [], [])).toBe(42)
  })

  it('falls back to the stored cost when the recipe cannot be found', () => {
    expect(computeProductCost(product({ recipeId: 'missing', cost: 42 }), [recipe()], [])).toBe(42)
  })

  it('falls back to the stored cost when the recipe has no ingredients', () => {
    const r = recipe({ ingredients: [] })
    expect(computeProductCost(product({ recipeId: 'r1', cost: 42 }), [r], [])).toBe(42)
  })

  it('falls back to the stored cost when yieldQty is zero or negative', () => {
    const r = recipe({
      yieldQty: 0,
      ingredients: [{ supplyId: 's1', supplyName: 'Cemento', qty: 1, unit: 'kg', cost: 10 }],
    })
    expect(computeProductCost(product({ recipeId: 'r1', cost: 42 }), [r], [supply('s1', 10)])).toBe(42)
  })

  it('computes cost as sum(qty × supply.cost) / yieldQty', () => {
    const r = recipe({
      yieldQty: 10,
      ingredients: [
        { supplyId: 's1', supplyName: 'Cemento', qty: 5, unit: 'kg', cost: 0 },
        { supplyId: 's2', supplyName: 'Arena',   qty: 2, unit: 'kg', cost: 0 },
      ],
    })
    const supplies = [supply('s1', 4), supply('s2', 3)]
    // (5*4 + 2*3) / 10 = 26/10 = 2.6
    expect(computeProductCost(product({ recipeId: 'r1' }), [r], supplies)).toBeCloseTo(2.6)
  })

  it('skips ingredients whose supply no longer exists, instead of throwing', () => {
    const r = recipe({
      yieldQty: 2,
      ingredients: [
        { supplyId: 's1', supplyName: 'Cemento', qty: 1, unit: 'kg', cost: 0 },
        { supplyId: 'deleted', supplyName: 'Ya no existe', qty: 99, unit: 'kg', cost: 0 },
      ],
    })
    // Only s1 counts: 1*4 / 2 = 2
    expect(computeProductCost(product({ recipeId: 'r1' }), [r], [supply('s1', 4)])).toBe(2)
  })
})

describe('computeProductCostAudit', () => {
  it('reports zero drift and not outdated when live matches stored', () => {
    const r = recipe({
      yieldQty: 10,
      ingredients: [{ supplyId: 's1', supplyName: 'Cemento', qty: 10, unit: 'kg', cost: 0 }],
    })
    const audit = computeProductCostAudit(product({ recipeId: 'r1', cost: 5 }), [r], [supply('s1', 5)])
    expect(audit).toMatchObject({ live: 5, stored: 5, drift: 0, isOutdated: false, hasRecipe: true })
  })

  it('flags isOutdated when live cost drifts more than 5% from stored', () => {
    const r = recipe({
      yieldQty: 10,
      ingredients: [{ supplyId: 's1', supplyName: 'Cemento', qty: 10, unit: 'kg', cost: 0 }],
    })
    // live = 10*10/10 = 10; stored = 8 -> drift = |10-8|/8 = 0.25 (25%)
    const audit = computeProductCostAudit(product({ recipeId: 'r1', cost: 8 }), [r], [supply('s1', 10)])
    expect(audit.live).toBe(10)
    expect(audit.drift).toBeCloseTo(0.25)
    expect(audit.isOutdated).toBe(true)
  })

  it('does not divide by zero when stored cost is zero', () => {
    const audit = computeProductCostAudit(product({ recipeId: undefined, cost: 0 }), [], [])
    expect(audit.drift).toBe(0)
    expect(audit.isOutdated).toBe(false)
  })

  it('reports hasRecipe false when the product has no recipeId', () => {
    const audit = computeProductCostAudit(product({ recipeId: undefined }), [], [])
    expect(audit.hasRecipe).toBe(false)
  })
})
