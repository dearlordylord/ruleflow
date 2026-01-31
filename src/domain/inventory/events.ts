/**
 * Inventory Domain Events
 */
import { Schema } from "effect"

import type { EntityId } from "../entities.js"

export class CurrencyTransferred extends Schema.TaggedClass<CurrencyTransferred>()(
  "CurrencyTransferred",
  {
    fromEntityId: EntityId,
    toEntityId: EntityId,
    copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    platinum: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class ItemPurchased extends Schema.TaggedClass<ItemPurchased>()(
  "ItemPurchased",
  {
    buyerId: EntityId,
    sellerId: Schema.NullOr(EntityId),
    itemId: EntityId,
    priceInCopper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class ItemSold extends Schema.TaggedClass<ItemSold>()(
  "ItemSold",
  {
    sellerId: EntityId,
    buyerId: Schema.NullOr(EntityId),
    itemId: EntityId,
    priceInCopper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export class ConsumableUsed extends Schema.TaggedClass<ConsumableUsed>()(
  "ConsumableUsed",
  {
    userId: EntityId,
    consumableId: EntityId,
    targetId: EntityId,
    effectApplied: Schema.NonEmptyString
  }
) {}
