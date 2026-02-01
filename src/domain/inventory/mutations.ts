/**
 * Inventory Mutations
 */
import { Schema } from "effect"

import { EntityId } from "../entities.js"

export class AddItemMutation extends Schema.TaggedClass<AddItemMutation>()(
  "AddItem",
  {
    entityId: EntityId,
    itemId: EntityId
  }
) {}

export class RemoveItemMutation extends Schema.TaggedClass<RemoveItemMutation>()(
  "RemoveItem",
  {
    entityId: EntityId,
    itemId: EntityId
  }
) {}

export class DebitCurrencyMutation extends Schema.TaggedClass<DebitCurrencyMutation>()(
  "DebitCurrency",
  {
    entityId: EntityId,
    copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    platinum: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class CreditCurrencyMutation extends Schema.TaggedClass<CreditCurrencyMutation>()(
  "CreditCurrency",
  {
    entityId: EntityId,
    copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    platinum: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class UseConsumableMutation extends Schema.TaggedClass<UseConsumableMutation>()(
  "UseConsumable",
  {
    consumableId: EntityId,
    targetId: EntityId,
    usesConsumed: Schema.Int.pipe(Schema.greaterThan(0))
  }
) {}

export class TransferItemMutation extends Schema.TaggedClass<TransferItemMutation>()(
  "TransferItem",
  {
    itemId: EntityId,
    fromEntityId: EntityId,
    toEntityId: EntityId
  }
) {}
