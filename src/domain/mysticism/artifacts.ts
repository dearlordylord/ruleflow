/**
 * Magical Artifacts - Unique items with special properties
 */
import { Schema } from "effect"

/**
 * Artifact rarity
 */
export const ArtifactRarity = Schema.Literal("Common", "Uncommon", "Rare", "VeryRare", "Legendary", "Cursed")
export type ArtifactRarity = typeof ArtifactRarity.Type

export class ArtifactComponent extends Schema.TaggedClass<ArtifactComponent>()("Artifact", {
  name: Schema.NonEmptyString,
  rarity: ArtifactRarity,

  // Special properties
  properties: Schema.Array(Schema.NonEmptyString),

  // Requires attunement
  requiresAttunement: Schema.Boolean,
  isAttuned: Schema.Boolean,

  // Curse (if any)
  isCursed: Schema.Boolean,
  curseDescription: Schema.NullOr(Schema.NonEmptyString),

  // Charges for limited-use artifacts
  charges: Schema.NullOr(Schema.Int.pipe(Schema.greaterThanOrEqualTo(0))),
  maxCharges: Schema.NullOr(Schema.Int.pipe(Schema.greaterThan(0)))
}) {}

/**
 * Sample artifacts from rulebook
 */
export const ARTIFACT_DEFINITIONS = {
  "Crown of the Sage": {
    name: "Crown of the Sage",
    rarity: "Rare" as ArtifactRarity,
    properties: ["Soul-reading ability", "1 in 6 false information chance"],
    requiresAttunement: true,
    isCursed: false
  },

  "Lucky Acorn": {
    name: "Lucky Acorn",
    rarity: "Uncommon" as ArtifactRarity,
    properties: ["Double rolls on checks/saves", "1 in 6 daily loss chance"],
    requiresAttunement: true,
    isCursed: true,
    curseDescription: "Curse of misfortune if lost"
  }
} as const
