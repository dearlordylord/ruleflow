/**
 * Equipment System
 * Processes weapon/armor/shield equip/unequip events and updates combat stats
 */
import { Chunk, Effect } from "effect"

import { getComponent } from "../components.js"
import { SystemName } from "../entities.js"
import { DomainError } from "../errors.js"
import {
  WeaponEquipped,
  WeaponUnequipped,
  ArmorEquipped,
  ArmorUnequipped,
  ShieldEquipped,
  ShieldUnequipped
} from "../combat/events.js"
import {
  EquipWeaponMutation,
  UnequipWeaponMutation,
  EquipArmorMutation,
  UnequipArmorMutation,
  EquipShieldMutation,
  UnequipShieldMutation,
  UpdateCombatStatsMutation
} from "../combat/mutations.js"
import type { System } from "./types.js"

export const equipmentSystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const weaponEquipEvents = Chunk.filter(
      events,
      (event): event is WeaponEquipped => event._tag === "WeaponEquipped"
    )

    const armorEquipEvents = Chunk.filter(
      events,
      (event): event is ArmorEquipped => event._tag === "ArmorEquipped"
    )

    const shieldEquipEvents = Chunk.filter(
      events,
      (event): event is ShieldEquipped => event._tag === "ShieldEquipped"
    )

    // Process weapon equip events
    const weaponEquipMutations = yield* Effect.forEach(
      weaponEquipEvents,
      (event) =>
        Effect.gen(function*() {
          const entity = yield* state.getEntity(event.entityId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Equipment"),
                  message: `Entity ${event.entityId} not found`
                })
              )
            )
          )

          const weapon = yield* state.getEntity(event.weaponId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Equipment"),
                  message: `Weapon ${event.weaponId} not found`
                })
              )
            )
          )

          const inventory = getComponent(entity, "Inventory")!
          const equippedWeapons = getComponent(entity, "EquippedWeapons")

          // Validate item is in inventory (business rule)
          if (!inventory.items.includes(event.weaponId)) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Equipment"),
                  message: `Weapon ${event.weaponId} not in inventory of entity ${event.entityId}`
                })
              )
            )
          }

          // Check if weapon is already equipped
          if (equippedWeapons) {
            if (
              equippedWeapons.mainHand === event.weaponId ||
              equippedWeapons.offHand === event.weaponId
            ) {
              return yield* Effect.fail(
                Chunk.of(
                  DomainError.make({
                    systemName: SystemName.make("Equipment"),
                    message: `Weapon ${event.weaponId} is already equipped`
                  })
                )
              )
            }
          }

          const muts = Chunk.empty<
            | typeof UnequipWeaponMutation.Type
            | typeof EquipWeaponMutation.Type
            | typeof UpdateCombatStatsMutation.Type
          >()

          // Handle two-handed weapons
          if (event.hand === "TwoHanded") {
            let finalMuts = muts

            // Unequip both hands if occupied
            if (equippedWeapons?.mainHand) {
              finalMuts = Chunk.append(
                finalMuts,
                UnequipWeaponMutation.make({
                  entityId: event.entityId,
                  hand: "MainHand"
                })
              )
            }
            if (equippedWeapons?.offHand) {
              finalMuts = Chunk.append(
                finalMuts,
                UnequipWeaponMutation.make({
                  entityId: event.entityId,
                  hand: "OffHand"
                })
              )
            }

            // Equip to main hand (two-handed weapons occupy main hand slot)
            finalMuts = Chunk.append(
              finalMuts,
              EquipWeaponMutation.make({
                entityId: event.entityId,
                weaponId: event.weaponId,
                hand: "MainHand"
              })
            )

            // TODO: Implement combat stat calculation from equipped weapons + attributes + specialization
            // Skipping UpdateCombatStats for now - would just copy existing values without calculation

            return finalMuts
          } else {
            // One-handed weapon
            let finalMuts = muts

            // Unequip current weapon in target hand if occupied
            if (event.hand === "MainHand" && equippedWeapons?.mainHand) {
              finalMuts = Chunk.append(
                finalMuts,
                UnequipWeaponMutation.make({
                  entityId: event.entityId,
                  hand: "MainHand"
                })
              )
            } else if (event.hand === "OffHand") {
              // Shield occupies off-hand slot - unequip if present
              const equippedArmorComp = getComponent(entity, "EquippedArmor")
              if (equippedArmorComp?.shieldId) {
                finalMuts = Chunk.append(
                  finalMuts,
                  UnequipShieldMutation.make({
                    entityId: event.entityId
                  })
                )
              }

              // Unequip off-hand weapon if present
              if (equippedWeapons?.offHand) {
                finalMuts = Chunk.append(
                  finalMuts,
                  UnequipWeaponMutation.make({
                    entityId: event.entityId,
                    hand: "OffHand"
                  })
                )
              }
            }

            finalMuts = Chunk.append(
              finalMuts,
              EquipWeaponMutation.make({
                entityId: event.entityId,
                weaponId: event.weaponId,
                hand: event.hand
              })
            )

            // TODO: Implement combat stat calculation from equipped weapons + attributes + specialization
            // Skipping UpdateCombatStats for now - would just copy existing values without calculation

            return finalMuts
          }
        }),
      { concurrency: "unbounded" }
    )

    // Process armor equip events
    const armorEquipMutations = yield* Effect.forEach(
      armorEquipEvents,
      (event) =>
        Effect.gen(function*() {
          const entity = yield* state.getEntity(event.entityId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Equipment"),
                  message: `Entity ${event.entityId} not found`
                })
              )
            )
          )

          const armor = yield* state.getEntity(event.armorId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Equipment"),
                  message: `Armor ${event.armorId} not found`
                })
              )
            )
          )

          const inventory = getComponent(entity, "Inventory")!
          const armorComp = getComponent(armor, "Armor")!
          const attributes = getComponent(entity, "Attributes")

          // Validate item is in inventory (business rule)
          if (!inventory.items.includes(event.armorId)) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Equipment"),
                  message: `Armor ${event.armorId} not in inventory of entity ${event.entityId}`
                })
              )
            )
          }

          // Check STR requirements
          if (attributes) {
            if (armorComp.armorCategory === "Heavy" && attributes.strength < 13) {
              return yield* Effect.fail(
                Chunk.of(
                  DomainError.make({
                    systemName: SystemName.make("Equipment"),
                    message: `Heavy armor requires STR ≥ 13, entity has STR ${attributes.strength}`
                  })
                )
              )
            }
            if (armorComp.armorCategory === "Medium" && attributes.strength < 11) {
              return yield* Effect.fail(
                Chunk.of(
                  DomainError.make({
                    systemName: SystemName.make("Equipment"),
                    message: `Medium armor requires STR ≥ 11, entity has STR ${attributes.strength}`
                  })
                )
              )
            }
          }

          let muts = Chunk.empty<
            | typeof UnequipArmorMutation.Type
            | typeof EquipArmorMutation.Type
            | typeof UpdateCombatStatsMutation.Type
          >()

          // Check if armor is already equipped and unequip first
          const equippedArmorComp = getComponent(entity, "EquippedArmor")
          if (equippedArmorComp?.armorId) {
            muts = Chunk.append(
              muts,
              UnequipArmorMutation.make({
                entityId: event.entityId
              })
            )
          }

          muts = Chunk.append(
            muts,
            EquipArmorMutation.make({
              entityId: event.entityId,
              armorId: event.armorId
            })
          )

          // Calculate new AC using existing equipped shield from EquippedArmorComp
          const combatStats = getComponent(entity, "CombatStats")
          const dexMod = attributes?.dexterityMod ?? 0

          // AC = baseAC + dexMod (capped by armor category) + shield bonus
          const dexModCapped =
            armorComp.armorCategory === "Light"
              ? dexMod
              : armorComp.armorCategory === "Medium"
                ? Math.min(dexMod, 2)
                : 0

          // Shield bonus from currently equipped shield (reuse equippedArmorComp)
          let shieldBonus = 0
          if (equippedArmorComp?.shieldId) {
            const shieldEntity = yield* state.getEntity(equippedArmorComp.shieldId).pipe(
              Effect.orElseFail(() =>
                Chunk.of(
                  DomainError.make({
                    systemName: SystemName.make("Equipment"),
                    message: `Equipped shield ${equippedArmorComp.shieldId} not found`
                  })
                )
              )
            )
            const shieldComp = getComponent(shieldEntity, "Shield")!
            shieldBonus = shieldComp.acBonus
          }
          const newAC = armorComp.baseAC + dexModCapped + shieldBonus

          muts = Chunk.append(
            muts,
            UpdateCombatStatsMutation.make({
              entityId: event.entityId,
              ac: newAC,  // ACTUAL calculation
              attackBonus: combatStats?.attackBonus ?? 0
            })
          )

          return muts
        }),
      { concurrency: "unbounded" }
    )

    // Process shield equip events
    const shieldEquipMutations = yield* Effect.forEach(
      shieldEquipEvents,
      (event) =>
        Effect.gen(function*() {
          const entity = yield* state.getEntity(event.entityId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Equipment"),
                  message: `Entity ${event.entityId} not found`
                })
              )
            )
          )

          const shield = yield* state.getEntity(event.shieldId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Equipment"),
                  message: `Shield ${event.shieldId} not found`
                })
              )
            )
          )

          const inventory = getComponent(entity, "Inventory")!
          const shieldComp = getComponent(shield, "Shield")!
          const equippedWeapons = getComponent(entity, "EquippedWeapons")

          // Validate item is in inventory (business rule)
          if (!inventory.items.includes(event.shieldId)) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Equipment"),
                  message: `Shield ${event.shieldId} not in inventory of entity ${event.entityId}`
                })
              )
            )
          }

          // Shield requires off-hand - unequip weapon if occupied
          let muts = Chunk.empty<
            | typeof UnequipWeaponMutation.Type
            | typeof EquipShieldMutation.Type
            | typeof UpdateCombatStatsMutation.Type
          >()

          if (equippedWeapons?.offHand) {
            muts = Chunk.append(
              muts,
              UnequipWeaponMutation.make({
                entityId: event.entityId,
                hand: "OffHand"
              })
            )
          }

          muts = Chunk.append(
            muts,
            EquipShieldMutation.make({
              entityId: event.entityId,
              shieldId: event.shieldId
            })
          )

          // Update AC with shield bonus
          const combatStats = getComponent(entity, "CombatStats")
          if (combatStats) {
            muts = Chunk.append(
              muts,
              UpdateCombatStatsMutation.make({
                entityId: event.entityId,
                ac: combatStats.ac + shieldComp.acBonus,  // ACTUAL calculation
                attackBonus: combatStats.attackBonus
              })
            )
          }

          return muts
        }),
      { concurrency: "unbounded" }
    )

    // Combine all mutations
    return Chunk.flatten(weaponEquipMutations).pipe(
      Chunk.appendAll(Chunk.flatten(armorEquipMutations)),
      Chunk.appendAll(Chunk.flatten(shieldEquipMutations))
    )
  })
