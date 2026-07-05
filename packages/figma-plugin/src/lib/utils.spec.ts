import { describe, expect, it } from 'vitest'

import { hexToRgb, hexToRgba, linearGradient, solidPaint, solidPaintFromRgba } from './utils.js'

describe('hexToRgb', () => {
  it('converts a 6-digit hex to Figma RGB', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 })
    expect(hexToRgb('#ffffff')).toEqual({ r: 1, g: 1, b: 1 })
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('strips the # prefix', () => {
    expect(hexToRgb('ff0000')).toEqual({ r: 1, g: 0, b: 0 })
  })

  it('converts mid-range values correctly', () => {
    const result = hexToRgb('#7f7f7f')
    expect(result.r).toBeCloseTo(127 / 255, 5)
    expect(result.g).toBeCloseTo(127 / 255, 5)
    expect(result.b).toBeCloseTo(127 / 255, 5)
  })
})

describe('hexToRgba', () => {
  it('returns transparent for "transparent"', () => {
    expect(hexToRgba('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 })
  })

  it('converts 6-digit hex with alpha=1', () => {
    expect(hexToRgba('#ff0000')).toEqual({ r: 1, g: 0, b: 0, a: 1 })
  })

  it('converts 8-digit hex with alpha channel', () => {
    const result = hexToRgba('#ff000080')
    expect(result.r).toBe(1)
    expect(result.g).toBe(0)
    expect(result.b).toBe(0)
    expect(result.a).toBeCloseTo(128 / 255, 5)
  })
})

describe('solidPaint', () => {
  it('returns transparent paint for "transparent"', () => {
    expect(solidPaint('transparent')).toEqual({
      type: 'SOLID',
      color: { r: 0, g: 0, b: 0 },
      opacity: 0,
    })
  })

  it('builds a solid paint from hex with default opacity', () => {
    const paint = solidPaint('#ff0000')
    expect(paint.type).toBe('SOLID')
    expect(paint.color).toEqual({ r: 1, g: 0, b: 0 })
    expect(paint.opacity).toBe(1)
  })

  it('applies custom opacity', () => {
    const paint = solidPaint('#ffffff', 0.5)
    expect(paint.opacity).toBe(0.5)
  })
})

describe('solidPaintFromRgba', () => {
  it('splits RGBA into color + opacity', () => {
    const paint = solidPaintFromRgba({ r: 1, g: 0.5, b: 0, a: 0.75 })
    expect(paint).toEqual({
      type: 'SOLID',
      color: { r: 1, g: 0.5, b: 0 },
      opacity: 0.75,
    })
  })
})

describe('linearGradient', () => {
  it('creates a linear gradient with correct stop positions', () => {
    const gradient = linearGradient(['#ff0000', '#0000ff'])
    expect(gradient.type).toBe('GRADIENT_LINEAR')
    expect(gradient.gradientStops).toHaveLength(2)
    expect(gradient.gradientStops[0].position).toBe(0)
    expect(gradient.gradientStops[1].position).toBe(1)
  })

  it('distributes stops evenly for 3 colors', () => {
    const gradient = linearGradient(['#ff0000', '#00ff00', '#0000ff'])
    expect(gradient.gradientStops[1].position).toBe(0.5)
  })

  it('sets correct colors on stops', () => {
    const gradient = linearGradient(['#ff0000', '#0000ff'])
    expect(gradient.gradientStops[0].color).toEqual({ r: 1, g: 0, b: 0, a: 1 })
    expect(gradient.gradientStops[1].color).toEqual({ r: 0, g: 0, b: 1, a: 1 })
  })
})
