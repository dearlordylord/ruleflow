/**
 * ObservationLog types - tracks probabilistic event observations
 */
import { Schema } from "effect"

import { ObservationEntryId } from "../entities.js"
import { DomainEvent } from "../events.js"

export class ObservationEntry extends Schema.Class<ObservationEntry>("ObservationEntry")({
  id: ObservationEntryId,
  timestamp: Schema.Date,
  candidates: Schema.NonEmptyArray(Schema.Struct({
    event: DomainEvent,
    confidence: Schema.Number
  })),
  selectedIndex: Schema.NullOr(Schema.NonNegativeInt)
}) {}
