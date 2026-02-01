/**
 * Character Creation System - processes all character creation events
 */
import { Chunk, Effect, HashMap, Option } from "effect"

import { getComponent } from "../components.js"
import {
  AttributesComponent,
  CharacterCreationComponent,
  HealthComponent,
  SkillsComponent,
  SavingThrowsComponent,
  TraitsComponent,
  ExperienceComponent,
  ClassComponent,
  CombatSuperiorityComponent,
  SneakAttackComponent,
  LuckySkillComponent,
  ForbiddenKnowledgeComponent,
  Skill,
  calculateSkillLevelBonus,
  calculateBaseSaveBonus,
  calculateCombatSuperiorityExtraAttacks,
  calculateSneakAttackDice,
  calculateLuckySkillRecoveryDie,
  calculateMaxMysteryTier
} from "../character/index.js"
import {
  CharacterCreationStarted,
  AttributesRolled,
  ClassChosen,
  SkillsChosen,
  TraitChosen,
  HitPointsRolled,
  StartingMoneyRolled,
  EquipmentPurchased,
  LanguagesChosen,
  AlignmentChosen,
  NameChosen,
  MysteriesChosen,
  CharacterCreationCompleted
} from "../character/creationEvents.js"
import { UpdateCharacterCreationMutation } from "../character/mutations.js"
import { SetMultipleComponentsMutation } from "../mutations.js"
import { CurrencyComponent, InventoryComponent } from "../inventory/index.js"
import { KnownMysteriesComponent, ConcentrationComponent, calculateMaxConcentrationPoints } from "../mysticism/index.js"
import type { Component } from "../components.js"
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
    creation.attributes &&
    creation.class &&
    creation.skills &&
    creation.hitPoints &&
    creation.alignment &&
    creation.name
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
          const e = event as CharacterCreationStarted
          mutations.push(
            SetMultipleComponentsMutation.make({
              entityId: e.entityId,
              components: [
                CharacterCreationComponent.make({
                  playerId: e.playerId,
                  currentStep: "Started",
                  startingLevel: e.startingLevel,
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
          const e = event as AttributesRolled
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                currentStep: "AttributesRolled",
                attributes: {
                  strength: e.strength,
                  dexterity: e.dexterity,
                  constitution: e.constitution,
                  intelligence: e.intelligence,
                  will: e.will,
                  charisma: e.charisma
                }
              }
            })
          )
          break
        }

        case "ClassChosen": {
          const e = event as ClassChosen
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                currentStep: "ClassChosen",
                class: e.class
              }
            })
          )
          break
        }

        case "SkillsChosen": {
          const e = event as SkillsChosen
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                currentStep: "SkillsChosen",
                skills: {
                  primary: e.primarySkills,
                  secondary: e.secondarySkills
                }
              }
            })
          )
          break
        }

        case "TraitChosen": {
          const e = event as TraitChosen
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                currentStep: "TraitChosen",
                trait: e.traitName
              }
            })
          )
          break
        }

        case "HitPointsRolled": {
          const e = event as HitPointsRolled
          const total = Math.max(1, e.rolledValue + e.constitutionModifier)
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                currentStep: "HitPointsRolled",
                hitPoints: {
                  rolled: e.rolledValue,
                  modifier: e.constitutionModifier,
                  total
                }
              }
            })
          )
          break
        }

        case "StartingMoneyRolled": {
          const e = event as StartingMoneyRolled
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                startingMoney: e.silverAmount,
                remainingMoney: e.silverAmount
              }
            })
          )
          break
        }

        case "EquipmentPurchased": {
          const e = event as EquipmentPurchased
          const entityResult = yield* state.getEntity(e.entityId).pipe(Effect.option)

          if (Option.isNone(entityResult)) {
            yield* Effect.logError(`Entity ${e.entityId} not found for equipment purchase`)
            break
          }

          const entity = entityResult.value
          const creation = getComponent(entity, "CharacterCreation")

          if (!creation) {
            yield* Effect.logError(`CharacterCreation component not found for equipment purchase at entity ${e.entityId}`)
            break
          }

          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                currentStep: "EquipmentPhase",
                remainingMoney: creation.remainingMoney - e.costInSilver,
                purchasedItems: [...creation.purchasedItems, e.itemId]
              }
            })
          )
          break
        }

        case "LanguagesChosen": {
          const e = event as LanguagesChosen
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                currentStep: "LanguagesChosen",
                languages: e.languages
              }
            })
          )
          break
        }

        case "AlignmentChosen": {
          const e = event as AlignmentChosen
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                currentStep: "AlignmentChosen",
                alignment: e.alignment
              }
            })
          )
          break
        }

        case "NameChosen": {
          const e = event as NameChosen
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                currentStep: "NameChosen",
                name: e.name
              }
            })
          )
          break
        }

        case "MysteriesChosen": {
          const e = event as MysteriesChosen
          mutations.push(
            UpdateCharacterCreationMutation.make({
              entityId: e.entityId,
              data: {
                mysteries: e.mysteryNames
              }
            })
          )
          break
        }

        case "CharacterCreationCompleted": {
          const e = event as CharacterCreationCompleted
          const entityResult = yield* state.getEntity(e.entityId).pipe(Effect.option)

          if (Option.isNone(entityResult)) {
            yield* Effect.logError(`Entity ${e.entityId} not found for character creation completion`)
            break
          }

          const entity = entityResult.value
          const creation = getComponent(entity, "CharacterCreation")

          if (!creation) {
            yield* Effect.logError(`CharacterCreation component not found for entity ${e.entityId}`)
            break
          }

          // Validate all required fields using type guard
          if (!isValidatedCreation(creation)) {
            yield* Effect.logError(
              `Character creation incomplete for ${e.entityId}: missing ${
                !creation.attributes ? "attributes" :
                !creation.class ? "class" :
                !creation.skills ? "skills" :
                !creation.hitPoints ? "hitPoints" :
                !creation.alignment ? "alignment" : "name"
              }`
            )
            break
          }

          // At this point TypeScript knows creation is ValidatedCharacterCreation
          // Validate Mystic has mysteries
          if (creation.class === "Mystic" && (!creation.mysteries || creation.mysteries.length === 0)) {
            yield* Effect.logError(`Mystic character ${e.entityId} missing mysteries`)
            break
          }

          // Validate non-Mystics don't have mysteries
          if (creation.class !== "Mystic" && creation.mysteries && creation.mysteries.length > 0) {
            yield* Effect.logError(`Non-Mystic character ${e.entityId} has mysteries`)
            break
          }

          const components = buildFinalCharacterComponents(creation)
          mutations.push(
            SetMultipleComponentsMutation.make({
              entityId: e.entityId,
              components,
              removeComponents: ["CharacterCreation"]
            })
          )
          break
        }
      }
    }

    return Chunk.fromIterable(mutations)
  })

