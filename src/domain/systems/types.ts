/**
 * System types
 */
import { Effect, Chunk } from "effect"
import { EntityId } from "../entities.js"
import { Entity } from "../components.js"
import { Mutation } from "../mutations.js"
import { DomainError, EntityNotFound } from "../errors.js"

export interface ReadonlyGameState {
  readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
}

export type System = (
  state: ReadonlyGameState,
  pendingMutations: Chunk.Chunk<Mutation>
) => Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, any>
