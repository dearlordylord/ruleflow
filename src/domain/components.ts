/**
 * Phase 1 Components: Attributes, Health, Class, Combat Stats, Weapon, Item
 */
import { Schema } from "effect"

import { EntityId } from "./entities.js"
import { CharacterCreationComponent } from "./character/creation.js"
import { SkillsComponent } from "./character/skills.js"
import { SavingThrowsComponent } from "./character/saves.js"
import {
  TraumaStateComponent,
  CombatSuperiorityComponent,
  SneakAttackComponent,
  LuckySkillComponent,
  ForbiddenKnowledgeComponent,
  TraitsComponent,
  ExperienceComponent,
  TraitProgressionComponent
} from "./character/index.js"
import { KnownMysteriesComponent, ConcentrationComponent } from "./mysticism/index.js"

// OSR formula: (attribute - 10) / 2 rounded down
const calculateModifier = (attribute: number): number => Math.floor((attribute - 10) / 2)

export class AttributesComponent extends Schema.TaggedClass<AttributesComponent>()("Attributes", {
  strength: Schema.Int.pipe(Schema.between(3, 18)),
  dexterity: Schema.Int.pipe(Schema.between(3, 18)),
  intelligence: Schema.Int.pipe(Schema.between(3, 18)),
  will: Schema.Int.pipe(Schema.between(3, 18)),
  constitution: Schema.Int.pipe(Schema.between(3, 18)),
  charisma: Schema.Int.pipe(Schema.between(3, 18))
}) {
  get strengthMod() {
    return calculateModifier(this.strength)
  }
  get dexterityMod() {
    return calculateModifier(this.dexterity)
  }
  get intelligenceMod() {
    return calculateModifier(this.intelligence)
  }
  get willMod() {
    return calculateModifier(this.will)
  }
  get constitutionMod() {
    return calculateModifier(this.constitution)
  }
  get charismaMod() {
    return calculateModifier(this.charisma)
  }
}

export class HealthComponent extends Schema.TaggedClass<HealthComponent>()("Health", {
  current: Schema.Int,
  max: Schema.Int.pipe(Schema.greaterThan(0)),
  traumaActive: Schema.Boolean,
  traumaEffect: Schema.NullOr(
    Schema.Literal("Bleeding", "Unconscious", "Wounded")
  )
}) {}
// Note: current can be negative (overkill damage), so no lower bound
// Invariant current <= max enforced at application logic level, not schema

export const CharacterClass = Schema.Literal("Fighter", "Specialist", "Mystic")
export type CharacterClass = typeof CharacterClass.Type

export class ClassComponent extends Schema.TaggedClass<ClassComponent>()("Class", {
  class: CharacterClass,
  level: Schema.Int.pipe(Schema.between(1, 10))
}) {}

