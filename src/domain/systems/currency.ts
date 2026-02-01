/**
 * Currency Transfer System
 */
import { Chunk, Effect } from "effect"

import { CurrencyTransferred } from "../events.js"
import { CreditCurrencyMutation, DebitCurrencyMutation } from "../mutations.js"
import type { System } from "./types.js"

export const currencyTransferSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const transferEvents = Chunk.filter(
      events,
      (event): event is CurrencyTransferred => event._tag === "CurrencyTransferred"
    )

    return Chunk.flatMap(transferEvents, (transfer) =>
      Chunk.make(
        DebitCurrencyMutation.make({
          entityId: transfer.fromEntityId,
          copper: transfer.copper,
          silver: transfer.silver,
          gold: transfer.gold,
          platinum: 0
        }),
        CreditCurrencyMutation.make({
          entityId: transfer.toEntityId,
          copper: transfer.copper,
          silver: transfer.silver,
          gold: transfer.gold,
          platinum: 0
        })
      )
    )
  })
