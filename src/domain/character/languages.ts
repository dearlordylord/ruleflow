/**
 * Languages System - Native and learned languages
 */
import { Schema } from "effect"

/**
 * Language proficiency tracking
 */
export class LanguagesComponent extends Schema.TaggedClass<LanguagesComponent>()("Languages", {
  // Character's native language (automatic fluency)
  nativeLanguage: Schema.NonEmptyString,

  // Additional languages learned through Knowledge skill or traits
  learnedLanguages: Schema.Array(Schema.NonEmptyString),

  // Whether character is literate (can read/write in known languages)
  isLiterate: Schema.Boolean
}) {}

/**
 * Language groups for Linguist trait
 * Characters with Linguist must know 3 languages from different groups
 */
export const LanguageGroup = Schema.Literal(
  "Common", // Local trade languages
  "Ancient", // Dead/scholarly languages
  "Exotic", // Rare/foreign languages
  "Mystical" // Supernatural/magical languages
)
export type LanguageGroup = typeof LanguageGroup.Type

/**
 * Common languages by difficulty (DC for Linguist translation)
 */
export const COMMON_LANGUAGES = {
  Local: { group: "Common" as LanguageGroup, translationDC: 10 },
  Trade: { group: "Common" as LanguageGroup, translationDC: 10 },
  Elvish: { group: "Exotic" as LanguageGroup, translationDC: 15 },
  Dwarvish: { group: "Exotic" as LanguageGroup, translationDC: 15 },
  Ancient: { group: "Ancient" as LanguageGroup, translationDC: 18 },
  Draconic: { group: "Mystical" as LanguageGroup, translationDC: 20 }
} as const
