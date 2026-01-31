/**
 * Entity - Container for all components
 */
import { Schema } from "effect"

import type * as Character from "./character/index.js"
import type * as Combat from "./combat/index.js"
import type * as Inventory from "./inventory/index.js"
import type * as Mysticism from "./mysticism/index.js"
import type * as NPC from "./npc/index.js"
import type * as World from "./world/index.js"
import { EntityId } from "./entities.js"

/**
 * Union of all possible components across all domains
 */
export const Component = Schema.Union(
  // Character domain
  Character.AttributesComponent,
  Character.HealthComponent,
  Character.TraumaStateComponent,
  Character.ClassComponent,
  Character.CombatSuperiorityComponent,
  Character.SneakAttackComponent,
  Character.LuckySkillComponent,
  Character.ForbiddenKnowledgeComponent,
  Character.SkillsComponent,
  Character.TraitsComponent,
  Character.SavingThrowsComponent,
  Character.ExperienceComponent,
  Character.TraitProgressionComponent,

  // Combat domain
  Combat.CombatStatsComponent,
  Combat.WeaponComponent,
  Combat.WeaponSpecializationComponent,
  Combat.EquippedWeaponsComponent,
  Combat.ArmorComponent,
  Combat.ShieldComponent,
  Combat.ConditionsComponent,
  Combat.GrappleStateComponent,
  Combat.InitiativeComponent,
  Combat.ActionEconomyComponent,
  Combat.AmmunitionComponent,
  Combat.ReloadStateComponent,

  // Inventory domain
  Inventory.ItemComponent,
  Inventory.InventoryComponent,
  Inventory.CurrencyComponent,
  Inventory.ConsumableComponent,

  // Mysticism domain
  Mysticism.KnownMysteriesComponent,
  Mysticism.ConcentrationComponent,
  Mysticism.ArtifactComponent,

  // NPC domain
  NPC.MoraleComponent,
  NPC.ReactionComponent,
  NPC.LoyaltyComponent,

  // World domain
  World.MovementComponent,
  World.PositionComponent,
  World.LightSourceComponent,
  World.VisionComponent
)
export type Component = typeof Component.Type

/**
 * Component tag for type-safe lookups
 */
export const ComponentTag = Schema.Literal(
  // Character
  "Attributes",
  "Health",
  "TraumaState",
  "Class",
  "CombatSuperiority",
  "SneakAttack",
  "LuckySkill",
  "ForbiddenKnowledge",
  "Skills",
  "Traits",
  "SavingThrows",
  "Experience",
  "TraitProgression",

  // Combat
  "CombatStats",
  "Weapon",
  "WeaponSpecialization",
  "EquippedWeapons",
  "Armor",
  "Shield",
  "Conditions",
  "GrappleState",
  "Initiative",
  "ActionEconomy",
  "Ammunition",
  "ReloadState",

  // Inventory
  "Item",
  "Inventory",
  "Currency",
  "Consumable",

  // Mysticism
  "KnownMysteries",
  "Concentration",
  "Artifact",

  // NPC
  "Morale",
  "Reaction",
  "Loyalty",

  // World
  "Movement",
  "Position",
  "LightSource",
  "Vision"
)
export type ComponentTag = typeof ComponentTag.Type

/**
 * Entity class with component array
 */
export class Entity extends Schema.TaggedClass<Entity>()("Entity", {
  id: EntityId,
  components: Schema.Array(Component)
}) {}

/**
 * Helper: Get component by tag (type-safe lookup)
 */
export function getComponent<T extends ComponentTag>(
  entity: Entity,
  tag: T
): Extract<Component, { _tag: T }> | undefined {
  return entity.components.find((c) => c._tag === tag) as Extract<Component, { _tag: T }> | undefined
}

/**
 * Helper: Has component check
 */
export function hasComponent<T extends ComponentTag>(
  entity: Entity,
  tag: T
): boolean {
  return entity.components.some((c) => c._tag === tag)
}

/**
 * Helper: Set/update component (returns new entity)
 */
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

/**
 * Helper: Remove component (returns new entity)
 */
export function removeComponent<T extends ComponentTag>(
  entity: Entity,
  tag: T
): Entity {
  return Entity.make({
    ...entity,
    components: entity.components.filter((c) => c._tag !== tag)
  })
}

/**
 * Helper: Remove all components by tag (returns new entity)
 */
export class RemoveComponentMutation extends Schema.TaggedClass<RemoveComponentMutation>()(
  "RemoveComponent",
  {
    entityId: EntityId,
    componentTag: ComponentTag
  }
) {}
