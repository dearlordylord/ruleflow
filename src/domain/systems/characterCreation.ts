/**
 * Character Creation System - processes all character creation events
 */
import { Chunk, Effect, HashMap, Option } from "effect"

import {
  AttributesComponent,
  calculateBaseSaveBonus,
  calculateCombatSuperiorityExtraAttacks,
  calculateLuckySkillRecoveryDie,
  calculateMaxMysteryTier,
  calculateSkillLevelBonus,
  calculateSneakAttackDice,
  CharacterCreationComponent,
  ClassComponent,
  CombatSuperiorityComponent,
  ExperienceComponent,
  ForbiddenKnowledgeComponent,
  HealthComponent,
  LuckySkillComponent,
  SavingThrowsComponent,
  Skill,
  SkillsComponent,
  SneakAttackComponent,
  TraitsComponent
} from "../character/index.js"
import { UpdateCharacterCreationMutation } from "../character/mutations.js"
import { WeaponSpecializationComponent } from "../combat/weapons.js"
import type { Component } from "../entity.js"
import { getComponent } from "../entity.js"
import { CurrencyComponent, InventoryComponent } from "../inventory/index.js"
import { SetMultipleComponentsMutation } from "../mutations.js"
import { calculateMaxConcentrationPoints, ConcentrationComponent, KnownMysteriesComponent } from "../mysticism/index.js"
import type { ConsistencyWarning } from "../warnings.js"
import type { System } from "./types.js"

/**
 * Type for validated character creation with all required fields
 */
type ValidatedCharacterCreation = CharacterCreationComponent & {
  attributes: NonNullable<CharacterCreationComponent["attributes"]>
  class: NonNullable<CharacterCreationComponent["class"]>
  skills: NonNullable<CharacterCreationComponent["skills"]>
  hitPoints: NonNullable<CharacterCreationComponent["hitPoints"]>
  alignment: NonNullable<CharacterCreationComponent["alignment"]>
  name: NonNullable<CharacterCreationComponent["name"]>
}

/**
 * Type guard for validated character creation
 */
function isValidatedCreation(
  creation: CharacterCreationComponent
): creation is ValidatedCharacterCreation {
  return !!(
    creation.attributes
    && creation.class
    && creation.skills
    && creation.hitPoints
    && creation.alignment
    && creation.name
  )
}

/**
 * Single character creation system handling all creation events
 */
