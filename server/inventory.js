// Centralizes "adjust stock + log the movement" — until now implemented
// three different ways with three different guarantees: purchase-order
// receiving updated supply stock directly with no movement logged at all,
// production finalize and a planned return both needed the same two-step
// write. Always call this inside an existing transaction (pass its client)
// so the stock update and the movement row commit or roll back together.
export async function applyStockDelta(client, {
  id, itemId, itemType, delta, movementType, reference, notes, createdBy,
}) {
  const table = itemType === 'product' ? 'products' : 'supplies'
  const { rows } = await client.query(
    `UPDATE ${table} SET stock = stock + $1 WHERE id = $2 RETURNING stock::float, name, unit`,
    [delta, itemId]
  )
  if (rows.length === 0) throw new Error(`${itemType === 'product' ? 'Producto' : 'Insumo'} ${itemId} no encontrado`)
  const newStock = rows[0].stock
  const previousStock = newStock - delta
  await client.query(
    `INSERT INTO inventory_movements
       (id, item_id, item_name, item_type, movement_type, quantity, previous_stock, new_stock, unit, reference, notes, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [
      id, itemId, rows[0].name, itemType, movementType, Math.abs(delta),
      previousStock, newStock, rows[0].unit ?? 'u', reference ?? '', notes ?? '', createdBy ?? 'Sistema',
    ]
  )
  return newStock
}
