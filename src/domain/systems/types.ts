/**
 * System types
 */
import type { Chunk, Effect } from "effect"

import type { EntityId } from "../entities.js"
import type { Entity } from "../entity.js"
import type { DomainError, EntityNotFound } from "../errors.js"
import type { DomainEvent } from "../events.js"
import type { Mutation } from "../mutations.js"
import type { ConsistencyWarning } from "../warnings.js"

export interface ReadonlyGameState {
  readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
}

/**
 * The result of running a system: mutations to apply and any consistency warnings.
 */
export interface SystemResult {
  readonly mutations: Chunk.Chunk<Mutation>
  readonly warnings: Chunk.Chunk<ConsistencyWarning>
}

/**
 * A system processes domain events and accumulated mutations to produce new mutations
 * and consistency warnings.
 * Systems may depend on mutations from prior systems in the pipeline, so ordering matters.
 * The accumulatedMutations parameter contains all mutations produced by earlier systems.
 *
 * @template R - The Effect requirements (services/context) this system needs
 */
export type System<R = never> = (
  state: ReadonlyGameState,
  events: Chunk.Chunk<DomainEvent>,
  accumulatedMutations: Chunk.Chunk<Mutation>
) => Effect.Effect<SystemResult, Chunk.Chunk<DomainError>, R>

/**
 * Helper interface for registry entries with explicit requirements tracking.
 * Requirements are inferred from the System<R> type parameter.
 */
// eslint-disable-next-line functional/no-mixed-types -- Intentional: system is a function, name is metadata
export interface SystemEntry<R = never> {
  readonly name: string
  readonly system: System<R>
}

/**
 * Extract the requirements type R from a System<R>.
 */
export type SystemRequirements<S extends System<unknown>> = S extends System<infer R> ? R : never
