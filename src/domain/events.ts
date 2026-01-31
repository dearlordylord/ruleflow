/**
 * Domain Events - source of truth for event sourcing
 */
import { Schema } from "effect"

import { EntityId } from "./entities.js"

export class AttackPerformed extends Schema.TaggedClass<AttackPerformed>()(
  "AttackPerformed",
  {
    attackerId: EntityId,
    targetId: EntityId,
    weaponId: EntityId,
    attackRoll: Schema.Int.pipe(Schema.between(1, 20)),
    isCritical: Schema.Boolean
  }
) {}

export class CurrencyTransferred extends Schema.TaggedClass<CurrencyTransferred>()(
  "CurrencyTransferred",
  {
    fromEntityId: EntityId,
    toEntityId: EntityId,
    copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
    gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
  }
) {}

export const DomainEvent = Schema.Union(AttackPerformed, CurrencyTransferred)
export type DomainEvent = typeof DomainEvent.Type
