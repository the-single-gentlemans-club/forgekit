/**
 * utils.ts — Generic helpers for the Figma plugin.
 * No project-specific references. Safe to use across any Figma plugin project.
 */

/**
 * Convert a #rrggbb hex string to Figma RGB (no alpha).
 * Use for SolidPaint.color — Figma rejects an 'a' key there.
 */
export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
  }
}

/**
 * Convert a #rrggbb or #rrggbbaa hex to Figma RGBA.
 * Use for gradient stops and effect colors — those accept alpha in the color object.
 */
export function hexToRgba(hex: string): RGBA {
  if (hex === 'transparent') return { r: 0, g: 0, b: 0, a: 0 }
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) / 255,
    g: parseInt(h.slice(2, 4), 16) / 255,
    b: parseInt(h.slice(4, 6), 16) / 255,
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  }
}

/**
 * Build a SolidPaint from a hex color string.
 * Correctly separates color (RGB) and opacity as Figma requires.
 */
export function solidPaint(hex: string, opacity = 1): SolidPaint {
  if (hex === 'transparent') return { type: 'SOLID', color: { r: 0, g: 0, b: 0 }, opacity: 0 }
  return { type: 'SOLID', color: hexToRgb(hex), opacity }
}

/**
 * Build a SolidPaint from an RGBA object (e.g. from an inline literal).
 * Splits the alpha out into opacity.
 */
export function solidPaintFromRgba(rgba: RGBA): SolidPaint {
  return { type: 'SOLID', color: { r: rgba.r, g: rgba.g, b: rgba.b }, opacity: rgba.a }
}

/** Post a log line to the UI panel. */
export function uiLog(text: string, level: 'info' | 'success' | 'warn' | 'error' = 'info') {
  figma.ui.postMessage({ type: 'log', text, level })
}

/** Post a progress percentage (0–100) or null to hide the bar. */
export function uiProgress(pct: number | null) {
  figma.ui.postMessage({ type: 'progress', pct })
}

/**
 * Find an existing VariableCollection by name, or create one.
 * Idempotent — safe to call on every sync.
 */
export function getOrCreateCollection(name: string): VariableCollection {
  return (
    figma.variables.getLocalVariableCollections().find((c) => c.name === name) ??
    figma.variables.createVariableCollection(name)
  )
}

/**
 * Find an existing Variable by name within a collection, or create one.
 * Idempotent — updates the existing value rather than duplicating.
 */
export function getOrCreateVariable(
  name: string,
  collection: VariableCollection,
  resolvedType: VariableResolvedDataType,
): Variable {
  return (
    figma.variables
      .getLocalVariables(resolvedType)
      .find((v) => v.variableCollectionId === collection.id && v.name === name) ??
    figma.variables.createVariable(name, collection, resolvedType)
  )
}

/**
 * Get a page by name, clearing its children if it already exists.
 * Creates a new page if not found.
 */
export function getOrResetPage(name: string): PageNode {
  const existing = figma.root.children.find(
    (p): p is PageNode => p.type === 'PAGE' && p.name === name,
  )
  if (existing) {
    existing.children.forEach((c) => c.remove())
    return existing
  }
  const page = figma.createPage()
  page.name = name
  return page
}

/** Load a set of Inter font variants needed by the page builders. */
export async function loadInterFonts() {
  await Promise.all([
    figma.loadFontAsync({ family: 'Inter', style: 'Regular' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Medium' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' }),
    figma.loadFontAsync({ family: 'Inter', style: 'Bold' }),
  ])
}

/** Create a text node with common defaults. Fonts must be loaded first. */
export function makeText(
  chars: string,
  fontSize: number,
  color: RGBA,
  weight: 'Regular' | 'Medium' | 'Semi Bold' | 'Bold' = 'Regular',
): TextNode {
  const node = figma.createText()
  node.fontName = { family: 'Inter', style: weight }
  node.fontSize = fontSize
  node.characters = chars
  node.fills = [solidPaintFromRgba(color)]
  return node
}

/** Create an auto-layout frame with common defaults. */
export function makeFrame(opts: {
  name: string
  width: number
  height: number
  direction?: 'HORIZONTAL' | 'VERTICAL' | 'NONE'
  gap?: number
  padding?: number | [number, number]
  fills?: Paint[]
  radius?: number
  strokeColor?: RGBA
}): FrameNode {
  const f = figma.createFrame()
  f.name = opts.name
  f.resize(opts.width, opts.height)
  f.fills = opts.fills ?? []
  if (opts.radius) f.cornerRadius = opts.radius
  if (opts.strokeColor) {
    f.strokeWeight = 1
    f.strokes = [solidPaintFromRgba(opts.strokeColor)]
  }
  if (opts.direction && opts.direction !== 'NONE') {
    f.layoutMode = opts.direction
    f.primaryAxisSizingMode = 'AUTO'
    f.counterAxisSizingMode = 'AUTO'
    if (opts.gap !== undefined) f.itemSpacing = opts.gap
    if (opts.padding !== undefined) {
      const [pV, pH] =
        typeof opts.padding === 'number' ? [opts.padding, opts.padding] : opts.padding
      f.paddingTop = f.paddingBottom = pV
      f.paddingLeft = f.paddingRight = pH
    }
  }
  return f
}

/** Build a linear gradient paint from an array of hex colors (left→right). */
export function linearGradient(hexColors: string[]): GradientPaint {
  const stops = hexColors.map((hex, i) => ({
    position: i / (hexColors.length - 1),
    color: hexToRgba(hex),
  }))
  return {
    type: 'GRADIENT_LINEAR',
    gradientTransform: [
      [1, 0, 0],
      [0, 1, 0],
    ],
    gradientStops: stops,
  }
}
