import effectEslint from "@effect/eslint-plugin"
import { fixupPluginRules } from "@eslint/compat"
import tsParser from "@typescript-eslint/parser"
import tseslint from "typescript-eslint"
import functional from "eslint-plugin-functional"
import _import from "eslint-plugin-import"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import sortDestructureKeys from "eslint-plugin-sort-destructure-keys"

export default [
  {
    ignores: ["**/dist", "**/build", "**/*.md", "**/.reference"]
  },

  // TypeScript recommended (not strictTypeChecked to start lenient)
  ...tseslint.configs.recommended,

  // Effect dprint formatting rules
  ...effectEslint.configs.dprint,

  {
    plugins: {
      functional,
      import: fixupPluginRules(_import),
      "simple-import-sort": simpleImportSort,
      "sort-destructure-keys": sortDestructureKeys
    },

    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname
      }
    },

    settings: {
      "import/parsers": {
        "@typescript-eslint/parser": [".ts", ".tsx"]
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true
        }
      }
    },

    rules: {
      // Import organization - YOUR REQUIREMENT
      "import/first": "error",                      // Imports must be at top
      "import/no-duplicates": "error",              // No duplicate imports
      "import/newline-after-import": "error",       // Blank line after imports
      "simple-import-sort/imports": "error",        // Auto-sort imports

      // TypeScript best practices
      "@typescript-eslint/consistent-type-imports": "warn",  // Use `type` for type imports
      "@typescript-eslint/array-type": ["warn", {
        default: "generic",                         // Array<T> not T[]
        readonly: "generic"                         // ReadonlyArray<T>
      }],
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",                    // Allow _unused
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-floating-promises": "error",

      // Code quality
      "object-shorthand": "error",                  // Use { x } not { x: x }
      "sort-destructure-keys/sort-destructure-keys": "error",
      "no-console": "warn",                         // Warn on console.log

      // Functional programming - LENIENT preset + cherry-picked strict rules
      ...functional.configs.recommended.rules,
      "functional/no-throw-statements": "error",    // Use Effect.fail instead
      "functional/immutable-data": "warn",          // Catch accidental mutations

      // Turn off FP rules that conflict with Effect patterns
      "functional/no-expression-statements": "off", // Effect.gen uses statements
      "functional/functional-parameters": "off",    // Too restrictive
      "functional/no-classes": "off",               // Effect Schema.Class is fundamental
      "functional/no-class-inheritance": "off",     // Schema.Class extends is required
      "functional/no-conditional-statements": "off", // Effect code uses if/else
      "functional/no-return-void": "off",           // Effect.Effect<void> is common
      "functional/prefer-immutable-types": "off",   // Too strict for Effect
      "functional/no-let": "off",                   // Effect.gen uses let bindings
      "functional/no-loop-statements": "off",       // Sometimes needed for performance

      // Effect dprint formatting
      "@effect/dprint": ["error", {
        config: {
          indentWidth: 2,
          lineWidth: 120,
          semiColons: "asi",
          quoteStyle: "alwaysDouble",
          trailingCommas: "never"
        }
      }]
    }
  }
]
