/**
 * Game State - applies mutations to read model
 */
import { Context, Effect, Layer } from "effect"

import { HealthComponent } from "../character/health.js"
import { CharacterCreationComponent } from "../character/index.js"
import { ArmorComponent, EquippedArmorComponent, ShieldComponent } from "../combat/index.js"
import { CombatStatsComponent } from "../combat/stats.js"
import { EquippedWeaponsComponent, WeaponComponent } from "../combat/weapons.js"
import type { EntityId } from "../entities.js"
import type { Entity } from "../entity.js"
import { getComponent, removeComponent, setComponent } from "../entity.js"
import type { EntityNotFound } from "../errors.js"
import { ConsumableComponent } from "../inventory/consumables.js"
import { CurrencyComponent } from "../inventory/currency.js"
import { InventoryComponent } from "../inventory/items.js"
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
                    gold: currency.gold - mutation.gold,
                    platinum: currency.platinum - mutation.platinum
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
                    gold: currency.gold + mutation.gold,
                    platinum: currency.platinum + mutation.platinum
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

            case "CreateEntity":
              // Validate entity doesn't already exist
              yield* store.get(mutation.entity.id).pipe(
                Effect.matchEffect({
                  onFailure: () => {
                    // Entity doesn't exist - good, create it
                    return store.set(mutation.entity)
                  },
                  onSuccess: () => {
                    // Entity already exists - fail
                    return Effect.die(
                      new Error(`Entity ${mutation.entity.id} already exists`)
                    )
                  }
                })
              )
              break

            case "AddItem":
            case "RemoveItem": {
              const component = yield* createComponentFromMutation(mutation, store)
              yield* store.update(mutation.entityId, (entity) => Effect.succeed(setComponent(entity, component)))
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
                  const currentState = equipped?.state ?? { _type: "Unarmed" as const, equippedAmmunition: null }
                  const equippedAmmunition = currentState.equippedAmmunition

                  // Determine new state based on mutation and current state
                  let newState: typeof currentState
                  if (mutation.hand === "TwoHanded") {
                    // Equipping two-handed weapon
                    newState = {
                      _type: "TwoHanded" as const,
                      weapon: mutation.weaponId,
                      equippedAmmunition
                    }
                  } else if (mutation.hand === "MainHand") {
                    // Equipping to main hand - becomes OneHanded
                    // Preserve offHand if currently OneHanded, otherwise null
                    const offHand = currentState._type === "OneHanded" ? currentState.offHand : null
                    newState = {
                      _type: "OneHanded" as const,
                      mainHand: mutation.weaponId,
                      offHand,
                      equippedAmmunition
                    }
                  } else {
                    // Equipping to off-hand
                    if (currentState._type === "OneHanded") {
                      // Already have main hand weapon, add to off-hand
                      newState = {
                        _type: "OneHanded" as const,
                        mainHand: currentState.mainHand,
                        offHand: mutation.weaponId,
                        equippedAmmunition
                      }
                    } else if (currentState._type === "TwoHanded") {
                      // Two-handed weapon equipped - system should have unequipped it first
                      // For safety, treat as error case - just set unarmed
                      newState = { _type: "Unarmed" as const, equippedAmmunition }
                    } else {
                      // Unarmed - can't equip to off-hand without main hand
                      // This shouldn't happen in valid gameplay but handle gracefully
                      newState = { _type: "Unarmed" as const, equippedAmmunition }
                    }
                  }

                  const newEquipped = EquippedWeaponsComponent.make({ state: newState })
                  return setComponent(entity, newEquipped)
                }))
              break

            case "UnequipWeapon":
              yield* store.update(mutation.entityId, (entity) =>
                Effect.gen(function*() {
                  const equipped = getComponent(entity, "EquippedWeapons")
                  if (!equipped) return entity

                  const currentState = equipped.state
                  const equippedAmmunition = currentState.equippedAmmunition

                  let newState: typeof currentState
                  if (currentState._type === "Unarmed") {
                    // Nothing to unequip
                    newState = currentState
                  } else if (currentState._type === "TwoHanded") {
                    // Unequipping two-handed weapon (treated as main hand)
                    if (mutation.hand === "MainHand") {
                      newState = { _type: "Unarmed" as const, equippedAmmunition }
                    } else {
                      // Off-hand unequip on TwoHanded - no-op
                      newState = currentState
                    }
                  } else {
                    // OneHanded state
                    if (mutation.hand === "MainHand") {
                      // Unequip main hand
                      if (currentState.offHand) {
                        // Off-hand becomes main hand? Actually no - just go unarmed
                        // The system should handle weapon swapping separately
                        newState = { _type: "Unarmed" as const, equippedAmmunition }
                      } else {
                        newState = { _type: "Unarmed" as const, equippedAmmunition }
                      }
                    } else {
                      // Unequip off-hand
                      newState = {
                        _type: "OneHanded" as const,
                        mainHand: currentState.mainHand,
                        offHand: null,
                        equippedAmmunition
                      }
                    }
                  }

                  const newEquipped = EquippedWeaponsComponent.make({ state: newState })
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
                  const newCombatStats = CombatStatsComponent.make({
                    armorClass: mutation.armorClass,
                    meleeAttackBonus: mutation.meleeAttackBonus,
                    rangedAttackBonus: mutation.rangedAttackBonus,
                    initiativeModifier: mutation.initiativeModifier
                  })
                  return setComponent(entity, newCombatStats)
                }))
              break

            case "ReloadWeapon":
            case "ConsumeAmmunition":
            case "AddCondition":
            case "RemoveCondition":
            case "SetGrappleState":
            case "RollInitiative":
            case "UseAction":
            case "StartCombatRound":
            case "AdvanceSide":
            case "AdvanceTurn":
            case "ResetActionEconomy":
            case "SetDistance":
            case "SetReadyAction":
            case "ClearReadyAction":
            case "SetDefenseStance":
            case "SetMoraleResult":
            case "SetMysteryCasting":
            case "ClearMysteryCasting":
              // TODO: Implement handlers for combat mutations
              // For now, these are no-ops
              break

            default: {
              // SetAttributes, SetHealth, SetClass, SetSkills, SetSavingThrows
              const component = yield* createComponentFromMutation(mutation, store)
              yield* store.update(mutation.entityId, (entity) => Effect.succeed(setComponent(entity, component)))
            }
          }
        })

      return GameState.of({ getEntity, applyMutation })
    })
  )
}
