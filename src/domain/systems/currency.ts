/**
 * Currency Validation System
 */
import { Chunk, Effect } from "effect"

import { getComponent } from "../components.js"
import { SystemName } from "../entities.js"
import { DomainError } from "../errors.js"
import type { System } from "./types.js"

export const currencyValidationSystem: System = (state, pendingMutations) =>
  Effect.gen(function*() {
    const transferMutations = Chunk.filter(
      pendingMutations,
      (m) => m._tag === "TransferCurrency"
    )

    yield* Effect.forEach(transferMutations, (mutation) =>
      Effect.gen(function*() {
        const from = yield* state.getEntity(mutation.fromEntityId).pipe(
          Effect.orElseFail(() =>
            Chunk.of(
              DomainError.make({
                systemName: SystemName.make("CurrencyValidation"),
                message: `From entity ${mutation.fromEntityId} not found`
              })
            )
          )
        )

        const currency = getComponent(from, "Currency")
        if (!currency) {
          return yield* Effect.fail(
            Chunk.of(
              DomainError.make({
                systemName: SystemName.make("CurrencyValidation"),
                message: `From entity has no currency component`
              })
            )
          )
        }

        if (
          currency.copper < mutation.copper
          || currency.silver < mutation.silver
          || currency.gold < mutation.gold
        ) {
          return yield* Effect.fail(
            Chunk.of(
              DomainError.make({
                systemName: SystemName.make("CurrencyValidation"),
                message: `Insufficient funds for transfer`
              })
            )
          )
        }
      }))

    return Chunk.empty()
  })
