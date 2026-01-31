/**
 * Reaction System - NPC/Encounter reactions
 */
import { Schema } from "effect"

/**
 * Reaction table results (2d6 + Charisma modifier + reputation)
 */
export const ReactionType = Schema.Literal(
  "Hostile", // ≤ 2: Immediately attempt harm
  "Unfriendly", // 3-5: May harm if provoked
  "Wary", // 6-8: No hostility unless provoked
  "Neutral", // 9-11: Attempt negotiation
  "Friendly" // 12+: Interested, willing to ally
)
export type ReactionType = typeof ReactionType.Type

export class ReactionComponent extends Schema.TaggedClass<ReactionComponent>()("Reaction", {
  currentReaction: ReactionType,

  // Reputation modifiers
  hasGoodReputation: Schema.Boolean, // +1 to reaction rolls
  hasBadReputation: Schema.Boolean // -1 to reaction rolls
}) {}

/**
 * Determine reaction from 2d6 roll + modifiers
 */
export function getReactionType(
  roll: number,
  charismaModifier: number,
  reputationModifier: number
): ReactionType {
  const total = roll + charismaModifier + reputationModifier

  if (total <= 2) return "Hostile"
  if (total <= 5) return "Unfriendly"
  if (total <= 8) return "Wary"
  if (total <= 11) return "Neutral"
  return "Friendly"
}
