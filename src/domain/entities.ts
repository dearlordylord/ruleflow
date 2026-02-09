/**
 * Branded IDs for type safety
 */
import { Schema } from "effect"

export const EntityId = Schema.UUID.pipe(Schema.brand("EntityId"))
export type EntityId = typeof EntityId.Type

export const EventLogEntryId = Schema.UUID.pipe(Schema.brand("EventLogEntryId"))
export type EventLogEntryId = typeof EventLogEntryId.Type

export const ObservationEntryId = Schema.UUID.pipe(Schema.brand("ObservationEntryId"))
export type ObservationEntryId = typeof ObservationEntryId.Type

export const SystemName = Schema.NonEmptyString.pipe(Schema.brand("SystemName"))
export type SystemName = typeof SystemName.Type
