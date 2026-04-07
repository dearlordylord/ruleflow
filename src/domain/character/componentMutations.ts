/**
 * Component mutation applicators - standalone functions that apply mutations to components.
 *
 * This module sits between components (data schemas) and mutations (operations),
 * importing both without creating circular dependencies.
 * DAG: components → mutations → componentMutations (imports both)
 */
import { AttributesComponent, DEFAULT_ATTRIBUTES } from "./attributes.js"
import { ClassComponent, DEFAULT_CLASS } from "./class.js"
import { DEFAULT_HEALTH, HealthComponent } from "./health.js"
import type {
  SetAttributesMutation,
  SetClassMutation,
  SetHealthMutation,
  SetSavingThrowsMutation,
  SetSkillsMutation
} from "./mutations.js"
import { DEFAULT_SAVING_THROWS, SavingThrowsComponent } from "./saves.js"
import { DEFAULT_SKILLS, SkillsComponent } from "./skills.js"

export function applyAttributesMutation(
  existing: AttributesComponent | null,
  mutation: SetAttributesMutation
): AttributesComponent {
  const base = existing ?? AttributesComponent.make(DEFAULT_ATTRIBUTES)
  return AttributesComponent.make({
    strength: mutation.data.strength ?? base.strength,
    dexterity: mutation.data.dexterity ?? base.dexterity,
    intelligence: mutation.data.intelligence ?? base.intelligence,
    will: mutation.data.will ?? base.will,
    constitution: mutation.data.constitution ?? base.constitution,
    charisma: mutation.data.charisma ?? base.charisma
  })
}

export function applyClassMutation(
  existing: ClassComponent | null,
  mutation: SetClassMutation
): ClassComponent {
  const base = existing ?? ClassComponent.make(DEFAULT_CLASS)
  return ClassComponent.make({
    class: mutation.data.class ?? base.class,
    level: mutation.data.level ?? base.level
  })
}

export function applyHealthMutation(
  existing: HealthComponent | null,
  mutation: SetHealthMutation
): HealthComponent {
  const base = existing ?? HealthComponent.make(DEFAULT_HEALTH)
  return HealthComponent.make({
    current: mutation.data.current ?? base.current,
    max: mutation.data.max ?? base.max,
    traumaActive: mutation.data.traumaActive ?? base.traumaActive,
    traumaEffect: mutation.data.traumaEffect ?? base.traumaEffect
  })
}

export function applySavingThrowsMutation(
  existing: SavingThrowsComponent | null,
  mutation: SetSavingThrowsMutation
): SavingThrowsComponent {
  const base = existing ?? SavingThrowsComponent.make(DEFAULT_SAVING_THROWS)
  return SavingThrowsComponent.make({
    baseSaveBonus: mutation.data.baseSaveBonus ?? base.baseSaveBonus,
    restraintModifier: mutation.data.restraintModifier ?? base.restraintModifier,
    exhaustionModifier: mutation.data.exhaustionModifier ?? base.exhaustionModifier,
    dodgeModifier: mutation.data.dodgeModifier ?? base.dodgeModifier,
    suppressionModifier: mutation.data.suppressionModifier ?? base.suppressionModifier,
    confusionModifier: mutation.data.confusionModifier ?? base.confusionModifier,
    curseModifier: mutation.data.curseModifier ?? base.curseModifier
  })
}

export function applySkillsMutation(
  existing: SkillsComponent | null,
  mutation: SetSkillsMutation
): SkillsComponent {
  const base = existing ?? SkillsComponent.make(DEFAULT_SKILLS)
  return SkillsComponent.make({
    melee: mutation.data.melee ?? base.melee,
    might: mutation.data.might ?? base.might,
    accuracy: mutation.data.accuracy ?? base.accuracy,
    movement: mutation.data.movement ?? base.movement,
    sleightOfHand: mutation.data.sleightOfHand ?? base.sleightOfHand,
    stealth: mutation.data.stealth ?? base.stealth,
    alchemy: mutation.data.alchemy ?? base.alchemy,
    craft: mutation.data.craft ?? base.craft,
    knowledge: mutation.data.knowledge ?? base.knowledge,
    medicine: mutation.data.medicine ?? base.medicine,
    awareness: mutation.data.awareness ?? base.awareness,
    survival: mutation.data.survival ?? base.survival,
    occultism: mutation.data.occultism ?? base.occultism,
    performance: mutation.data.performance ?? base.performance,
    animalHandling: mutation.data.animalHandling ?? base.animalHandling
  })
}
