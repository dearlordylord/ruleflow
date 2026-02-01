/**
 * Inventory Mutations
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

// Re-export from main mutations to avoid duplication
export {
  AddItemMutation,
  CreateEntityMutation,
  CreditCurrencyMutation,
  DebitCurrencyMutation,
  RemoveItemMutation,
  TransferItemMutation
} from "../mutations.js"

export class UseConsumableMutation extends Schema.TaggedClass<UseConsumableMutation>()(
  "UseConsumable",
  {
    consumableId: EntityId,
    targetId: EntityId,
    usesConsumed: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class UpdateInventoryLoadMutation extends Schema.TaggedClass<UpdateInventoryLoadMutation>()(
  "UpdateInventoryLoad",
  {
    entityId: EntityId,
    newLoad: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}
