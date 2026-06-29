import { describe, expect, it } from 'vitest'

import type { StorybookMCPConfig } from '../../types.js'
import type { Feature } from '../license.js'
import { checkFeatureAccess, requireFeature, validateLicense } from '../license.js'

function makeConfig(): StorybookMCPConfig {
  return {
    rootDir: '/tmp',
    libraries: [],
    framework: 'vanilla',
    storyFilePattern: '**/*.stories.{ts,tsx}',
    componentPatterns: [],
    excludePatterns: [],
  }
}

describe('license (open source — all features enabled)', () => {
  it('returns tier = pro', () => {
    const status = validateLicense(makeConfig())
    expect(status.tier).toBe('pro')
  })

  it('returns unlimited maxSyncLimit', () => {
    const status = validateLicense(makeConfig())
    expect(status.maxSyncLimit).toBe(Infinity)
  })

  it('allows all features', () => {
    const status = validateLicense(makeConfig())
    const features: Feature[] = [
      'basic_stories',
      'advanced_templates',
      'test_generation',
      'docs_generation',
      'unlimited_sync',
      'code_connect',
    ]
    for (const feature of features) {
      expect(checkFeatureAccess(feature, status)).toBe(true)
    }
  })

  it('requireFeature never throws', () => {
    const status = validateLicense(makeConfig())
    const features: Feature[] = [
      'basic_stories',
      'advanced_templates',
      'test_generation',
      'docs_generation',
      'unlimited_sync',
      'code_connect',
    ]
    for (const feature of features) {
      expect(() => requireFeature(feature, status)).not.toThrow()
    }
  })
})
