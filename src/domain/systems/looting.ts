/**
 * Looting Systems
 */
import { Chunk, Effect } from "effect"

import type { CharacterDied } from "../character/events.js"
import { EntityId, SystemName } from "../entities.js"
import { Entity, getComponent } from "../entity.js"
import { DomainError } from "../errors.js"
import { CurrencyComponent } from "../inventory/currency.js"
import { InventoryComponent, ItemComponent } from "../inventory/items.js"
import type {
  ContainerDiscovered,
  ContainerSearched,
  ItemDiscovered,
  ItemDropped,
  ItemLooted,
  LootDistributed
} from "../inventory/loot-events.js"
import { ContainerComponent, CorpseComponent, DroppedItemComponent } from "../inventory/looting.js"
import {
  AddItemMutation,
  CreateEntityMutation,
  CreditCurrencyMutation,
  DebitCurrencyMutation,
  RemoveItemMutation,
  TransferItemMutation
} from "../inventory/mutations.js"
import { SetMultipleComponentsMutation } from "../mutations.js"
import type { System } from "./types.js"

/**
 * Item templates - maps template IDs to item properties
 * TODO: Move to separate config/data file
 */
const ITEM_TEMPLATES: Record<
  string,
  {
    name: string
    loadSize: "Small" | "Standard" | "Large" | "Massive"
    valueInCopper: number
    isStackable: boolean
  }
> = {
  Rope: { name: "Rope (50ft)", loadSize: "Standard", valueInCopper: 20, isStackable: false },
  Torch: { name: "Torch", loadSize: "Small", valueInCopper: 1, isStackable: true },
  Rations: { name: "Rations (1 day)", loadSize: "Small", valueInCopper: 5, isStackable: true },
  RustyShortSword: { name: "Rusty Short Sword", loadSize: "Small", valueInCopper: 100, isStackable: false },
  LeatherArmor: { name: "Leather Armor", loadSize: "Standard", valueInCopper: 200, isStackable: false },
  GoldRing: { name: "Gold Ring", loadSize: "Small", valueInCopper: 5000, isStackable: false },
  SilverChalice: { name: "Silver Chalice", loadSize: "Small", valueInCopper: 2500, isStackable: false }
}

/**
 * Item Discovery System
 * Processes ItemDiscovered → creates item entity from template
 */
export const itemDiscoverySystem: System = (_state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const discoveryEvents = Chunk.filter(
      events,
      (event): event is ItemDiscovered => event._tag === "ItemDiscovered"
    )

    return Chunk.flatMap(discoveryEvents, (event) => {
      // Look up template
      const template = ITEM_TEMPLATES[event.templateId]
      if (!template) {
        // Skip invalid templates (could log error)
        return Chunk.empty()
      }

      // Generate new entity ID
      const itemId = EntityId.make(crypto.randomUUID())

      // Create item entity
      const itemEntity = Entity.make({
        id: itemId,
        components: [
          ItemComponent.make({
            name: template.name,
            loadSize: template.loadSize,
            quantity: event.quantity,
            isStackable: template.isStackable,
            valueInCopper: template.valueInCopper
          })
        ]
      })

      // Create entity mutation
      const createMutation = CreateEntityMutation.make({ entity: itemEntity })

      // If discovered in container/corpse, add to their inventory
      if (event.discoveredAt) {
        const addToInventory = AddItemMutation.make({
          entityId: event.discoveredAt,
          itemId
        })
        return Chunk.make(createMutation, addToInventory)
      }

      return Chunk.of(createMutation)
    })
  })

/**
 * Container Discovery System
 * Processes ContainerDiscovered → creates container entity
 */
export const containerDiscoverySystem: System = (_state, events, _accumulatedMutations) =>
  Effect.succeed(
    Chunk.flatMap(
      Chunk.filter(
        events,
        (event): event is ContainerDiscovered => event._tag === "ContainerDiscovered"
      ),
      (event) => {
        const containerId = EntityId.make(crypto.randomUUID())

        const containerEntity = Entity.make({
          id: containerId,
          components: [
            ContainerComponent.make({
              containerType: event.containerType,
              isLocked: event.isLocked,
              isTrapped: event.isTrapped,
              isSearched: false,
              hiddenItems: []
            })
            // Inventory is None (not present) = unknown contents
          ]
        })

        return Chunk.of(CreateEntityMutation.make({ entity: containerEntity }))
      }
    )
  )

