/**
 * Domain errors
 */
import { Schema } from "effect"

import { EntityId, EventLogEntryId, SystemName } from "./entities.js"

export class EntityNotFound extends Schema.TaggedError<EntityNotFound>()(
  "EntityNotFound",
  { id: EntityId }
) {}

export class DomainError extends Schema.TaggedError<DomainError>()(
  "DomainError",
  {
    systemName: SystemName,
    message: Schema.NonEmptyString
  }
) {}

export class EventLogWriteError extends Schema.TaggedError<EventLogWriteError>()(
  "EventLogWriteError",
  {
    entryId: EventLogEntryId,
    error: Schema.Defect
  }
) {}

export class EventLogEntryNotFound extends Schema.TaggedError<EventLogEntryNotFound>()(
  "EventLogEntryNotFound",
  { id: EventLogEntryId }
) {}