/**
 * Build all final character components from validated creation data
 */
function buildFinalCharacterComponents(creation: ValidatedCharacterCreation): Component[] {
  const level = creation.startingLevel
  const attrs = creation.attributes
  const components: Component[] = []

  // 1. Attributes
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
  components.push(
    ClassComponent.make({
      class: creation.class,
      level
    })
  )

  // 3. Skills
  components.push(buildSkillsComponent(creation.skills, level))

  // 4. Saving Throws
  components.push(buildSavingThrowsComponent(level))

  // 5. Traits
  components.push(
    TraitsComponent.make({
      activeTrait: creation.trait ? [creation.trait] : [],
      traitStacks: HashMap.empty()
    })
  )

  // 6. Health
  components.push(
    HealthComponent.make({
      current: creation.hitPoints.total,
      max: creation.hitPoints.total,
      traumaActive: false,
      traumaEffect: null
    })
  )

  // 7. Currency (remaining money)
  components.push(
    CurrencyComponent.make({
      copper: 0,
      silver: creation.remainingMoney,
      gold: 0,
      platinum: 0
    })
  )

  // 8. Inventory
  components.push(
    InventoryComponent.make({
      items: creation.purchasedItems,
      loadCapacity: attrs.strength * 10,
      currentLoad: 0 // Will be calculated by encumbrance system
    })
  )

  // 9. Experience
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
  components.push(...classComponents)

  return components
}

/**
 * Build skills component from chosen skills
 */
function buildSkillsComponent(
  skills: { readonly primary: readonly string[]; readonly secondary: readonly string[] },
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
  mysteries: readonly string[] | null
): Component[] {
  const components: Component[] = []

  switch (characterClass) {
    case "Fighter":
      // Combat Superiority starts at level 2
      if (level >= 2) {
        const extraAttacks = calculateCombatSuperiorityExtraAttacks(level)
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
      components.push(
        SneakAttackComponent.make({
          extraDamageDice: sneakDice
        })
      )

      // Lucky Skill
      const recoveryDie = calculateLuckySkillRecoveryDie(level)
      const maxPoints = 5 + level
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
      components.push(
        ForbiddenKnowledgeComponent.make({
          identificationBonus: 0,
          knownArtifacts: []
        })
      )

      // Known Mysteries
      const maxTier = calculateMaxMysteryTier(level)
      components.push(
        KnownMysteriesComponent.make({
          knownMysteries: Array.from(mysteries || []),
          maxTierAvailable: maxTier
        })
      )

      // Concentration
      const willMod = Math.floor((will - 10) / 2)
      const maxCP = calculateMaxConcentrationPoints(level, willMod)
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