/**
 * Corpse Creation System
 * Processes CharacterDied → creates corpse entity with dead character's inventory
 */
export const corpseCreationSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const deathEvents = Chunk.filter(
      events,
      (event): event is CharacterDied => event._tag === "CharacterDied"
    )

    const mutationChunks = yield* Effect.all(
      Chunk.map(deathEvents, (event) =>
        Effect.gen(function*() {
          const deadCharacter = yield* state.getEntity(event.entityId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("CorpseCreation"),
                  message: `Dead character ${event.entityId} not found`
                })
              )
            )
          )

          // Generate corpse ID
          const corpseId = EntityId.make(crypto.randomUUID())

          // Get inventory and currency from dead character
          const inventory = getComponent(deadCharacter, "Inventory")
          const currency = getComponent(deadCharacter, "Currency")

          // Create corpse with EMPTY inventory/currency
          // Items/currency transferred via mutations below
          const corpseEntity = Entity.make({
            id: corpseId,
            components: [
              CorpseComponent.make({
                deathTime: Date.now(),
                killedBy: event.killedBy,
                decayTimer: null // No decay for now
              }),
              InventoryComponent.make({
                items: [],
                loadCapacity: 0, // Corpses don't have capacity limits
                currentLoad: 0
              }),
              CurrencyComponent.make({
                copper: 0,
                silver: 0,
                gold: 0,
                platinum: 0
              })
            ]
          })

          // Transfer items from character to corpse
          const transferMutations = inventory
            ? Chunk.fromIterable(inventory.items).pipe(
              Chunk.map((itemId) =>
                TransferItemMutation.make({
                  itemId,
                  fromEntityId: event.entityId,
                  toEntityId: corpseId
                })
              )
            )
            : Chunk.empty()

          // Transfer currency if present
          const currencyMutations = currency
            ? Chunk.make(
              DebitCurrencyMutation.make({
                entityId: event.entityId,
                copper: currency.copper,
                silver: currency.silver,
                gold: currency.gold,
                platinum: currency.platinum
              }),
              CreditCurrencyMutation.make({
                entityId: corpseId,
                copper: currency.copper,
                silver: currency.silver,
                gold: currency.gold,
                platinum: currency.platinum
              })
            )
            : Chunk.empty()

          return Chunk.make(CreateEntityMutation.make({ entity: corpseEntity })).pipe(
            Chunk.appendAll(transferMutations),
            Chunk.appendAll(currencyMutations)
          )
        })),
      { concurrency: "unbounded" }
    )

    return Chunk.flatten(Chunk.fromIterable(mutationChunks))
  })

/**
 * Item Looting System
 * Processes ItemLooted → validates and transfers item
 * Action cost: Main action (from corpse/container), Bonus action (from ground)
 */
export const itemLootingSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const lootEvents = Chunk.filter(
      events,
      (event): event is ItemLooted => event._tag === "ItemLooted"
    )

    const mutationChunks = yield* Effect.all(
      Chunk.map(lootEvents, (event) =>
        Effect.gen(function*() {
          // Validate source has the item
          const source = yield* state.getEntity(event.sourceId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ItemLooting"),
                  message: `Source ${event.sourceId} not found`
                })
              )
            )
          )

          const sourceInventory = getComponent(source, "Inventory")
          if (!sourceInventory || !sourceInventory.items.includes(event.itemId)) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ItemLooting"),
                  message: `Item ${event.itemId} not in source ${event.sourceId} inventory`
                })
              )
            )
          }

          // Validate looter exists
          yield* state.getEntity(event.looterId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ItemLooting"),
                  message: `Looter ${event.looterId} not found`
                })
              )
            )
          )

          // Encumbrance validation happens in encumbranceValidationSystem
          // We just emit the transfer mutation

          return Chunk.of(
            TransferItemMutation.make({
              itemId: event.itemId,
              fromEntityId: event.sourceId,
              toEntityId: event.looterId
            })
          )
        })),
      { concurrency: "unbounded" }
    )

    return Chunk.flatten(Chunk.fromIterable(mutationChunks))
  })

