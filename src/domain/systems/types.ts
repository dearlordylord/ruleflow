/**
 * System types
 */
import type { Chunk, Effect } from "effect"

import type { Entity } from "../components.js"
import type { EntityId } from "../entities.js"
import type { DomainError, EntityNotFound } from "../errors.js"
import type { Mutation } from "../mutations.js"

export interface ReadonlyGameState {
  readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
}

export type System = (
  state: ReadonlyGameState,
  pendingMutations: Chunk.Chunk<Mutation>
) => Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, unknown>
