/**
 * Item Purchase System
 * Processes ItemPurchased events and validates currency/encumbrance
 */
import { Chunk, Effect } from "effect"

import { SystemName } from "../entities.js"
import { getComponent } from "../entity.js"
import { DomainError } from "../errors.js"
import { hasSufficientFunds } from "../inventory/currency.js"
import { ItemPurchased } from "../inventory/events.js"
import { UpdateInventoryLoadMutation } from "../inventory/mutations.js"
import { AddItemMutation, CreditCurrencyMutation, DebitCurrencyMutation, TransferItemMutation } from "../mutations.js"
import type { System } from "./types.js"

export const itemPurchaseSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const purchaseEvents = Chunk.filter(
      events,
      (event): event is ItemPurchased => event._tag === "ItemPurchased"
    )

    const mutations = yield* Effect.forEach(
      purchaseEvents,
      (purchase) =>
        Effect.gen(function*() {
          // 1. Validate buyer exists and has currency component
          const buyer = yield* state.getEntity(purchase.buyerId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ItemPurchase"),
                  message: `Buyer ${purchase.buyerId} not found`
                })
              )
            )
          )

          // 2. Validate buyer has sufficient funds
          const buyerCurrency = getComponent(buyer, "Currency")!
          if (!hasSufficientFunds(buyerCurrency, purchase.priceInCopper)) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ItemPurchase"),
                  message: `Buyer has insufficient funds: need ${purchase.priceInCopper} copper, have ${buyerCurrency.totalCopper} copper`
                })
              )
            )
          }

          // 4. Validate item exists
          const item = yield* state.getEntity(purchase.itemId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ItemPurchase"),
                  message: `Item ${purchase.itemId} not found`
                })
              )
            )
          )

          // 5. Validate buyer has inventory and item has load info
          const itemComp = getComponent(item, "Item")
          if (!itemComp) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ItemPurchase"),
                  message: `Item ${purchase.itemId} has no Item component`
                })
              )
            )
          }

          const buyerInventory = getComponent(buyer, "Inventory")
          if (!buyerInventory) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ItemPurchase"),
                  message: `Buyer ${purchase.buyerId} has no Inventory component`
                })
              )
            )
          }

          const newLoad = buyerInventory.currentLoad + itemComp.loadValue
          if (newLoad > buyerInventory.loadCapacity) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ItemPurchase"),
                  message: `Adding item would exceed load capacity: ${newLoad} > ${buyerInventory.loadCapacity}`
                })
              )
            )
          }

          // 6. Fetch seller if specified and validate ownership
          let seller: typeof buyer | null = null
          let sellerInventory: ReturnType<typeof getComponent<"Inventory">> | null = null

          if (purchase.sellerId) {
            seller = yield* state.getEntity(purchase.sellerId).pipe(
              Effect.orElseFail(() =>
                Chunk.of(
                  DomainError.make({
                    systemName: SystemName.make("ItemPurchase"),
                    message: `Seller ${purchase.sellerId} not found`
                  })
                )
              )
            )

            sellerInventory = getComponent(seller, "Inventory")
            if (!sellerInventory) {
              return yield* Effect.fail(
                Chunk.of(
                  DomainError.make({
                    systemName: SystemName.make("ItemPurchase"),
                    message: `Seller ${purchase.sellerId} has no Inventory component`
                  })
                )
              )
            }

            if (!sellerInventory.items.includes(purchase.itemId)) {
              return yield* Effect.fail(
                Chunk.of(
                  DomainError.make({
                    systemName: SystemName.make("ItemPurchase"),
                    message: `Seller ${purchase.sellerId} does not own item ${purchase.itemId}`
                  })
                )
              )
            }
          }

          // 7. Build mutations
          const muts = Chunk.make(
            DebitCurrencyMutation.make({
              entityId: purchase.buyerId,
              copper: purchase.priceInCopper,
              silver: 0,
              gold: 0,
              platinum: 0
            }),
            UpdateInventoryLoadMutation.make({
              entityId: purchase.buyerId,
              newLoad
            })
          )

          // If seller exists, credit them, transfer item, and update seller's load
          if (purchase.sellerId && sellerInventory) {
            const sellerNewLoad = sellerInventory.currentLoad - itemComp.loadValue

            return Chunk.appendAll(
              muts,
              Chunk.make(
                CreditCurrencyMutation.make({
                  entityId: purchase.sellerId,
                  copper: purchase.priceInCopper,
                  silver: 0,
                  gold: 0,
                  platinum: 0
                }),
                TransferItemMutation.make({
                  itemId: purchase.itemId,
                  fromEntityId: purchase.sellerId,
                  toEntityId: purchase.buyerId
                }),
                UpdateInventoryLoadMutation.make({
                  entityId: purchase.sellerId,
                  newLoad: sellerNewLoad
                })
              )
            )
          } else {
            // No seller, add item to buyer's inventory (spawn new item)
            return Chunk.append(
              muts,
              AddItemMutation.make({
                entityId: purchase.buyerId,
                itemId: purchase.itemId
              })
            )
          }
        }),
      { concurrency: "unbounded" }
    )

    return Chunk.flatten(Chunk.unsafeFromArray(mutations))
  })