export const characterCreationSystem: System = (state, events, _accumulated) =>
  Effect.gen(function*() {
    const mutations = []

    for (const event of events) {
      switch (event._tag) {
        case "CharacterCreationStarted": {
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            SetMultipleComponentsMutation.make({
              entityId: event.entityId,
              components: [
                CharacterCreationComponent.make({
                  playerId: event.playerId,
                  currentStep: "Started",
                  startingLevel: event.startingLevel,
                  startingMoney: 0,
                  remainingMoney: 0,
                  purchasedItems: [],
                  languages: [],
                  attributes: null,
                  class: null,
                  skills: null,
                  trait: null,
                  hitPoints: null,
                  alignment: null,
                  name: null,
                  mysteries: null
                })
              ],
              removeComponents: []
            })
          )
          break
        }

        case "AttributesRolled": {
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                currentStep: "AttributesRolled",
                attributes: {
                  strength: event.strength,
                  dexterity: event.dexterity,
                  constitution: event.constitution,
                  intelligence: event.intelligence,
                  will: event.will,
                  charisma: event.charisma
                }
              }
            })
          )
          break
        }

        case "ClassChosen": {
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                currentStep: "ClassChosen",
                class: event.class
              }
            })
          )
          break
        }

        case "WeaponGroupSpecializationChosen": {
          // Fighter class ability: choose weapon group for +1 damage bonus
          const entityResult = yield* state.getEntity(event.entityId).pipe(Effect.option)

          if (Option.isNone(entityResult)) {
            yield* Effect.logError(`Entity ${event.entityId} not found for weapon specialization`)
            break
          }

          const entity = entityResult.value
          const existingSpec = getComponent(entity, "WeaponSpecialization")

          // Get existing specializations or start fresh
          const currentSpecs = existingSpec?.specializations ?? HashMap.empty()

          // Add or update the weapon group (currently always +1, could increase with level)
          const newSpecs = HashMap.set(currentSpecs, event.weaponGroup, 1)

          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            SetMultipleComponentsMutation.make({
              entityId: event.entityId,
              components: [
                WeaponSpecializationComponent.make({
                  specializations: newSpecs
                })
              ],
              removeComponents: []
            })
          )
          break
        }

        case "SkillsChosen": {
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                currentStep: "SkillsChosen",
                skills: {
                  primary: event.primarySkills,
                  secondary: event.secondarySkills
                }
              }
            })
          )
          break
        }

        case "TraitChosen": {
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                currentStep: "TraitChosen",
                trait: event.traitName
              }
            })
          )
          break
        }

        case "HitPointsRolled": {
          const total = Math.max(1, event.rolledValue + event.constitutionModifier)
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                currentStep: "HitPointsRolled",
                hitPoints: {
                  rolled: event.rolledValue,
                  modifier: event.constitutionModifier,
                  total
                }
              }
            })
          )
          break
        }

        case "StartingMoneyRolled": {
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                startingMoney: event.silverAmount,
                remainingMoney: event.silverAmount
              }
            })
          )
          break
        }

        case "EquipmentPurchased": {
          const entityResult = yield* state.getEntity(event.entityId).pipe(Effect.option)

          if (Option.isNone(entityResult)) {
            yield* Effect.logError(`Entity ${event.entityId} not found for equipment purchase`)
            break
          }

          const entity = entityResult.value
          const creation = getComponent(entity, "CharacterCreation")

          if (!creation) {
            yield* Effect.logError(
              `CharacterCreation component not found for equipment purchase at entity ${event.entityId}`
            )
            break
          }

          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                currentStep: "EquipmentPhase",
                remainingMoney: creation.remainingMoney - event.costInSilver,
                purchasedItems: [...creation.purchasedItems, event.itemId]
              }
            })
          )
          break
        }

        case "LanguagesChosen": {
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                currentStep: "LanguagesChosen",
                languages: event.languages
              }
            })
          )
          break
        }

        case "AlignmentChosen": {
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                currentStep: "AlignmentChosen",
                alignment: event.alignment
              }
            })
          )
          break
        }

        case "NameChosen": {
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                currentStep: "NameChosen",
                name: event.name
              }
            })
          )
          break
        }

        case "MysteriesChosen": {
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: event.entityId,
              data: {
                mysteries: event.mysteryNames
              }
            })
          )
          break
        }

        case "CharacterCreationCompleted": {
          const entityResult = yield* state.getEntity(event.entityId).pipe(Effect.option)

          if (Option.isNone(entityResult)) {
            yield* Effect.logError(`Entity ${event.entityId} not found for character creation completion`)
            break
          }

          const entity = entityResult.value
          const creation = getComponent(entity, "CharacterCreation")

          if (!creation) {
            yield* Effect.logError(`CharacterCreation component not found for entity ${event.entityId}`)
            break
          }

          // Validate all required fields using type guard
          if (!isValidatedCreation(creation)) {
            yield* Effect.logError(
              `Character creation incomplete for ${event.entityId}: missing ${
                !creation.attributes
                  ? "attributes"
                  : !creation.class
                  ? "class"
                  : !creation.skills
                  ? "skills"
                  : !creation.hitPoints
                  ? "hitPoints"
                  : !creation.alignment
                  ? "alignment"
                  : "name"
              }`
            )
            break
          }

          // At this point TypeScript knows creation is ValidatedCharacterCreation
          // Validate Mystic has mysteries
          if (creation.class === "Mystic" && (!creation.mysteries || creation.mysteries.length === 0)) {
            yield* Effect.logError(`Mystic character ${event.entityId} missing mysteries`)
            break
          }

          // Validate non-Mystics don't have mysteries
          if (creation.class !== "Mystic" && creation.mysteries && creation.mysteries.length > 0) {
            yield* Effect.logError(`Non-Mystic character ${event.entityId} has mysteries`)
            break
          }

          const components = buildFinalCharacterComponents(creation)
          // eslint-disable-next-line functional/immutable-data -- local mutation within system, converted to immutable Chunk on return
          mutations.push(
            SetMultipleComponentsMutation.make({
              entityId: event.entityId,
              components,
              removeComponents: ["CharacterCreation"]
            })
          )
          break
        }
      }
    }

    return { mutations: Chunk.fromIterable(mutations), warnings: Chunk.empty<ConsistencyWarning>() }
  })

/**
 * Build all final character components from validated creation data
 */
