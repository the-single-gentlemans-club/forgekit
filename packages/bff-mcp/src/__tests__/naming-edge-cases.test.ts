/**
 * Locked-behavior tests for `pluralize` and `kebabCase` edge cases that the
 * audit (M-013, M-020) flagged as known limitations or corner cases.
 *
 * These tests intentionally lock the *current* output, including cases where
 * the current output is linguistically wrong. A future "fix" should be done
 * explicitly — pin a new contract, update these tests in the same PR, and
 * call it out in release notes. Silent regressions get caught here.
 *
 * Users who need correct output today have the escape hatch:
 *   planBffRoutes(model, { pluralize: { Quiz: 'Quizzes', Crisis: 'Crises' } })
 */

import { describe, expect, it } from 'vitest'

import { kebabCase, pluralize } from '../planner/naming.js'

describe('pluralize — locked behavior for known edge cases', () => {
  // ── -s, -x, -z, -ch, -sh -> -es (no doubling for single-syllable -z) ──

  it('Quiz → Quizes (KNOWN LIMITATION; correct English is Quizzes; users override)', () => {
    // The v0.1 implementation does not double the consonant before -es, so
    // "Quiz" yields "Quizes" rather than the linguistically correct
    // "Quizzes". Locked here so a future doubling-rule lands intentionally.
    expect(pluralize('Quiz')).toBe('Quizes')
  })

  it('Status → Statuses', () => {
    expect(pluralize('Status')).toBe('Statuses')
  })

  it('Bus → Buses', () => {
    expect(pluralize('Bus')).toBe('Buses')
  })

  // ── Irregulars not present in the v0.1 table ──

  it('Crisis → Crisises (KNOWN LIMITATION; correct English is Crises)', () => {
    // "Crisis" ends in -s, so the regular -es rule fires and we get
    // "Crisises". Real plural is "Crises" (-is -> -es). Locked; users
    // override via PlanOptions.pluralize.
    expect(pluralize('Crisis')).toBe('Crisises')
  })

  it('Phenomenon → Phenomenons (KNOWN LIMITATION; correct English is Phenomena)', () => {
    // The irregular table covers `criterion` but not the generic -on -> -a
    // rule; "Phenomenon" falls through to the regular -s case.
    expect(pluralize('Phenomenon')).toBe('Phenomenons')
  })

  // ── Case preservation across branches ──

  it('USER → USERS (ALL CAPS branch)', () => {
    expect(pluralize('USER')).toBe('USERS')
  })

  it('PERSON → PEOPLE (irregular + ALL CAPS via preserveCase)', () => {
    expect(pluralize('PERSON')).toBe('PEOPLE')
  })

  it('COMPANY → COMPANIES (-y -> -ies + ALL CAPS)', () => {
    expect(pluralize('COMPANY')).toBe('COMPANIES')
  })

  it('BOX → BOXES (-x -> -es + ALL CAPS)', () => {
    expect(pluralize('BOX')).toBe('BOXES')
  })

  it('lowercase company → companies (-y -> -ies branch preserves case)', () => {
    expect(pluralize('company')).toBe('companies')
  })
})

describe('kebabCase — locked behavior for known limitations', () => {
  // TODO(v0.2): the digit-boundary cases below are quirky outputs of the
  // current two-regex pipeline. Consider revisiting once Unicode-aware
  // segmentation lands.

  // NOTE: existing `naming.test.ts` already locks `kebabCase('OAuth2Token')`
  // to `'o-auth2-token'`. We add commentary here (no duplicate assertion) so
  // future readers see why that output is intentional v0.1 behavior.
  // TODO(v0.2): a linguistically-tuned version would produce `'oauth2-token'`
  // for OAuth2Token and `'ipv6-address'` for IPv6Address. The current
  // generic rule stays deterministic and url-safe, so we accept the quirk.

  it('IPv6Address → i-pv6-address (KNOWN LIMITATION: digit-boundary quirk)', () => {
    // Similar to OAuth2 — the version number runs into the trailing word.
    expect(kebabCase('IPv6Address')).toBe('i-pv6-address')
  })

  it('S3Bucket → s3-bucket', () => {
    // Single uppercase + digit + PascalCase tail — handled cleanly.
    expect(kebabCase('S3Bucket')).toBe('s3-bucket')
  })

  it('AB123CD → ab123-cd', () => {
    // Acronym followed by digits then another acronym — locks the current
    // split point.
    expect(kebabCase('AB123CD')).toBe('ab123-cd')
  })

  it('is idempotent for already-kebab strings (no double hyphens introduced)', () => {
    expect(kebabCase(kebabCase('ProjectMember'))).toBe('project-member')
    expect(kebabCase('user-profile')).toBe('user-profile')
  })

  it('preserves all-lowercase single words unchanged', () => {
    expect(kebabCase('user')).toBe('user')
    expect(kebabCase('order')).toBe('order')
  })
})
