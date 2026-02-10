/**
 * Hardcoded scenario data for the dashboard demo.
 * 6 observation groups, some with multiple candidates.
 */
import { Effect, Schema } from "effect"

import {
  AlignmentChosen,
  AttributesRolled,
  CharacterCreationCompleted,
  CharacterCreationStarted,
  ClassChosen,
  HitPointsRolled,
  NameChosen,
  SkillsChosen,
  StartingMoneyRolled,
  TraitChosen,
  WeaponGroupSpecializationChosen
} from "../../domain/character/creationEvents.js"
import { CombatStatsComponent } from "../../domain/combat/stats.js"
import { DiceNotation, WeaponComponent } from "../../domain/combat/weapons.js"
import { EntityId, ObservationEntryId } from "../../domain/entities.js"
import { Entity, setComponent } from "../../domain/entity.js"
import { AttackPerformed, CreatureDiscovered, CurrencyTransferred } from "../../domain/events.js"
import type { DomainEvent } from "../../domain/events.js"
import { ObservationEntry } from "../../domain/infrastructure/ObservationLog.js"
import { CurrencyComponent } from "../../domain/inventory/currency.js"

import { DashboardReadModelStore } from "./DashboardReadModelStore.js"

// Fixed IDs for the scenario
export const GUIDO_ID = EntityId.make("00000000-0000-0000-0000-000000000001")
export const PLAYER_ID = EntityId.make("00000000-0000-0000-0000-000000000099")
export const GOBLIN1_ID = EntityId.make("00000000-0000-0000-0000-000000000002")
export const WEAPON_ID = EntityId.make("00000000-0000-0000-0000-000000000003")
export const GOBLIN2_ID = EntityId.make("00000000-0000-0000-0000-000000000004")

/** Observation entry with label for display */
export interface LabeledObservation {
  readonly label: string
  readonly observation: ObservationEntry
  readonly fastForward: boolean
}

let obsCounter = 0
const nextObsId = () => {
  obsCounter++
  const hex = obsCounter.toString(16).padStart(12, "0")
  return ObservationEntryId.make(`a0000000-0000-0000-0000-${hex}`)
}

const makeSingleObs = (label: string, event: DomainEvent, fastForward = false): LabeledObservation => ({
  label,
  fastForward,
  observation: new ObservationEntry({
    id: nextObsId(),
    timestamp: new Date(),
    candidates: [{ event, confidence: 1.0 }],
    selectedIndex: null
  })
})

const makeMultiObs = (
  label: string,
  candidates: Array<{ event: DomainEvent; confidence: number }>
): LabeledObservation => ({
  label,
  fastForward: false,
  observation: new ObservationEntry({
    id: nextObsId(),
    timestamp: new Date(),
    candidates: candidates as [typeof candidates[0], ...typeof candidates],
    selectedIndex: null
  })
})

// ============================================================================
// Character Creation (fast-forwarded)
// ============================================================================

const charCreationEvents: Array<LabeledObservation> = [
  makeSingleObs("CharCreation: Start", CharacterCreationStarted.make({
    entityId: GUIDO_ID, playerId: PLAYER_ID, startingLevel: 1
  }), true),
  makeSingleObs("CharCreation: Attributes", AttributesRolled.make({
    entityId: GUIDO_ID, strength: 14, dexterity: 12, constitution: 15,
    intelligence: 10, will: 13, charisma: 8
  }), true),
  makeSingleObs("CharCreation: Class", ClassChosen.make({
    entityId: GUIDO_ID, class: "Fighter"
  }), true),
  makeSingleObs("CharCreation: Weapon Spec", WeaponGroupSpecializationChosen.make({
    entityId: GUIDO_ID, weaponGroup: "HeavyBlades"
  }), true),
  makeSingleObs("CharCreation: Skills", SkillsChosen.make({
    entityId: GUIDO_ID, primarySkills: ["MeleeCombat", "Accuracy"],
    secondarySkills: ["Awareness", "Survival", "Medicine"]
  }), true),
  makeSingleObs("CharCreation: Trait", TraitChosen.make({
    entityId: GUIDO_ID, traitName: "Combat Reflexes"
  }), true),
  makeSingleObs("CharCreation: HP", HitPointsRolled.make({
    entityId: GUIDO_ID, rolledValue: 7, constitutionModifier: 1
  }), true),
  makeSingleObs("CharCreation: Money", StartingMoneyRolled.make({
    entityId: GUIDO_ID, silverAmount: 110
  }), true),
  makeSingleObs("CharCreation: Alignment", AlignmentChosen.make({
    entityId: GUIDO_ID, alignment: "Neutral"
  }), true),
  makeSingleObs("CharCreation: Name", NameChosen.make({
    entityId: GUIDO_ID, name: "Guido"
  }), true),
  makeSingleObs("CharCreation: Complete", CharacterCreationCompleted.make({
    entityId: GUIDO_ID
  }), true)
]

// ============================================================================
// Main scenario observations
// ============================================================================