/**
 * Item Drop System
 * Processes ItemDropped → removes from inventory, adds DroppedItem component
 * Item entity keeps same ID - just changes components
 */
export const itemDropSystem: System = (_state, events, _accumulatedMutations) =>
  Effect.succeed(
    Chunk.flatMap(
      Chunk.filter(
        events,
        (event): event is ItemDropped => event._tag === "ItemDropped"
      ),
      (event) =>
        Chunk.make(
          RemoveItemMutation.make({
            entityId: event.dropperId,
            itemId: event.itemId
          }),
          SetMultipleComponentsMutation.make({
            entityId: event.itemId,
            components: [
              DroppedItemComponent.make({
                droppedBy: event.dropperId,
                droppedAt: Date.now(),
                reason: event.reason
              })
              // TODO: Add PositionComponent when room system exists
            ],
            removeComponents: []
          })
        )
    )
  )

/**
 * Container Search System
 * Processes ContainerSearched → reveals inventory contents
 */
export const containerSearchSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const searchEvents = Chunk.filter(
      events,
      (event): event is ContainerSearched => event._tag === "ContainerSearched"
    )

    const mutationChunks = yield* Effect.all(
      Chunk.map(searchEvents, (event) =>
        Effect.gen(function*() {
          const container = yield* state.getEntity(event.containerId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ContainerSearch"),
                  message: `Container ${event.containerId} not found`
                })
              )
            )
          )

          const containerComp = getComponent(container, "Container")
          if (!containerComp) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ContainerSearch"),
                  message: `Entity ${event.containerId} is not a container`
                })
              )
            )
          }

          // Check if locked (if known)
          if (containerComp.isLocked === true) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("ContainerSearch"),
                  message: `Container ${event.containerId} is locked`
                })
              )
            )
          }

          // If already searched, nothing to do
          if (containerComp.isSearched) {
            return Chunk.empty()
          }

          // TODO: Mark as searched, move hiddenItems to inventory
          // Needs component update mutation (SetMultipleComponents or specific UpdateContainer mutation)
          return Chunk.empty()
        })),
      { concurrency: "unbounded" }
    )

    return Chunk.flatten(Chunk.fromIterable(mutationChunks))
  })

/**
 * Container Lock Discovery System
 * Processes ContainerLockDiscovered → updates lock status
 * TODO: Implement using SetMultipleComponentsMutation to update ContainerComponent.isLocked
 */
export const containerLockDiscoverySystem: System = (_state, _events, _accumulatedMutations) =>
  Effect.succeed(Chunk.empty())

/**
 * Loot Distribution System
 * Processes LootDistributed → emits transfer mutations for bulk distribution
 */
export const lootDistributionSystem: System = (_state, events, _accumulatedMutations) =>
  Effect.succeed(
    Chunk.flatMap(
      Chunk.filter(
        events,
        (event): event is LootDistributed => event._tag === "LootDistributed"
      ),
      (event) => {
        // No party leader validation (trust player coordination)

        // Emit transfer mutations for each distribution
        return Chunk.flatMap(
          Chunk.fromIterable(event.distributions),
          (dist) => {
            const itemTransfers = Chunk.map(
              Chunk.fromIterable(dist.itemIds),
              (itemId) =>
                TransferItemMutation.make({
                  itemId,
                  fromEntityId: event.distributorId,
                  toEntityId: dist.recipientId
                })
            )

            const hasCurrency = dist.copper > 0 || dist.silver > 0 || dist.gold > 0 || dist.platinum > 0

            const currencyTransfers = hasCurrency
              ? Chunk.make(
                DebitCurrencyMutation.make({
                  entityId: event.distributorId,
                  copper: dist.copper,
                  silver: dist.silver,
                  gold: dist.gold,
                  platinum: dist.platinum
                }),
                CreditCurrencyMutation.make({
                  entityId: dist.recipientId,
                  copper: dist.copper,
                  silver: dist.silver,
                  gold: dist.gold,
                  platinum: dist.platinum
                })
              )
              : Chunk.empty()

            return Chunk.appendAll(itemTransfers, currencyTransfers)
          }
        )
      }
    )
  )
