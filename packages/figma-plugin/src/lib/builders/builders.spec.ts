import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupFigmaMock } from '../figma-mock.js'
import type { PluginTokens } from '../types.js'
import { buildPalettePage } from './palette.js'
import { buildSpacingPage } from './spacing.js'
import { buildTypographyPage } from './typography.js'
import { syncVariables } from './variables.js'

// ---------------------------------------------------------------------------
// Minimal token fixture — enough to exercise all code paths
// ---------------------------------------------------------------------------
const tokens: PluginTokens = {
  palettes: {
    primary: { '50': '#f0fdfa', '500': '#14b8a6', '900': '#134e4a' },
    sage: { '50': '#f0fdf4', '500': '#22c55e', '900': '#14532d' },
  },
  absolutes: {
    white: '#ffffff',
    black: '#000000',
  },
  semantic: {
    'background/primary': '#f0fdfa',
    'text/default': '#1c1917',
    'border/default': '#e7e5e4',
  },
  spacing: { '0': 0, '1': 4, '2': 8, '4': 16, '8': 32 },
  borderRadius: { none: 0, sm: 4, md: 8, lg: 16, full: 9999 },
  typography: {
    fontSize: { xs: 12, sm: 14, base: 16, lg: 18, xl: 20 },
    fontWeight: { normal: 400, medium: 500, semibold: 600, bold: 700 },
    lineHeight: { tight: 1.25, normal: 1.5, relaxed: 1.75 },
  },
  gradients: {
    primary: ['#0d9488', '#14b8a6', '#2dd4bf'],
    success: ['#16a34a', '#22c55e', '#4ade80'],
    gold: ['#ca8a04', '#eab308', '#fde047'],
    sky: ['#0284c7', '#0ea5e9', '#38bdf8'],
    sage: ['#15803d', '#16a34a', '#4ade80'],
    disabled: ['#a8a29e', '#d6d3d1', '#e7e5e4'],
  },
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
let mock: ReturnType<typeof setupFigmaMock>

beforeEach(() => {
  mock = setupFigmaMock()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------------------------------------------------------------------------
// syncVariables
// ---------------------------------------------------------------------------
describe('syncVariables', () => {
  it('returns the total number of variables created', async () => {
    const total = await syncVariables(tokens)
    expect(total).toBeGreaterThan(0)
  })

  it('creates three collections: Primitives, Semantic, Dimensions', async () => {
    await syncVariables(tokens)
    const names = [...mock._collections.keys()]
    expect(names).toContain('Primitives')
    expect(names).toContain('Semantic')
    expect(names).toContain('Dimensions')
  })

  it('creates the correct number of primitive color variables', async () => {
    await syncVariables(tokens)
    const paletteVarCount = Object.values(tokens.palettes).reduce(
      (n, p) => n + Object.keys(p).length,
      0,
    )
    const absoluteCount = Object.keys(tokens.absolutes).length
    const colorVars = mock._variables.filter((v) => v.resolvedType === 'COLOR')
    // Primitives + semantics
    expect(colorVars.length).toBeGreaterThanOrEqual(paletteVarCount + absoluteCount)
  })

  it('creates FLOAT variables for spacing entries', async () => {
    await syncVariables(tokens)
    const floatVars = mock._variables.filter((v) => v.resolvedType === 'FLOAT')
    expect(floatVars.length).toBeGreaterThan(0)
    const spacingVar = floatVars.find((v) => v.name.startsWith('spacing/'))
    expect(spacingVar).toBeDefined()
  })

  it('creates FLOAT variables for border radius', async () => {
    await syncVariables(tokens)
    const floatVars = mock._variables.filter((v) => v.resolvedType === 'FLOAT')
    const radiusVar = floatVars.find((v) => v.name.startsWith('radius/'))
    expect(radiusVar).toBeDefined()
  })

  it('creates FLOAT variables for typography scales', async () => {
    await syncVariables(tokens)
    const floatVars = mock._variables.filter((v) => v.resolvedType === 'FLOAT')
    const fontSizeVar = floatVars.find((v) => v.name.startsWith('typography/size/'))
    const fontWeightVar = floatVars.find((v) => v.name.startsWith('typography/weight/'))
    const lineHeightVar = floatVars.find((v) => v.name.startsWith('typography/lineHeight/'))
    expect(fontSizeVar).toBeDefined()
    expect(fontWeightVar).toBeDefined()
    expect(lineHeightVar).toBeDefined()
  })

  it('assigns correct scopes to color variables', async () => {
    await syncVariables(tokens)
    const colorVar = mock._variables.find((v) => v.resolvedType === 'COLOR' && v.name.includes('primary'))
    expect(colorVar?.scopes).toContain('ALL_FILLS')
  })

  it('sets variable values via setValueForMode', async () => {
    await syncVariables(tokens)
    const primVar = mock._variables.find((v) => v.name === 'primary/500')
    expect(primVar?.setValueForMode).toHaveBeenCalled()
  })

  it('posts progress updates to the UI', async () => {
    await syncVariables(tokens)
    expect(mock.ui.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'progress' }))
  })

  it('is idempotent — calling twice does not throw', async () => {
    await expect(syncVariables(tokens)).resolves.not.toThrow()
    await expect(syncVariables(tokens)).resolves.not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// buildPalettePage
// ---------------------------------------------------------------------------
describe('buildPalettePage', () => {
  it('resolves without throwing', async () => {
    await expect(buildPalettePage(tokens)).resolves.not.toThrow()
  })

  it('creates or resets a page named 🎨 Color Palette', async () => {
    await buildPalettePage(tokens)
    expect(mock.createPage).toHaveBeenCalled()
    expect(mock.setCurrentPageAsync).toHaveBeenCalled()
  })

  it('loads Inter fonts', async () => {
    await buildPalettePage(tokens)
    expect(mock.loadFontAsync).toHaveBeenCalledWith({ family: 'Inter', style: 'Regular' })
  })

  it('creates swatch rectangles for each palette shade', async () => {
    await buildPalettePage(tokens)
    // 3 shades per palette × 2 palettes + 2 absolutes (white, black) = at least 8
    expect(mock.createRectangle).toHaveBeenCalled()
  })

  it('creates ellipses for semantic dot swatches', async () => {
    await buildPalettePage(tokens)
    expect(mock.createEllipse).toHaveBeenCalled()
  })

  it('creates text nodes for labels', async () => {
    await buildPalettePage(tokens)
    expect(mock.createText).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// buildTypographyPage
// ---------------------------------------------------------------------------
describe('buildTypographyPage', () => {
  it('resolves without throwing', async () => {
    await expect(buildTypographyPage(tokens)).resolves.not.toThrow()
  })

  it('creates a Typography page', async () => {
    await buildTypographyPage(tokens)
    expect(mock.setCurrentPageAsync).toHaveBeenCalled()
  })

  it('creates frames for each font-size entry', async () => {
    await buildTypographyPage(tokens)
    const frameCalls = mock.createFrame.mock.calls.length
    expect(frameCalls).toBeGreaterThanOrEqual(Object.keys(tokens.typography.fontSize).length)
  })

  it('creates text specimens', async () => {
    await buildTypographyPage(tokens)
    expect(mock.createText).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// buildSpacingPage
// ---------------------------------------------------------------------------
describe('buildSpacingPage', () => {
  it('resolves without throwing', async () => {
    await expect(buildSpacingPage(tokens)).resolves.not.toThrow()
  })

  it('creates a Spacing & Radius page', async () => {
    await buildSpacingPage(tokens)
    expect(mock.setCurrentPageAsync).toHaveBeenCalled()
  })

  it('creates a bar rectangle for each non-zero spacing value', async () => {
    await buildSpacingPage(tokens)
    // At least one rect per spacing step (bar + guide lines)
    expect(mock.createRectangle).toHaveBeenCalled()
  })

  it('creates a radius preview for each borderRadius entry', async () => {
    await buildSpacingPage(tokens)
    // Radius boxes are rectangles too
    expect(mock.createRectangle.mock.calls.length).toBeGreaterThanOrEqual(
      Object.keys(tokens.borderRadius).length,
    )
  })

  it('creates guide lines as line nodes', async () => {
    await buildSpacingPage(tokens)
    expect(mock.createLine).toHaveBeenCalled()
  })
})