const goblin1Discovery = makeSingleObs("Goblin Discovered", CreatureDiscovered.make({
  name: "Goblin", strength: 10, dexterity: 14, constitution: 12,
  intelligence: 8, will: 10, charisma: 6,
  maxHP: 5, currentHP: 5, armorClass: 13,
  meleeAttackBonus: 2, rangedAttackBonus: 4,
  weaponName: "Short Sword", weaponDamageDice: "1d6", weaponGroup: "Blades",
  discoveredAt: null
}))

const attack1 = makeMultiObs("Attack Goblin #1", [
  {
    event: AttackPerformed.make({
      attackerId: GUIDO_ID, targetId: GOBLIN1_ID, weaponId: WEAPON_ID, attackRoll: 18
    }),
    confidence: 0.70
  },
  {
    event: AttackPerformed.make({
      attackerId: GUIDO_ID, targetId: GOBLIN1_ID, weaponId: WEAPON_ID, attackRoll: 2
    }),
    confidence: 0.85
  },
  {
    event: AttackPerformed.make({
      attackerId: GUIDO_ID, targetId: GOBLIN1_ID, weaponId: WEAPON_ID, attackRoll: 15
    }),
    confidence: 0.55
  }
])

const goblin2Discovery = makeSingleObs("Goblin #2 Discovered", CreatureDiscovered.make({
  name: "Goblin Scout", strength: 10, dexterity: 14, constitution: 12,
  intelligence: 8, will: 10, charisma: 6,
  maxHP: 5, currentHP: 5, armorClass: 13,
  meleeAttackBonus: 2, rangedAttackBonus: 4,
  weaponName: "Short Sword", weaponDamageDice: "1d6", weaponGroup: "Blades",
  discoveredAt: null
}))

const attack2 = makeMultiObs("Attack Goblin #2", [
  {
    event: AttackPerformed.make({
      attackerId: GUIDO_ID, targetId: GOBLIN2_ID, weaponId: WEAPON_ID, attackRoll: 20
    }),
    confidence: 0.50
  },
  {
    event: AttackPerformed.make({
      attackerId: GUIDO_ID, targetId: GOBLIN2_ID, weaponId: WEAPON_ID, attackRoll: 14
    }),
    confidence: 0.80
  }
])

const loot = makeMultiObs("Loot Currency", [
  {
    event: CurrencyTransferred.make({
      fromEntityId: GOBLIN1_ID, toEntityId: GUIDO_ID,
      copper: 0, silver: 8, gold: 0, platinum: 0
    }),
    confidence: 0.90
  },
  {
    event: CurrencyTransferred.make({
      fromEntityId: GOBLIN1_ID, toEntityId: GUIDO_ID,
      copper: 0, silver: 50, gold: 0, platinum: 0
    }),
    confidence: 0.30
  }
])

export const allObservations: ReadonlyArray<LabeledObservation> = [
  ...charCreationEvents,
  goblin1Discovery,
  attack1,
  goblin2Discovery,
  attack2,
  loot
]

// ============================================================================
// Setup actions — Effect programs that modify store before/between observations
// ============================================================================

export interface SetupAction {
  readonly beforeStepIndex: number
  readonly effect: Effect.Effect<void, never, DashboardReadModelStore>
}

const longsword = WeaponComponent.make({
  name: "Longsword",
  damageDice: Schema.decodeSync(DiceNotation)("1d8"),
  damageType: ["Slashing"],
  weaponGroup: "HeavyBlades",
  size: "Medium",
  traits: [],
  reach: 5,
  rangeClose: null,
  rangeMedium: null,
  rangeLong: null,
  durability: 10,
  maxDurability: 10
})

export const setupActions: ReadonlyArray<SetupAction> = [
  // Before step 0: create empty Guido entity
  {
    beforeStepIndex: 0,
    effect: Effect.gen(function*() {
      const store = yield* DashboardReadModelStore
      yield* store.set(Entity.make({ id: GUIDO_ID, components: [] }))
    })
  },
  // Before step 11 (goblin discovery): add CombatStats + create weapon
  {
    beforeStepIndex: 11,
    effect: Effect.gen(function*() {
      const store = yield* DashboardReadModelStore
      yield* Effect.orDie(store.update(GUIDO_ID, (entity) =>
        Effect.succeed(setComponent(
          entity,
          CombatStatsComponent.make({
            meleeAttackBonus: 4,
            rangedAttackBonus: 2,
            armorClass: 11,
            initiativeModifier: 0
          })
        ))))
      yield* store.set(Entity.make({
        id: WEAPON_ID,
        components: [longsword]
      }))
    })
  },
  // Before step 14 (goblin2 discovery): add currency to goblin1 for looting later
  {
    beforeStepIndex: 14,
    effect: Effect.gen(function*() {
      const store = yield* DashboardReadModelStore
      yield* Effect.orDie(store.update(GOBLIN1_ID, (entity) =>
        Effect.succeed(setComponent(
          entity,
          CurrencyComponent.make({ copper: 0, silver: 12, gold: 0, platinum: 0 })
        ))))
    })
  }
]
