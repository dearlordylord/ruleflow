/**
 * Special Traits/Feats - All 38+ character traits
 */
import { Schema } from "effect"

/**
 * Trait categories for organization
 */
export const TraitCategory = Schema.Literal(
  "Physical",
  "Defensive",
  "Skill",
  "Combat",
  "Mystical",
  "Social",
  "Craft"
)
export type TraitCategory = typeof TraitCategory.Type

/**
 * Trait requirement types
 */
export class TraitRequirement extends Schema.Class<TraitRequirement>("TraitRequirement")({
  // Skill requirements (e.g., "Melee Combat", "Awareness")
  requiredSkills: Schema.Array(Schema.String),

  // Class requirements
  requiredClass: Schema.NullOr(Schema.Literal("Fighter", "Specialist", "Mystic")),

  // Alignment requirements (for Witch Hunter, Initiated)
  requiredAlignment: Schema.NullOr(Schema.Literal("Lawful", "Chaotic", "Neutral")),

  // Other trait requirements (e.g., Mounted Archer requires Mounted Combat)
  prerequisiteTraits: Schema.Array(Schema.String),

  // Mystery requirements for mystical traits
  requiredMysteries: Schema.Array(Schema.String)
}) {}

/**
 * Trait definition
 */
export class Trait extends Schema.Class<Trait>("Trait")({
  name: Schema.NonEmptyString,
  category: TraitCategory,
  requirements: TraitRequirement,
  description: Schema.NonEmptyString,

  // Stackable traits can be taken multiple times
  stackable: Schema.Boolean
}) {}

/**
 * Component tracking character's active traits
 */
export class TraitsComponent extends Schema.TaggedClass<TraitsComponent>()("Traits", {
  activeTrait: Schema.Array(Schema.NonEmptyString), // Trait names
  traitStacks: Schema.HashMap({
    key: Schema.NonEmptyString,
    value: Schema.Int.pipe(Schema.greaterThan(0))
  }) // For stackable traits like Favorite Weapon, Initiated
}) {}

/**
 * All trait definitions (38+ traits)
 */
