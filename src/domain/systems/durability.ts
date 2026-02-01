/**
 * Durability System
 * Processes equipment damage and repair events
 */
import { Chunk, Effect } from "effect"

import { ArmorDamaged, EquipmentRepaired, WeaponDamaged } from "../combat/events.js"
import { DamageEquipmentMutation, RepairEquipmentMutation } from "../combat/mutations.js"
import { SystemName } from "../entities.js"
import { getComponent } from "../entity.js"
import { DomainError } from "../errors.js"
import { UseConsumableMutation } from "../inventory/mutations.js"
import type { System } from "./types.js"

export const durabilitySystem: System = (state, events, _accumulatedMutations) =>
  Effect.gen(function*() {
    const weaponDamagedEvents = Chunk.filter(
      events,
      (event): event is WeaponDamaged => event._tag === "WeaponDamaged"
    )

    const armorDamagedEvents = Chunk.filter(
      events,
      (event): event is ArmorDamaged => event._tag === "ArmorDamaged"
    )

    const equipmentRepairedEvents = Chunk.filter(
      events,
      (event): event is EquipmentRepaired => event._tag === "EquipmentRepaired"
    )

    // Process weapon damaged events
    const weaponDamagedMutations = yield* Effect.forEach(
      weaponDamagedEvents,
      (event) =>
        Effect.gen(function*() {
          const _weapon = yield* state.getEntity(event.weaponId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Durability"),
                  message: `Weapon ${event.weaponId} not found`
                })
              )
            )
          )

          let muts = Chunk.make(
            DamageEquipmentMutation.make({
              equipmentId: event.weaponId,
              damage: 1
            })
          )

          // If durability would reach 0, destroy the weapon
          if (event.currentDurability - 1 <= 0) {
            // Find owner to remove from inventory
            // TODO: This is inefficient, should track ownership in component
            // For now, we'll just damage it and let mutation handler destroy it
          }

          return muts
        }),
      { concurrency: "unbounded" }
    )

    // Process armor damaged events
    const armorDamagedMutations = yield* Effect.forEach(
      armorDamagedEvents,
      (event) =>
        Effect.gen(function*() {
          const _armor = yield* state.getEntity(event.armorId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Durability"),
                  message: `Armor ${event.armorId} not found`
                })
              )
            )
          )

          let muts = Chunk.make(
            DamageEquipmentMutation.make({
              equipmentId: event.armorId,
              damage: 1
            })
          )

          // If durability would reach 0, destroy the armor
          if (event.currentDurability - 1 <= 0) {
            // Find owner to remove from inventory
            // TODO: This is inefficient, should track ownership in component
            // For now, we'll just damage it and let mutation handler destroy it
          }

          return muts
        }),
      { concurrency: "unbounded" }
    )

    // Process equipment repaired events
    const equipmentRepairedMutations = yield* Effect.forEach(
      equipmentRepairedEvents,
      (event) =>
        Effect.gen(function*() {
          const _repairer = yield* state.getEntity(event.repairerId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Durability"),
                  message: `Repairer ${event.repairerId} not found`
                })
              )
            )
          )

          const equipment = yield* state.getEntity(event.equipmentId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Durability"),
                  message: `Equipment ${event.equipmentId} not found`
                })
              )
            )
          )

          const repairKit = yield* state.getEntity(event.repairKitId).pipe(
            Effect.orElseFail(() =>
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Durability"),
                  message: `Repair kit ${event.repairKitId} not found`
                })
              )
            )
          )

          const repairKitComp = getComponent(repairKit, "Consumable")!

          // Validate repair kit has durability pool remaining (business rule)
          if (!repairKitComp.durabilityPool || repairKitComp.durabilityPool <= 0) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Durability"),
                  message: `Repair kit ${event.repairKitId} has no durability pool remaining`
                })
              )
            )
          }

          // Check if equipment is weapon or armor
          const weaponComp = getComponent(equipment, "Weapon")
          const armorComp = getComponent(equipment, "Armor")
          const shieldComp = getComponent(equipment, "Shield")

          if (!weaponComp && !armorComp && !shieldComp) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Durability"),
                  message: `Equipment ${event.equipmentId} is not a weapon, armor, or shield`
                })
              )
            )
          }

          // Get current and max durability
          const currentDurability = weaponComp?.durability ?? armorComp?.durability ?? shieldComp?.durability ?? 0
          const maxDurability = weaponComp?.maxDurability ?? armorComp?.maxDurability ?? shieldComp?.maxDurability ?? 0

          // Validate equipment is damaged
          if (currentDurability >= maxDurability) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Durability"),
                  message: `Equipment ${event.equipmentId} is already at max durability`
                })
              )
            )
          }

          // Cap durability restored to not exceed:
          // 1. Equipment's max durability
          // 2. Repair kit's remaining durability pool
          const maxCanRestore = maxDurability - currentDurability
          const kitPoolRemaining = repairKitComp.durabilityPool ?? 0
          const actualRestored = Math.min(
            event.durabilityRestored,
            maxCanRestore,
            kitPoolRemaining
          )

          // Validate we can actually repair something
          if (actualRestored <= 0) {
            return yield* Effect.fail(
              Chunk.of(
                DomainError.make({
                  systemName: SystemName.make("Durability"),
                  message: `Cannot repair: equipment at max durability or repair kit depleted`
                })
              )
            )
          }

          return Chunk.make(
            RepairEquipmentMutation.make({
              equipmentId: event.equipmentId,
              durabilityRestored: actualRestored
            }),
            UseConsumableMutation.make({
              consumableId: event.repairKitId,
              targetId: event.equipmentId,
              usesConsumed: actualRestored // Consumes from durabilityPool
            })
          )
        }),
      { concurrency: "unbounded" }
    )

    // Combine all mutations
    return Chunk.flatten(Chunk.unsafeFromArray(weaponDamagedMutations)).pipe(
      Chunk.appendAll(Chunk.flatten(Chunk.unsafeFromArray(armorDamagedMutations))),
      Chunk.appendAll(Chunk.flatten(Chunk.unsafeFromArray(equipmentRepairedMutations)))
    )
  })
