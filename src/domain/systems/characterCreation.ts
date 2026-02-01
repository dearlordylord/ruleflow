/**
 * Character Creation System - processes all character creation events
 */
import { Chunk, Effect, HashMap } from "effect"

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
  calculateBaseSaveBonus
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
          const entity = yield* state.getEntity(e.entityId)
          const creation = getComponent(entity, "CharacterCreation")

          if (creation) {
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
          }
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
          const entity = yield* state.getEntity(e.entityId)
          const creation = getComponent(entity, "CharacterCreation")

          if (
            !creation ||
            !creation.attributes ||
            !creation.class ||
            !creation.skills ||
            !creation.hitPoints ||
            !creation.alignment ||
            !creation.name
          ) {
            // Validation failure
            break
          }

          // Validate Mystic has mysteries
          if (creation.class === "Mystic" && (!creation.mysteries || creation.mysteries.length === 0)) {
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
  }).pipe(
    Effect.catchAll(() => Effect.succeed(Chunk.empty()))
  )

/**
 * Build all final character components from creation data
 */
function buildFinalCharacterComponents(creation: CharacterCreationComponent): Component[] {
  const level = creation.startingLevel
  const attrs = creation.attributes!
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
      class: creation.class!,
      level
    })
  )

  // 3. Skills
  components.push(buildSkillsComponent(creation.skills!, level))

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
      current: creation.hitPoints!.total,
      max: creation.hitPoints!.total,
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
    creation.class!,
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
  const allSkillNames = [
    "melee",
    "might",
    "accuracy",
    "movement",
    "sleightOfHand",
    "stealth",
    "alchemy",
    "knowledge",
    "medicine",
    "awareness",
    "survival",
    "occultism",
    "performance",
    "animalHandling"
  ] as const

  const skillData: Record<string, Skill> = {}

  for (const skillName of allSkillNames) {
    const isPrimary = skills.primary.includes(skillName)
    const isSecondary = skills.secondary.includes(skillName)

    const proficiency = isPrimary ? "Primary" : isSecondary ? "Secondary" : "Untrained"

    skillData[skillName] = Skill.make({
      proficiency,
      levelBonus: calculateSkillLevelBonus(proficiency, level)
    })
  }

  return SkillsComponent.make(skillData as any)
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
        const extraAttacks = Math.floor((level - 1) / 2)
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
      const sneakDice = level >= 9 ? 4 : level >= 6 ? 3 : level >= 3 ? 2 : 1
      components.push(
        SneakAttackComponent.make({
          extraDamageDice: sneakDice
        })
      )

      // Lucky Skill
      const recoveryDie = Math.min(12, 4 + Math.floor((level - 1) / 2) * 2)
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
      const maxTier = level >= 9 ? 5 : level >= 7 ? 4 : level >= 5 ? 3 : level >= 3 ? 2 : 1
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