export class CombatStatsComponent extends Schema.TaggedClass<CombatStatsComponent>()("CombatStats", {
  meleeAttackBonus: Schema.Int,
  rangedAttackBonus: Schema.Int,
  armorClass: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

// Dice notation pattern
const diceNotationPattern = /^\d+d\d+(?:[+-]\d+)?$/

/**
 * Dice notation string (e.g., "1d8", "2d6+3", "1d20-2")
 * Validated with regex, branded for type safety
 */
export const DiceNotation = Schema.String.pipe(
  Schema.filter((input): input is string => diceNotationPattern.test(input), {
    message: () => "Invalid dice notation (expected: NdN, NdN+M, or NdN-M)"
  }),
  Schema.brand("DiceNotation")
)
export type DiceNotation = typeof DiceNotation.Type

export const WeaponGroup = Schema.Literal(
  "Axes",
  "Blades",
  "Bows",
  "Brawling",
  "Clubs",
  "Crossbows",
  "Flails",
  "Polearms",
  "Slings",
  "Spears",
  "Staves",
  "Thrown"
)
export type WeaponGroup = typeof WeaponGroup.Type

export class WeaponComponent extends Schema.TaggedClass<WeaponComponent>()("Weapon", {
  name: Schema.NonEmptyString,
  damageDice: DiceNotation,
  weaponGroup: WeaponGroup,
  traits: Schema.Array(Schema.String)
}) {}

export const LoadSize = Schema.Literal("Small", "Standard", "Large")
export type LoadSize = typeof LoadSize.Type

export class ItemComponent extends Schema.TaggedClass<ItemComponent>()("Item", {
  name: Schema.NonEmptyString,
  loadSize: LoadSize,
  quantity: Schema.Int.pipe(Schema.greaterThan(0))
}) {
  get loadValue(): number {
    const base = this.loadSize === "Small" ? 0.5 : this.loadSize === "Large" ? 2 : 1
    return base * this.quantity
  }
}

export class InventoryComponent extends Schema.TaggedClass<InventoryComponent>()("Inventory", {
  items: Schema.Array(EntityId),
  loadCapacity: Schema.Number.pipe(Schema.greaterThan(0)),
  currentLoad: Schema.Number.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

export class CurrencyComponent extends Schema.TaggedClass<CurrencyComponent>()("Currency", {
  copper: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  silver: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  gold: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {
  get totalCopper(): number {
    return this.copper + (this.silver * 10) + (this.gold * 100)
  }
}

export class ArmorComponent extends Schema.TaggedClass<ArmorComponent>()("Armor", {
  baseAC: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0)),
  armorType: Schema.String,
  encumbrancePenalty: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

export class SpecializationComponent extends Schema.TaggedClass<SpecializationComponent>()("Specialization", {
  weaponGroups: Schema.Array(WeaponGroup),
  bonusDamage: Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))
}) {}

export const Component = Schema.Union(
  AttributesComponent,
  HealthComponent,
  ClassComponent,
  CombatStatsComponent,
  WeaponComponent,
  ItemComponent,
  InventoryComponent,
  CurrencyComponent,
  ArmorComponent,
  SpecializationComponent,
  CharacterCreationComponent,
  SkillsComponent,
  SavingThrowsComponent,
  TraumaStateComponent,
  CombatSuperiorityComponent,
  SneakAttackComponent,
  LuckySkillComponent,
  ForbiddenKnowledgeComponent,
  TraitsComponent,
  ExperienceComponent,
  TraitProgressionComponent,
  KnownMysteriesComponent,
  ConcentrationComponent
)
export type Component = typeof Component.Type

// Component tag schema for validation
export const ComponentTag = Schema.Literal(
  "Attributes",
  "Health",
  "Class",
  "CombatStats",
  "Weapon",
  "Item",
  "Inventory",
  "Currency",
  "Armor",
  "Specialization",
  "CharacterCreation",
  "Skills",
  "SavingThrows",
  "TraumaState",
  "CombatSuperiority",
  "SneakAttack",
  "LuckySkill",
  "ForbiddenKnowledge",
  "Traits",
  "Experience",
  "TraitProgression",
  "KnownMysteries",
  "Concentration"
)
export type ComponentTag = typeof ComponentTag.Type

// Entity with components stored as array (discriminated union ensures type safety)
export class Entity extends Schema.TaggedClass<Entity>()("Entity", {
  id: EntityId,
  components: Schema.Array(Component)
}) {}

// Helper: Get component by tag (type-safe lookup)
export function getComponent<T extends ComponentTag>(
  entity: Entity,
  tag: T
): Extract<Component, { _tag: T }> | undefined {
  return entity.components.find((c) => c._tag === tag) as Extract<Component, { _tag: T }> | undefined
}

// Helper: Has component check
export function hasComponent<T extends ComponentTag>(
  entity: Entity,
  tag: T
): entity is Entity & { components: Array<Extract<Component, { _tag: T }>> } {
  return entity.components.some((c) => c._tag === tag)
}

// Helper: Set/update component (returns new entity)
export function setComponent(
  entity: Entity,
  component: Component
): Entity {
  const filtered = entity.components.filter((c) => c._tag !== component._tag)
  return Entity.make({
    ...entity,
    components: [...filtered, component]
  })
}

// Helper: Remove component (returns new entity)
export function removeComponent<T extends ComponentTag>(
  entity: Entity,
  tag: T
): Entity {
  return Entity.make({
    ...entity,
    components: entity.components.filter((c) => c._tag !== tag)
  })
}
