/**
 * Game State - applies mutations to read model
 */
import { Context, Effect, Layer } from "effect"

import { Entity, getComponent, removeComponent, setComponent } from "../entity.js"
import { CurrencyComponent } from "../inventory/currency.js"
import { InventoryComponent } from "../inventory/items.js"
import { ConsumableComponent } from "../inventory/consumables.js"
import { HealthComponent, CharacterCreationComponent } from "../character/index.js"
import { WeaponComponent, EquippedWeaponsComponent } from "../combat/weapons.js"
import { ArmorComponent, ShieldComponent, EquippedArmorComponent } from "../combat/index.js"
import { CombatStatsComponent } from "../combat/stats.js"
import type { EntityId } from "../entities.js"
import type { EntityNotFound } from "../errors.js"
import type { Mutation } from "../mutations.js"
import { createComponentFromMutation } from "./helpers.js"
import { ReadModelStore } from "./ReadModelStore.js"

export class GameState extends Context.Tag("@game/State")<
  GameState,
  {
    readonly getEntity: (id: EntityId) => Effect.Effect<Entity, EntityNotFound>
    readonly applyMutation: (mutation: Mutation) => Effect.Effect<void, EntityNotFound>
  }
>() {
  static readonly layer = Layer.effect(
    GameState,
    Effect.gen(function*() {
      const store = yield* ReadModelStore

      const getEntity = (id: EntityId) => store.get(id)

      const applyMutation = (mutation: Mutation) =>
        Effect.gen(function*() {
          switch (mutation._tag) {
            case "RemoveComponent":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.succeed(removeComponent(entity, mutation.componentTag)))
              break

            case "SetMultipleComponents":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  let updated = entity

                  // Remove components first
                  for (const tag of mutation.removeComponents) {
                    updated = removeComponent(updated, tag)
                  }

                  // Set all components
                  for (const component of mutation.components) {
                    updated = setComponent(updated, component)
                  }

                  return updated
                }))
              break

            case "DealDamage":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const health = getComponent(entity, "Health")
                  if (!health) {
                    return entity
                  }
                  const newCurrent = Math.max(0, health.current - mutation.amount)
                  const newHealth = HealthComponent.make({
                    current: newCurrent,
                    max: health.max,
                    traumaActive: health.traumaActive,
                    traumaEffect: health.traumaEffect
                  })
                  return setComponent(entity, newHealth)
                }))
              break

            case "DebitCurrency":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const currency = getComponent(entity, "Currency")
                  if (!currency) {
                    return entity
                  }
                  const newCurrency = CurrencyComponent.make({
                    copper: currency.copper - mutation.copper,
                    silver: currency.silver - mutation.silver,
                    gold: currency.gold - mutation.gold
                  })
                  return setComponent(entity, newCurrency)
                }))
              break

            case "CreditCurrency":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const currency = getComponent(entity, "Currency")
                  if (!currency) {
                    return entity
                  }
                  const newCurrency = CurrencyComponent.make({
                    copper: currency.copper + mutation.copper,
                    silver: currency.silver + mutation.silver,
                    gold: currency.gold + mutation.gold
                  })
                  return setComponent(entity, newCurrency)
                }))
              break

            case "UpdateCharacterCreation":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const existing = getComponent(entity, "CharacterCreation")
                  if (!existing) {
                    return entity
                  }
                  const updated = CharacterCreationComponent.make({
                    playerId: mutation.data.playerId ?? existing.playerId,
                    currentStep: mutation.data.currentStep ?? existing.currentStep,
                    startingLevel: mutation.data.startingLevel ?? existing.startingLevel,
                    attributes: mutation.data.attributes !== undefined ? mutation.data.attributes : existing.attributes,
                    class: mutation.data.class !== undefined ? mutation.data.class : existing.class,
                    skills: mutation.data.skills !== undefined ? mutation.data.skills : existing.skills,
                    trait: mutation.data.trait !== undefined ? mutation.data.trait : existing.trait,
                    hitPoints: mutation.data.hitPoints !== undefined ? mutation.data.hitPoints : existing.hitPoints,
                    startingMoney: mutation.data.startingMoney ?? existing.startingMoney,
                    remainingMoney: mutation.data.remainingMoney ?? existing.remainingMoney,
                    purchasedItems: mutation.data.purchasedItems ?? existing.purchasedItems,
                    languages: mutation.data.languages ?? existing.languages,
                    alignment: mutation.data.alignment !== undefined ? mutation.data.alignment : existing.alignment,
                    name: mutation.data.name !== undefined ? mutation.data.name : existing.name,
                    mysteries: mutation.data.mysteries !== undefined ? mutation.data.mysteries : existing.mysteries
                  })
                  return setComponent(entity, updated)
                }))
              break

            case "AddItem":
            case "RemoveItem": {
              const component = yield* createComponentFromMutation(mutation, store)
              yield* store.update(mutation.entityId, (entity) =>
                Effect.succeed(setComponent(entity, component)))
              break
            }

            case "TransferItem":
              // Move item from one entity's inventory to another
              yield* store.update(mutation.fromEntityId, (fromEntity) =>
                Effect.gen(function*() {
                  const fromInventory = getComponent(fromEntity, "Inventory")
                  if (!fromInventory) return fromEntity
                  const newInventory = InventoryComponent.make({
                    ...fromInventory,
                    items: fromInventory.items.filter(id => id !== mutation.itemId)
                  })
                  return setComponent(fromEntity, newInventory)
                }))
              yield* store.update(mutation.toEntityId, (toEntity) =>
                Effect.gen(function*() {
                  const toInventory = getComponent(toEntity, "Inventory")
                  if (!toInventory) return toEntity
                  const newInventory = InventoryComponent.make({
                    ...toInventory,
                    items: [...toInventory.items, mutation.itemId]
                  })
                  return setComponent(toEntity, newInventory)
                }))
              break

            case "UpdateInventoryLoad":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const inventory = getComponent(entity, "Inventory")
                  if (!inventory) return entity
                  const newInventory = InventoryComponent.make({
                    ...inventory,
                    currentLoad: mutation.newLoad
                  })
                  return setComponent(entity, newInventory)
                }))
              break

            case "UseConsumable":
              yield* store.update(mutation.consumableId, (entity) =>
                Effect.gen(function*() {
                  const consumable = getComponent(entity, "Consumable")
                  if (!consumable) return entity
                  const newConsumable = ConsumableComponent.make({
                    ...consumable,
                    usesRemaining: Math.max(0, consumable.usesRemaining - mutation.usesConsumed),
                    durabilityPool: consumable.durabilityPool
                      ? Math.max(0, consumable.durabilityPool - mutation.usesConsumed)
                      : null
                  })
                  return setComponent(entity, newConsumable)
                }))
              break

            case "EquipWeapon":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const equipped = getComponent(entity, "EquippedWeapons")
                  const base = equipped ?? EquippedWeaponsComponent.make({
                    mainHand: null,
                    offHand: null,
                    equippedAmmunition: null
                  })
                  const newEquipped = EquippedWeaponsComponent.make({
                    ...base,
                    [mutation.hand === "MainHand" ? "mainHand" : "offHand"]: mutation.weaponId
                  })
                  return setComponent(entity, newEquipped)
                }))
              break

            case "UnequipWeapon":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const equipped = getComponent(entity, "EquippedWeapons")
                  if (!equipped) return entity
                  const newEquipped = EquippedWeaponsComponent.make({
                    ...equipped,
                    [mutation.hand === "MainHand" ? "mainHand" : "offHand"]: null
                  })
                  return setComponent(entity, newEquipped)
                }))
              break

            case "EquipArmor":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const equipped = getComponent(entity, "EquippedArmor")
                  const base = equipped ?? EquippedArmorComponent.make({
                    armorId: null,
                    shieldId: null
                  })
                  const newEquipped = EquippedArmorComponent.make({
                    ...base,
                    armorId: mutation.armorId
                  })
                  return setComponent(entity, newEquipped)
                }))
              break

            case "UnequipArmor":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const equipped = getComponent(entity, "EquippedArmor")
                  if (!equipped) return entity
                  const newEquipped = EquippedArmorComponent.make({
                    ...equipped,
                    armorId: null
                  })
                  return setComponent(entity, newEquipped)
                }))
              break

            case "EquipShield":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const equipped = getComponent(entity, "EquippedArmor")
                  const base = equipped ?? EquippedArmorComponent.make({
                    armorId: null,
                    shieldId: null
                  })
                  const newEquipped = EquippedArmorComponent.make({
                    ...base,
                    shieldId: mutation.shieldId
                  })
                  return setComponent(entity, newEquipped)
                }))
              break

            case "UnequipShield":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const equipped = getComponent(entity, "EquippedArmor")
                  if (!equipped) return entity
                  const newEquipped = EquippedArmorComponent.make({
                    ...equipped,
                    shieldId: null
                  })
                  return setComponent(entity, newEquipped)
                }))
              break

            case "DamageEquipment":
              yield* store.update(mutation.equipmentId, (entity) =>
                Effect.gen(function*() {
                  const weapon = getComponent(entity, "Weapon")
                  const armor = getComponent(entity, "Armor")
                  const shield = getComponent(entity, "Shield")

                  if (weapon) {
                    const newWeapon = WeaponComponent.make({
                      ...weapon,
                      durability: Math.max(0, weapon.durability - mutation.damage)
                    })
                    return setComponent(entity, newWeapon)
                  }
                  if (armor) {
                    const newArmor = ArmorComponent.make({
                      ...armor,
                      durability: Math.max(0, armor.durability - mutation.damage)
                    })
                    return setComponent(entity, newArmor)
                  }
                  if (shield) {
                    const newShield = ShieldComponent.make({
                      ...shield,
                      durability: Math.max(0, shield.durability - mutation.damage)
                    })
                    return setComponent(entity, newShield)
                  }
                  return entity
                }))
              break

            case "RepairEquipment":
              yield* store.update(mutation.equipmentId, (entity) =>
                Effect.gen(function*() {
                  const weapon = getComponent(entity, "Weapon")
                  const armor = getComponent(entity, "Armor")
                  const shield = getComponent(entity, "Shield")

                  if (weapon) {
                    const newWeapon = WeaponComponent.make({
                      ...weapon,
                      durability: Math.min(weapon.maxDurability, weapon.durability + mutation.durabilityRestored)
                    })
                    return setComponent(entity, newWeapon)
                  }
                  if (armor) {
                    const newArmor = ArmorComponent.make({
                      ...armor,
                      durability: Math.min(armor.maxDurability, armor.durability + mutation.durabilityRestored)
                    })
                    return setComponent(entity, newArmor)
                  }
                  if (shield) {
                    const newShield = ShieldComponent.make({
                      ...shield,
                      durability: Math.min(shield.maxDurability, shield.durability + mutation.durabilityRestored)
                    })
                    return setComponent(entity, newShield)
                  }
                  return entity
                }))
              break

            case "UpdateCombatStats":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const combatStats = getComponent(entity, "CombatStats")
                  const base = combatStats ?? CombatStatsComponent.make({
                    ac: 11,
                    attackBonus: 0,
                    initiativeBonus: 0
                  })
                  const newCombatStats = CombatStatsComponent.make({
                    ac: mutation.ac,
                    attackBonus: mutation.attackBonus,
                    initiativeBonus: base.initiativeBonus
                  })
                  return setComponent(entity, newCombatStats)
                }))
              break

            case "ReloadWeapon":
            case "ConsumeAmmunition":
              // TODO: Implement ranged weapon mechanics
              break

            default: {
              // SetAttributes, SetHealth, SetClass
              const component = yield* createComponentFromMutation(mutation, store)
              yield* store.update(mutation.entityId, (entity) => Effect.succeed(setComponent(entity, component)))
            }
          }
        })

      return GameState.of({ getEntity, applyMutation })
    })
  )
}
