/**
 * Inventory component mutation applicators.
 *
 * DAG: items (component schema) → mutations → componentMutations (imports both)
 */
import { DEFAULT_INVENTORY, InventoryComponent } from "./items.js"
import type { AddItemMutation, RemoveItemMutation } from "./mutations.js"

export function applyAddItemMutation(
  existing: InventoryComponent | null,
  mutation: AddItemMutation
): InventoryComponent {
  const base = existing ?? InventoryComponent.make(DEFAULT_INVENTORY)
  return InventoryComponent.make({
    items: [...base.items, mutation.itemId],
    loadCapacity: base.loadCapacity,
    currentLoad: base.currentLoad
  })
}

export function applyRemoveItemMutation(
  existing: InventoryComponent | null,
  mutation: RemoveItemMutation
): InventoryComponent {
  const base = existing ?? InventoryComponent.make(DEFAULT_INVENTORY)
  return InventoryComponent.make({
    items: base.items.filter(id => id !== mutation.itemId),
    loadCapacity: base.loadCapacity,
    currentLoad: base.currentLoad
  })
}
