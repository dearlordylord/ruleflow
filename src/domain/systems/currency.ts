/**
 * Currency Validation System
 */
import { Effect, Chunk, HashMap, Option } from "effect"
import type { System } from "./types.js"
import { SystemName } from "../entities.js"
import { DomainError } from "../errors.js"
import { CurrencyComponent } from "../components.js"

export const currencyValidationSystem: System = (state, pendingMutations) =>
  Effect.gen(function* () {
    const transferMutations = Chunk.filter(
      pendingMutations,
      (m) => m._tag === "TransferCurrency"
    )

    for (const mutation of transferMutations) {
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

      const currencyOpt = HashMap.get(from.components, "Currency")
      if (Option.isNone(currencyOpt)) {
        return yield* Effect.fail(
          Chunk.of(
            DomainError.make({
              systemName: SystemName.make("CurrencyValidation"),
              message: `From entity has no currency component`
            })
          )
        )
      }

      const currency = currencyOpt.value
      if (!(currency instanceof CurrencyComponent)) {
        continue
      }

      if (
        currency.copper < mutation.copper ||
        currency.silver < mutation.silver ||
        currency.gold < mutation.gold
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
    }

    return Chunk.empty()
  })
