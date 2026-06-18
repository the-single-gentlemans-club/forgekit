/**
 * Unit tests for the naming helpers: pluralize + kebabCase.
 *
 * Pluralization is English-only; the irregular table is small and conservative
 * by design — users override per-entity via the planner's `pluralize` option.
 */

import { describe, expect, it } from 'vitest'

import { kebabCase, pluralize } from '../planner/naming.js'

describe('pluralize', () => {
  it('handles the regular -s case', () => {
    expect(pluralize('User')).toBe('Users')
    expect(pluralize('Project')).toBe('Projects')
    expect(pluralize('Task')).toBe('Tasks')
  })

  it('handles the -y → -ies rule (consonant + y)', () => {
    expect(pluralize('Company')).toBe('Companies')
    expect(pluralize('Category')).toBe('Categories')
    expect(pluralize('Country')).toBe('Countries')
  })

  it('handles the -y → -ys rule (vowel + y)', () => {
    expect(pluralize('Boy')).toBe('Boys')
    expect(pluralize('Day')).toBe('Days')
    expect(pluralize('Key')).toBe('Keys')
  })

  it('handles the -s, -x, -z, -ch, -sh → -es rule', () => {
    expect(pluralize('Box')).toBe('Boxes')
    expect(pluralize('Address')).toBe('Addresses')
    expect(pluralize('Watch')).toBe('Watches')
    expect(pluralize('Brush')).toBe('Brushes')
    // Note: single-syllable -z words like "Quiz" → "Quizzes" require z-doubling
    // that v0.1 doesn't model. Users override via PlanOptions.pluralize.
  })

  it('handles the -fe → -ves and -f → -ves rules', () => {
    expect(pluralize('Knife')).toBe('Knives')
    expect(pluralize('Life')).toBe('Lives')
    expect(pluralize('Loaf')).toBe('Loaves')
    expect(pluralize('Leaf')).toBe('Leaves')
  })

  it('handles common irregular plurals', () => {
    expect(pluralize('Person')).toBe('People')
    expect(pluralize('Child')).toBe('Children')
    expect(pluralize('Mouse')).toBe('Mice')
    expect(pluralize('Goose')).toBe('Geese')
    expect(pluralize('Datum')).toBe('Data')
    expect(pluralize('Criterion')).toBe('Criteria')
  })

  it('handles invariant plurals (sheep, fish, deer, etc.)', () => {
    expect(pluralize('Sheep')).toBe('Sheep')
    expect(pluralize('Fish')).toBe('Fish')
    expect(pluralize('Deer')).toBe('Deer')
    expect(pluralize('Species')).toBe('Species')
  })

  it('preserves case across irregulars', () => {
    expect(pluralize('person')).toBe('people')
    expect(pluralize('Person')).toBe('People')
  })

  it('handles the empty string without throwing', () => {
    expect(pluralize('')).toBe('')
  })
})

describe('kebabCase', () => {
  it('converts single PascalCase words', () => {
    expect(kebabCase('User')).toBe('user')
    expect(kebabCase('Project')).toBe('project')
  })

  it('converts multi-word PascalCase', () => {
    expect(kebabCase('ProjectMember')).toBe('project-member')
    expect(kebabCase('UserProfile')).toBe('user-profile')
    expect(kebabCase('InvoiceLineItem')).toBe('invoice-line-item')
  })

  it('converts camelCase', () => {
    expect(kebabCase('userProfile')).toBe('user-profile')
    expect(kebabCase('orderTotal')).toBe('order-total')
  })

  it('handles consecutive capitals as acronyms', () => {
    expect(kebabCase('APIKey')).toBe('api-key')
    expect(kebabCase('HTTPResponse')).toBe('http-response')
    expect(kebabCase('URLPath')).toBe('url-path')
  })

  it('handles digits in identifiers', () => {
    expect(kebabCase('OAuth2Token')).toBe('o-auth2-token')
    expect(kebabCase('Tier1Customer')).toBe('tier1-customer')
  })

  it('is idempotent on already-kebab strings', () => {
    expect(kebabCase('user-profile')).toBe('user-profile')
    expect(kebabCase('api-key')).toBe('api-key')
  })
})
