/**
 * Alignment System - Lawful, Chaotic, Neutral
 */
import { Schema } from "effect"

/**
 * Three-axis alignment system from rulebook
 */
export const Alignment = Schema.Literal("Lawful", "Chaotic", "Neutral")
export type Alignment = typeof Alignment.Type

/**
 * Alignment component attached to characters
 */
export class AlignmentComponent extends Schema.TaggedClass<AlignmentComponent>()("Alignment", {
  alignment: Alignment
}) {}

/**
 * Helper to check if action matches alignment
 */
export function isAlignedAction(
  characterAlignment: Alignment,
  actionAlignment: Alignment
): boolean {
  return characterAlignment === actionAlignment || characterAlignment === "Neutral"
}