function buildFinalCharacterComponents(creation: ValidatedCharacterCreation): Array<Component> {
  const level = creation.startingLevel
  const attrs = creation.attributes
  const components: Array<Component> = []

  // 1. Attributes
  // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
  components.push(
    AttributesComponent.make({
      strength: attrs.strength,
      dexterity: attrs.dexterity,
      constitution: attrs.constitution,
      intelligence: attrs.intelligence,
      will: attrs.will,
      charisma: attrs.charisma
    })
  )

  // 2. Class
  // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
  components.push(
    ClassComponent.make({
      class: creation.class,
      level
    })
  )

  // 3. Skills
  // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
  components.push(buildSkillsComponent(creation.skills, level))

  // 4. Saving Throws
  // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
  components.push(buildSavingThrowsComponent(level))

  // 5. Traits
  // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
  components.push(
    TraitsComponent.make({
      activeTrait: creation.trait ? [creation.trait] : [],
      traitStacks: HashMap.empty()
    })
  )

  // 6. Health
  // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
  components.push(
    HealthComponent.make({
      current: creation.hitPoints.total,
      max: creation.hitPoints.total,
      traumaActive: false,
      traumaEffect: null
    })
  )

  // 7. Currency (remaining money)
  // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
  components.push(
    CurrencyComponent.make({
      copper: 0,
      silver: creation.remainingMoney,
      gold: 0,
      platinum: 0
    })
  )

  // 8. Inventory
  // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
  components.push(
    InventoryComponent.make({
      items: creation.purchasedItems,
      loadCapacity: attrs.strength * 10,
      currentLoad: 0 // Will be calculated by encumbrance system
    })
  )

  // 9. Experience
  // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
  components.push(
    ExperienceComponent.make({
      currentXP: 0,
      level
    })
  )

  // 10. Class-specific components
  const classComponents = buildClassSpecificComponents(
    creation.class,
    level,
    attrs.intelligence,
    attrs.will,
    creation.mysteries
  )
  // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
  components.push(...classComponents)

  return components
}

/**
 * Build skills component from chosen skills
 */
function buildSkillsComponent(
  skills: { readonly primary: ReadonlyArray<string>; readonly secondary: ReadonlyArray<string> },
  level: number
): SkillsComponent {
  const createSkill = (skillName: string) => {
    const isPrimary = skills.primary.includes(skillName)
    const isSecondary = skills.secondary.includes(skillName)
    const proficiency = isPrimary ? "Primary" : isSecondary ? "Secondary" : "Untrained"

    return Skill.make({
      proficiency,
      levelBonus: calculateSkillLevelBonus(proficiency, level)
    })
  }

  return SkillsComponent.make({
    melee: createSkill("melee"),
    might: createSkill("might"),
    accuracy: createSkill("accuracy"),
    movement: createSkill("movement"),
    sleightOfHand: createSkill("sleightOfHand"),
    stealth: createSkill("stealth"),
    alchemy: createSkill("alchemy"),
    craft: createSkill("craft"),
    knowledge: createSkill("knowledge"),
    medicine: createSkill("medicine"),
    awareness: createSkill("awareness"),
    survival: createSkill("survival"),
    occultism: createSkill("occultism"),
    performance: createSkill("performance"),
    animalHandling: createSkill("animalHandling")
  })
}

/**
 * Build saving throws component
 */
function buildSavingThrowsComponent(level: number): SavingThrowsComponent {
  return SavingThrowsComponent.make({
    baseSaveBonus: calculateBaseSaveBonus(level),
    restraintModifier: 0,
    exhaustionModifier: 0,
    dodgeModifier: 0,
    suppressionModifier: 0,
    confusionModifier: 0,
    curseModifier: 0
  })
}

/**
 * Build class-specific components
 */
function buildClassSpecificComponents(
  characterClass: "Fighter" | "Specialist" | "Mystic",
  level: number,
  intelligence: number,
  will: number,
  mysteries: ReadonlyArray<string> | null
): Array<Component> {
  const components: Array<Component> = []

  switch (characterClass) {
    case "Fighter":
      // Combat Superiority starts at level 2
      if (level >= 2) {
        const extraAttacks = calculateCombatSuperiorityExtraAttacks(level)
        // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
        components.push(
          CombatSuperiorityComponent.make({
            extraAttacksPerRound: extraAttacks,
            attacksUsedThisRound: 0,
            chainActive: false
          })
        )
      }
      break

    case "Specialist":
      // Sneak Attack
      const sneakDice = calculateSneakAttackDice(level)
      // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
      components.push(
        SneakAttackComponent.make({
          extraDamageDice: sneakDice
        })
      )

      // Lucky Skill
      const recoveryDie = calculateLuckySkillRecoveryDie(level)
      const maxPoints = 5 + level
      // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
      components.push(
        LuckySkillComponent.make({
          maxPoints,
          currentPoints: maxPoints,
          recoveryDieSize: recoveryDie
        })
      )
      break

    case "Mystic":
      // Forbidden Knowledge
      // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
      components.push(
        ForbiddenKnowledgeComponent.make({
          identificationBonus: 0,
          knownArtifacts: []
        })
      )

      // Known Mysteries
      const maxTier = calculateMaxMysteryTier(level)
      // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
      components.push(
        KnownMysteriesComponent.make({
          knownMysteries: Array.from(mysteries || []),
          maxTierAvailable: maxTier
        })
      )

      // Concentration
      const willMod = Math.floor((will - 10) / 2)
      const maxCP = calculateMaxConcentrationPoints(level, willMod)
      // eslint-disable-next-line functional/immutable-data -- local mutation within function, returned as immutable array
      components.push(
        ConcentrationComponent.make({
          maxPoints: maxCP,
          currentPoints: maxCP,
          activeConcentration: null,
          concentrationBonus: 0
        })
      )
      break
  }

  return components
}
