/**
 * Naming helpers — pluralization + kebab-case for route paths and handlers.
 *
 * v0.1 implements English-only pluralization with a small irregular table.
 * Users can override per-entity via the planner's `pluralize` option.
 */

/**
 * Common irregular English plurals. Keep this list small and conservative —
 * users override per-entity via `PlanOptions.pluralize` when they need more.
 */
const IRREGULAR_PLURALS: Record<string, string> = {
  person: 'people',
  man: 'men',
  woman: 'women',
  child: 'children',
  mouse: 'mice',
  foot: 'feet',
  tooth: 'teeth',
  goose: 'geese',
  ox: 'oxen',
  datum: 'data',
  criterion: 'criteria',
  analysis: 'analyses',
  thesis: 'theses',
  index: 'indexes',
  matrix: 'matrices',
}

/** Nouns whose plural form is identical to the singular. */
const INVARIANT_PLURALS = new Set(['sheep', 'fish', 'deer', 'series', 'species', 'aircraft'])

/**
 * Pluralize an English noun. Preserves the case of the input where possible
 * (`User` → `Users`, `user` → `users`, `USER` → `USERS`).
 */
export function pluralize(word: string): string {
  if (!word) return word

  const lower = word.toLowerCase()
  if (INVARIANT_PLURALS.has(lower)) return word

  const irregular = IRREGULAR_PLURALS[lower]
  if (irregular) return preserveCase(word, irregular)

  // -y after a consonant: Company → Companies
  if (/[bcdfghjklmnpqrstvwxz]y$/i.test(word)) {
    return word.slice(0, -1) + (isLowerSuffix(word) ? 'ies' : 'IES')
  }
  // -s, -x, -z, -ch, -sh, -ss: Box → Boxes, Address → Addresses
  if (/(s|x|z|ch|sh)$/i.test(word)) {
    return word + (isLowerSuffix(word) ? 'es' : 'ES')
  }
  // -fe → -ves: Knife → Knives
  if (/fe$/i.test(word)) {
    return word.slice(0, -2) + (isLowerSuffix(word) ? 'ves' : 'VES')
  }
  // -f → -ves (when not preceded by another f): Loaf → Loaves
  if (/[^f]f$/i.test(word)) {
    return word.slice(0, -1) + (isLowerSuffix(word) ? 'ves' : 'VES')
  }
  return word + (isLowerSuffix(word) ? 's' : 'S')
}

function isLowerSuffix(word: string): boolean {
  const last = word.slice(-1)
  return last === last.toLowerCase()
}

function preserveCase(original: string, transformed: string): string {
  // ALL CAPS → ALL CAPS
  if (original.length > 0 && original === original.toUpperCase()) {
    return transformed.toUpperCase()
  }
  // Capitalized → capitalized
  const first = original.charAt(0)
  if (first && first === first.toUpperCase()) {
    return transformed.charAt(0).toUpperCase() + transformed.slice(1)
  }
  return transformed
}

/**
 * Convert a PascalCase or camelCase identifier to kebab-case.
 *
 *   User           → user
 *   ProjectMember  → project-member
 *   APIKey         → api-key
 *   OAuth2Token    → o-auth2-token
 *   userProfile    → user-profile
 */
export function kebabCase(input: string): string {
  return input
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .toLowerCase()
}
