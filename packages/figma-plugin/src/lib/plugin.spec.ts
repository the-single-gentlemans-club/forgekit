import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setupFigmaMock } from './figma-mock.js'
import { setupPlugin } from './plugin.js'
import type { PluginTokens } from './types.js'

const tokens: PluginTokens = {
  palettes: { primary: { '500': '#14b8a6' } },
  absolutes: { white: '#ffffff' },
  semantic: { 'bg/default': '#ffffff' },
  spacing: { '1': 4, '2': 8 },
  borderRadius: { sm: 4 },
  typography: {
    fontSize: { base: 16 },
    fontWeight: { normal: 400 },
    lineHeight: { normal: 1.5 },
  },
  gradients: {
    primary: ['#0d9488', '#14b8a6'],
    success: ['#16a34a', '#22c55e'],
    gold: ['#ca8a04', '#eab308'],
    sky: ['#0284c7', '#0ea5e9'],
    sage: ['#15803d', '#16a34a'],
    disabled: ['#a8a29e', '#d6d3d1'],
  },
}

let mock: ReturnType<typeof setupFigmaMock>

beforeEach(() => {
  mock = setupFigmaMock()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Convenience: invoke the registered onmessage handler */
async function send(type: string) {
  const handler = mock.ui.onmessage
  if (!handler) throw new Error('onmessage not set — call setupPlugin first')
  await handler({ type })
}

describe('setupPlugin', () => {
  it('registers a ui.onmessage handler', () => {
    setupPlugin(tokens)
    expect(mock.ui.onmessage).toBeDefined()
  })

  it('handles syncTokens command and posts done', async () => {
    setupPlugin(tokens)
    await send('syncTokens')
    expect(mock.ui.postMessage).toHaveBeenCalledWith({ type: 'done' })
  })

  it('posts stats after syncTokens', async () => {
    setupPlugin(tokens)
    await send('syncTokens')
    expect(mock.ui.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'stats' }))
  })

  it('handles buildComponents command and posts done', async () => {
    setupPlugin(tokens)
    await send('buildComponents')
    expect(mock.ui.postMessage).toHaveBeenCalledWith({ type: 'done' })
  })

  it('calls custom buildComponentsPage if provided', async () => {
    const buildComponentsPage = vi.fn().mockResolvedValue(undefined)
    setupPlugin(tokens, { buildComponentsPage })
    await send('buildComponents')
    expect(buildComponentsPage).toHaveBeenCalledWith(tokens)
  })

  it('calls custom buildScreensPage if provided', async () => {
    const buildScreensPage = vi.fn().mockResolvedValue(undefined)
    setupPlugin(tokens, { buildScreensPage })
    await send('buildComponents')
    expect(buildScreensPage).toHaveBeenCalledWith(tokens)
  })

  it('handles fullSync: runs syncTokens then buildComponents', async () => {
    const buildComponentsPage = vi.fn().mockResolvedValue(undefined)
    setupPlugin(tokens, { buildComponentsPage })
    await send('fullSync')
    expect(mock.ui.postMessage).toHaveBeenCalledWith(expect.objectContaining({ type: 'stats' }))
    expect(mock.ui.postMessage).toHaveBeenCalledWith({ type: 'done' })
    expect(buildComponentsPage).toHaveBeenCalledWith(tokens)
  })

  it('posts error message when a builder throws', async () => {
    const buildComponentsPage = vi.fn().mockRejectedValue(new Error('builder failed'))
    setupPlugin(tokens, { buildComponentsPage })
    await send('buildComponents')
    expect(mock.ui.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'error', message: expect.stringContaining('builder failed') })
    )
  })

  it('does not post done on unknown command', async () => {
    setupPlugin(tokens)
    await send('unknown-cmd')
    const calls = (mock.ui.postMessage as ReturnType<typeof vi.fn>).mock.calls
    expect(calls.some((c) => c[0]?.type === 'done')).toBe(false)
  })
})
