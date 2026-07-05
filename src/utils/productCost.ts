import type { Product, Recipe, Supply } from '../data/mockData'

/**
 * Compute the live cost of a product by resolving its recipe.
 * cost = Σ (ingredient.qty × supply.cost) / recipe.yieldQty
 *
 * If the product has no recipeId, or the recipe/ingredients are missing,
 * fall back to product.cost (the stored value).
 */
export function computeProductCost(
  product: Pick<Product, 'cost' | 'recipeId'>,
  recipes: Recipe[],
  supplies: Supply[],
): number {
  if (!product.recipeId) return product.cost
  const recipe = recipes.find((r) => r.id === product.recipeId)
  if (!recipe || !recipe.ingredients?.length || !recipe.yieldQty || recipe.yieldQty <= 0) {
    return product.cost
  }
  let totalCost = 0
  for (const ing of recipe.ingredients) {
    const supply = supplies.find((s) => s.id === ing.supplyId)
    if (!supply) continue
    totalCost += ing.qty * supply.cost
  }
  return totalCost / recipe.yieldQty
}

/**
 * Returns { live, stored, drift, isOutdated } for margin analysis.
 * drift is a decimal (0.08 = 8% difference); isOutdated is true when > 5%.
 */
export function computeProductCostAudit(
  product: Pick<Product, 'cost' | 'recipeId'>,
  recipes: Recipe[],
  supplies: Supply[],
): { live: number; stored: number; drift: number; isOutdated: boolean; hasRecipe: boolean } {
  const stored = product.cost
  const live = computeProductCost(product, recipes, supplies)
  const drift = stored > 0 ? Math.abs(live - stored) / stored : 0
  return {
    live,
    stored,
    drift,
    isOutdated: drift > 0.05,   // >5% difference is stale
    hasRecipe: Boolean(product.recipeId),
  }
}
