/**
 * System types
 */
import type { Chunk, Effect } from "effect"

import type { EntityId } from "../entities.js"
import type { Entity } from "../entity.js"
import type { DomainError, EntityNotFound } from "../errors.js"
import type { DomainEvent } from "../events.js"
import type { Mutation } from "../mutations.js"

export interface ReadonlyGameState {
  readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
}

/**
 * A system processes domain events and accumulated mutations to produce new mutations.
 * Systems may depend on mutations from prior systems in the pipeline, so ordering matters.
 * The accumulatedMutations parameter contains all mutations produced by earlier systems.
 */
export type System = (
  state: ReadonlyGameState,
  events: Chunk.Chunk<DomainEvent>,
  accumulatedMutations: Chunk.Chunk<Mutation>
) => Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, any>
