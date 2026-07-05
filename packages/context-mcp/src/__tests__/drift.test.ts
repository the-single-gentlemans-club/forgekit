import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { afterEach,beforeEach, describe, expect, it } from 'vitest'

import { detectDrift } from '../lib/drift.js'
import type { FigmaVariable } from '../types.js'

// Minimal ComponentInfo shape needed by detectDrift
interface ComponentInfo {
  name: string
  filePath: string
  hasStory: boolean
  framework?: string
}

const MOCK_TOKENS: FigmaVariable[] = [
  {
    name: 'color/primary',
    value: '#FF0000',
    type: 'COLOR',
    collection: 'Global',
    isSemantic: false,
  },
  {
    name: 'color/background',
    value: '#FFFFFF',
    type: 'COLOR',
    collection: 'Global',
    isSemantic: false,
  },
  { name: 'spacing/md', value: '16px', type: 'STRING', collection: 'Spacing', isSemantic: false },
  { name: 'spacing/sm', value: '8px', type: 'STRING', collection: 'Spacing', isSemantic: false },
]

let tmpDir: string

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-test-'))
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('detectDrift', () => {
  it('detects hardcoded hex color that matches a Figma token', () => {
    const filePath = path.join(tmpDir, 'Button.tsx')
    fs.writeFileSync(
      filePath,
      `
import React from 'react'

export function Button() {
  return <button style={{ color: '#FF0000', padding: '16px' }}>Click</button>
}
`
    )

    const components: ComponentInfo[] = [{ name: 'Button', filePath, hasStory: false }]

    const result = detectDrift(components as Parameters<typeof detectDrift>[0], MOCK_TOKENS, {})

    expect(result.drifted).toHaveLength(1)
    expect(result.drifted[0].componentName).toBe('Button')
    const items = result.drifted[0].driftItems

    const colorDrift = items.find((i) => i.type === 'color')
    expect(colorDrift).toBeDefined()
    expect(colorDrift?.hardcodedValue.toLowerCase()).toBe('#ff0000')
    expect(colorDrift?.expectedToken).toBe('color/primary')
  })

  it('detects hardcoded px spacing that matches a Figma token', () => {
    const filePath = path.join(tmpDir, 'Card.tsx')
    fs.writeFileSync(
      filePath,
      `
export function Card() {
  return <div style={{ padding: '16px' }}>content</div>
}
`
    )

    const components: ComponentInfo[] = [{ name: 'Card', filePath, hasStory: false }]

    const result = detectDrift(components as Parameters<typeof detectDrift>[0], MOCK_TOKENS, {})

    const spacingDrift = result.drifted[0]?.driftItems.find((i) => i.type === 'spacing')
    expect(spacingDrift).toBeDefined()
    expect(spacingDrift?.hardcodedValue).toBe('16px')
    expect(spacingDrift?.expectedToken).toBe('spacing/md')
  })

  it('skips lines that use CSS variables (var(--)', () => {
    const filePath = path.join(tmpDir, 'Clean.tsx')
    fs.writeFileSync(
      filePath,
      `
export function Clean() {
  return <div style={{ color: 'var(--color-primary)', padding: 'var(--spacing-md)' }}>ok</div>
}
`
    )

    const components: ComponentInfo[] = [{ name: 'Clean', filePath, hasStory: false }]

    const result = detectDrift(components as Parameters<typeof detectDrift>[0], MOCK_TOKENS, {})

    expect(result.drifted).toHaveLength(0)
    expect(result.clean).toContain('Clean')
  })

  it('skips comment lines', () => {
    const filePath = path.join(tmpDir, 'Commented.tsx')
    fs.writeFileSync(
      filePath,
      `
// This used to be #FF0000 but was changed
/* padding: 16px */
export function Commented() {
  return <div>fine</div>
}
`
    )

    const components: ComponentInfo[] = [{ name: 'Commented', filePath, hasStory: false }]

    const result = detectDrift(components as Parameters<typeof detectDrift>[0], MOCK_TOKENS, {})

    expect(result.drifted).toHaveLength(0)
  })

  it('returns no drift when token list is empty', () => {
    const filePath = path.join(tmpDir, 'Any.tsx')
    fs.writeFileSync(
      filePath,
      `
export function Any() {
  return <div style={{ color: '#FF0000', padding: '16px' }}>x</div>
}
`
    )

    const components: ComponentInfo[] = [{ name: 'Any', filePath, hasStory: false }]

    const result = detectDrift(components as Parameters<typeof detectDrift>[0], [], {})

    expect(result.drifted).toHaveLength(0)
    expect(result.clean).toContain('Any')
  })

  it('returns clean summary string when no drift found', () => {
    const result = detectDrift([], [], {})
    expect(result.summary).toMatch(/0 component/)
  })
})
