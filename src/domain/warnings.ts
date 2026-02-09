/**
 * Consistency warnings emitted by systems during event evaluation
 */
import { Schema } from "effect"

import { EntityId, SystemName } from "./entities.js"

export const ZeroToOne = Schema.Number.pipe(
  Schema.greaterThanOrEqualTo(0),
  Schema.lessThanOrEqualTo(1),
  Schema.brand("ZeroToOne")
)
export type ZeroToOne = typeof ZeroToOne.Type

export class ConsistencyWarning extends Schema.Class<ConsistencyWarning>("ConsistencyWarning")({
  systemName: SystemName,
  problem: Schema.NonEmptyString,
  severity: ZeroToOne,
  affectedEntities: Schema.Array(EntityId)
}) {}
