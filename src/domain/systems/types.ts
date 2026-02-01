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
 *
 * @template R - The Effect requirements (services/context) this system needs
 */
export type System<R = never> = (
  state: ReadonlyGameState,
  events: Chunk.Chunk<DomainEvent>,
  accumulatedMutations: Chunk.Chunk<Mutation>
) => Effect.Effect<Chunk.Chunk<Mutation>, Chunk.Chunk<DomainError>, R>

/**
 * Helper interface for registry entries with explicit requirements tracking.
 * The _R field is a phantom type that captures the requirements at the type level.
 */
export interface SystemEntry<R = never> {
  readonly name: string
  readonly system: System<R>
  /** Phantom type field - not used at runtime, only for type inference */
  readonly _R: R
}