export const ALL_TRAITS: Record<string, Trait> = {
  // PHYSICAL / COMBAT TRAITS
  Acrobat: Trait.make({
    name: "Acrobat",
    category: "Physical",
    requirements: TraitRequirement.make({
      requiredSkills: ["Movement"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "No vulnerability during balancing/climbing, speed unaffected, half speed climbing, 5' jump minimum",
    stackable: false
  }),

  Assassin: Trait.make({
    name: "Assassin",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: ["Sneak Attack"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Preparation ritual, DC 15 + Int mod save or instant death",
    stackable: false
  }),

  Berserker: Trait.make({
    name: "Berserker",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Free action rage: +2 melee/grapple, -2 AC, DC 15 suppression save to exit",
    stackable: false
  }),

  "Combat Reflexes": Trait.make({
    name: "Combat Reflexes",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "+1 initiative bonus",
    stackable: false
  }),

  "Unarmed Fighting": Trait.make({
    name: "Unarmed Fighting",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: ["Melee Combat"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "1d4 unarmed damage, adds specialization bonus",
    stackable: false
  }),

  "Two-Weapon Fighting": Trait.make({
    name: "Two-Weapon Fighting",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: ["Melee Combat"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Dual attack with penalties based on secondary weapon size",
    stackable: false
  }),

  Grappler: Trait.make({
    name: "Grappler",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: ["Melee Combat"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "+2 grapple/escape rolls, wrestling hold ability",
    stackable: false
  }),

  "Shield Fighter": Trait.make({
    name: "Shield Fighter",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: ["Melee Combat"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "+2 push bonus, shield immunity to attack of opportunity",
    stackable: false
  }),

  Duellist: Trait.make({
    name: "Duellist",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: ["Melee Combat"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "+1/+2/+3 AC vs light/no armor at levels 1/5/9",
    stackable: false
  }),

  "Mounted Combat": Trait.make({
    name: "Mounted Combat",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: ["Animal Handling"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Simultaneous charge+attack/shove action",
    stackable: false
  }),

  "Mounted Archer": Trait.make({
    name: "Mounted Archer",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: ["Animal Handling"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "No penalty for mounted archery",
    stackable: false
  }),

  // DEFENSIVE TRAITS
  Hardy: Trait.make({
    name: "Hardy",
    category: "Defensive",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Permanent max HP +level, +1 HP per future level, stabilization at -3 HP, death at -5 HP",
    stackable: false
  }),

  Resilience: Trait.make({
    name: "Resilience",
    category: "Defensive",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Stamina points (1+CON mod min), negates fatigue, recovery 1 per day",
    stackable: false
  }),

  "Blind Sight": Trait.make({
    name: "Blind Sight",
    category: "Defensive",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Fight blinded without vulnerability, -2 penalty vs -4, speed unaffected",
    stackable: false
  }),

  "Sense of Danger": Trait.make({
    name: "Sense of Danger",
    category: "Defensive",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Save advantage: 1/2 damage becomes 0 damage",
    stackable: false
  }),

  // SKILL / UTILITY TRAITS
  Locksmith: Trait.make({
    name: "Locksmith",
    category: "Skill",
    requirements: TraitRequirement.make({
      requiredSkills: ["Sleight of Hand"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "1d4 round lockpicking, trap immunity on failure",
    stackable: false
  }),

  Trapsmith: Trait.make({
    name: "Trapsmith",
    category: "Skill",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Trap disabling expertise",
    stackable: false
  }),

  Observer: Trait.make({
    name: "Observer",
    category: "Skill",
    requirements: TraitRequirement.make({
      requiredSkills: ["Awareness"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Free hidden object detection while passing",
    stackable: false
  }),

  Sniper: Trait.make({
    name: "Sniper",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: ["Accuracy"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "-1 medium/-2 long range penalty, -2 with ally fighting target, sneak attack at medium range",
    stackable: false
  }),

  Tracker: Trait.make({
    name: "Tracker",
    category: "Skill",
    requirements: TraitRequirement.make({
      requiredSkills: ["Survival"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Track creatures via trails, DC 15 base with modifiers, ½ speed travel",
    stackable: false
  }),

  Ghost: Trait.make({
    name: "Ghost",
    category: "Skill",
    requirements: TraitRequirement.make({
      requiredSkills: ["Stealth"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Automatic concealment if hiding in dim light",
    stackable: false
  }),

  "Favorite Weapon": Trait.make({
    name: "Favorite Weapon",
    category: "Combat",
    requirements: TraitRequirement.make({
      requiredSkills: ["Melee Combat", "Accuracy"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "+1 damage to specific weapon (stackable, doesn't apply to specialization)",
    stackable: true
  }),

  // SOCIAL TRAITS
  Leader: Trait.make({
    name: "Leader",
    category: "Social",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "+1 loyalty to all followers",
    stackable: false
  }),

  Negotiator: Trait.make({
    name: "Negotiator",
    category: "Social",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "+2 reaction bonus for peaceful dealings",
    stackable: false
  }),

  Intimidator: Trait.make({
    name: "Intimidator",
    category: "Social",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "+2 reaction bonus for threats, max 3 HD targets or group threat",
    stackable: false
  }),

  Performer: Trait.make({
    name: "Performer",
    category: "Social",
    requirements: TraitRequirement.make({
      requiredSkills: ["Performance"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Deception bonus +2",
    stackable: false
  }),

  Hypnotist: Trait.make({
    name: "Hypnotist",
    category: "Social",
    requirements: TraitRequirement.make({
      requiredSkills: ["Performance"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "DC 15 performance, then DC 15 + Cha mod suppression save, mesmerization while performing",
    stackable: false
  }),

  // LANGUAGE/KNOWLEDGE TRAITS
  Multilingual: Trait.make({
    name: "Multilingual",
    category: "Skill",
    requirements: TraitRequirement.make({
      requiredSkills: ["Knowledge"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "3 language minimum, 1d4 round translation per page, DC by language",
    stackable: false
  }),

  Polyglot: Trait.make({
    name: "Polyglot",
    category: "Skill",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Language learning ability",
    stackable: false
  }),

  Linguist: Trait.make({
    name: "Linguist",
    category: "Skill",
    requirements: TraitRequirement.make({
      requiredSkills: ["Knowledge"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "3 languages from different groups, rapid translation ability",
    stackable: false
  }),

  // CRAFT/TECHNICAL TRAITS
  Alchemist: Trait.make({
    name: "Alchemist",
    category: "Craft",
    requirements: TraitRequirement.make({
      requiredSkills: ["Alchemy"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Advanced alchemy crafting",
    stackable: false
  }),

  Poisoner: Trait.make({
    name: "Poisoner",
    category: "Craft",
    requirements: TraitRequirement.make({
      requiredSkills: ["Alchemy"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Instant poison identification DC 15, no self-poisoning risk, reliable application",
    stackable: false
  }),

  Surgeon: Trait.make({
    name: "Surgeon",
    category: "Craft",
    requirements: TraitRequirement.make({
      requiredSkills: ["Medicine"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "DC 15 operation for permanent trauma removal, DC 15 infection removal",
    stackable: false
  }),

  "Herb Master": Trait.make({
    name: "Herb Master",
    category: "Craft",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Healing knowledge and herb crafting",
    stackable: false
  }),

  // MYSTICAL TRAITS
  Infernalist: Trait.make({
    name: "Infernalist",
    category: "Mystical",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: ["Summoning"]
    }),
    description: "Summons +1 HP per hit die, +2 occultism submission bonus",
    stackable: false
  }),

  Necromancer: Trait.make({
    name: "Necromancer",
    category: "Mystical",
    requirements: TraitRequirement.make({
      requiredSkills: ["Medicine"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: ["Reanimation"]
    }),
    description: "Reanimated undead +1 HP per die, double maximum controlled corpses",
    stackable: false
  }),

  Pyromaniac: Trait.make({
    name: "Pyromaniac",
    category: "Mystical",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: ["Fire"]
    }),
    description: "Fire spells +1 damage per die, free action flame creation at will",
    stackable: false
  }),

  "Nightmare Guide": Trait.make({
    name: "Nightmare Guide",
    category: "Mystical",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: ["Mind Obfuscation"]
    }),
    description: "Imagery deals 1d8 damage, extra saves",
    stackable: false
  }),

  Poltergeist: Trait.make({
    name: "Poltergeist",
    category: "Mystical",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: ["Telekinesis"]
    }),
    description: "Fine manipulation through telekinesis using Occultism bonus",
    stackable: false
  }),

  Initiated: Trait.make({
    name: "Initiated",
    category: "Mystical",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: "Chaotic",
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "1 CP, can learn 1st level mystery like level 1 mystic (stackable, no extra CP)",
    stackable: true
  }),

  Transmogrifist: Trait.make({
    name: "Transmogrifist",
    category: "Mystical",
    requirements: TraitRequirement.make({
      requiredSkills: [],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: ["Transformation"]
    }),
    description: "Doubled duration for transformation effects, +2 dispel DC",
    stackable: false
  }),

  Visionary: Trait.make({
    name: "Visionary",
    category: "Mystical",
    requirements: TraitRequirement.make({
      requiredSkills: ["Awareness"],
      requiredClass: null,
      requiredAlignment: null,
      prerequisiteTraits: [],
      requiredMysteries: ["Sensory"]
    }),
    description: "Doubled area of effect, +2 bonus to Awareness concentration checks",
    stackable: false
  }),

  "Witch Hunter": Trait.make({
    name: "Witch Hunter",
    category: "Mystical",
    requirements: TraitRequirement.make({
      requiredSkills: ["Awareness"],
      requiredClass: null,
      requiredAlignment: "Lawful",
      prerequisiteTraits: [],
      requiredMysteries: []
    }),
    description: "Intuitive supernatural detection, ±1 minute study, DC 15 check, detects Chaos",
    stackable: false
  })
}
