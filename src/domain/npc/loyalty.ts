/**
 * Loyalty System - Follower/Hireling loyalty
 */
import { Schema } from "effect"

import type { EntityId } from "../entities.js"

/**
 * Loyalty value for followers
 * Base = Charisma modifier
 * Modified by: Leader trait (+1), treatment, pay, danger
 */
export class LoyaltyComponent extends Schema.TaggedClass<LoyaltyComponent>()("Loyalty", {
  // Who this entity is loyal to
  loyalTo: EntityId,

  // Loyalty value (typically -4 to +4, can go higher)
  loyaltyValue: Schema.Int,

  // Loyalty check modifiers
  treatmentModifier: Schema.Int, // Good treatment +1, bad -1
  paymentStatus: Schema.Literal("Overpaid", "Paid", "Underpaid", "Unpaid"),

  // Has follower betrayed or left
  hasBetrayedOrLeft: Schema.Boolean
}) {}

/**
 * Get payment modifier for loyalty
 */
export function getPaymentModifier(paymentStatus: string): number {
  switch (paymentStatus) {
    case "Overpaid": return +2
    case "Paid": return 0
    case "Underpaid": return -2
    case "Unpaid": return -4
    default: return 0
  }
}
