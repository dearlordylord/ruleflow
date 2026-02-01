/**
 * Concentration Failure Table - Effects when mystery casting fails
 */

export type CastingFailureEffect = {
  roll: number
  effect: string
}

/**
 * Table of 20 possible casting failure outcomes from rulebook page 84
 * Rolled when Occultism check fails due to insufficient concentration points
 */
export const CONCENTRATION_FAILURE_TABLE: readonly CastingFailureEffect[] = [
  {
    roll: 1,
    effect: "Mystery fails. Cannot cast it again until concentration points recovered."
  },
  {
    roll: 2,
    effect: "Mystery succeeds but damages psyche. Temporarily lose 1d4 Will and Intelligence."
  },
  {
    roll: 3,
    effect: "Mystery succeeds but drains life force. Take 1d6 damage per mystery tier, +1d6 per 2 CP spent on augmentation."
  },
  {
    roll: 4,
    effect: "Mystery succeeds but caster immediately loses consciousness from overload. Wake after 1d8 hours."
  },
  {
    roll: 5,
    effect: "Mystery fails. Suffer agonizing pain throughout body. For 1d8 hours, 1-in-6 chance to be stunned 1 round when taking action."
  },
  {
    roll: 6,
    effect: "Mystery succeeds but drains body. Temporarily lose 1d4 Constitution and Strength."
  },
  {
    roll: 7,
    effect: "Mystery fails - instead cast random known mystery. Augment to match original CP cost if possible. If no other mysteries known, reroll."
  },
  {
    roll: 8,
    effect: "Mystery succeeds but lose part of self. Lose XP based on CP cost: 1(150), 2(200), 3(300), 4(500), 5(800), 6(1200), 7(2000), 8(3500), 9(6000), 10(10000). May lose level or abilities."
  },
  {
    roll: 9,
    effect: "Mystery succeeds but drains energy. Gain fatigue penalty -1d4."
  },
  {
    roll: 10,
    effect: "Mystery fails. Fall into psychosis: +2 melee/grappling, -2 AC, attack nearest creature with melee/fists. Lasts 1 round per CP required."
  },
  {
    roll: 11,
    effect: "Mystery fails. Mind becomes confused - Occultism DC for casting mysteries increases by +2."
  },
  {
    roll: 12,
    effect: "Mystery succeeds but lose speech for 2d6 days - can only make inarticulate sounds."
  },
  {
    roll: 13,
    effect: "Mystery fails - instead explosion of otherworldly energy at target point. Stuns and deals 1d6 damage per tier (+1d6 per 2 augmentation CP) in 30' radius. DC 15 Dodge save halves damage and prevents stun."
  },
  {
    roll: 14,
    effect: "Mystery succeeds with delay - effects activate after 1d6 rounds. Target/location unchanged even if caster moved."
  },
  {
    roll: 15,
    effect: "Mystery succeeds but lose sight and hearing for 2d6 hours."
  },
  {
    roll: 16,
    effect: "Mystery fails - engulfed in sinister blue flame. Take 1d6 damage per round. Action + DC 15 Dodge save to extinguish (+2 if rolling on ground)."
  },
  {
    roll: 17,
    effect: "Mystery succeeds but surrounded by invisible aura causing subconscious revulsion for 2d6 days. -2 reaction rolls."
  },
  {
    roll: 18,
    effect: "Mystery fails - vanish from reality for 2d6 hours. Reappear in same location, temporarily losing 1d6 random attribute. No memory of where you were."
  },
  {
    roll: 19,
    effect: "Mystery succeeds but attract attention of 1d4 otherworldly creatures from another dimension. They appear as if Summoned with HD equal to CP cost, form determined by 1d12. Automatically hostile."
  },
  {
    roll: 20,
    effect: "Mystery fails but miraculously avoid side effects."
  }
] as const

/**
 * Get casting failure effect by d20 roll
 */
export function getCastingFailureEffect(roll: number): string {
  const clamped = Math.max(1, Math.min(20, Math.floor(roll)))
  const entry = CONCENTRATION_FAILURE_TABLE.find(e => e.roll === clamped)
  return entry?.effect ?? CONCENTRATION_FAILURE_TABLE[19]!.effect // Default to roll 20
}
