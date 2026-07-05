/**
 * License Manager
 * All features are enabled — ForgeKit is fully open source.
 */

import type { StorybookMCPConfig } from '../types.js'

export type Feature =
  | 'basic_stories'
  | 'advanced_templates'
  | 'test_generation'
  | 'docs_generation'
  | 'unlimited_sync'
  | 'code_connect'

interface LicenseStatus {
  isValid: boolean
  tier: 'free' | 'pro'
  maxSyncLimit: number
}

/**
 * Validate license — always returns full access (open source).
 */
export function validateLicense(_config: StorybookMCPConfig): LicenseStatus {
  return {
    isValid: true,
    tier: 'pro',
    maxSyncLimit: Infinity,
  }
}

/**
 * Async license validation — always returns full access (open source).
 */
export async function validateLicenseAsync(_config: StorybookMCPConfig): Promise<LicenseStatus> {
  return {
    isValid: true,
    tier: 'pro',
    maxSyncLimit: Infinity,
  }
}

/**
 * Check if a feature is allowed — always returns true (open source).
 */
export function checkFeatureAccess(_feature: Feature, _status: LicenseStatus): boolean {
  return true
}

/**
 * Require feature access — never throws (open source).
 */
export function requireFeature(_feature: Feature, _status: LicenseStatus): void {
  // All features are available — no-op
}
