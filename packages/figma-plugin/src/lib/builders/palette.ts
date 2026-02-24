/**
 * builders/palette.ts
 *
 * Builds the 🎨 Color Palette page: swatch grids for all token groups.
 * Generic — no project-specific references.
 */
import type { PluginTokens } from '../types.js'
import {
  getOrResetPage,
  hexToRgba,
  loadInterFonts,
  makeText,
  solidPaint,
  solidPaintFromRgba,
} from '../utils.js'

const SWATCH = 48
const GAP = 6
const LABEL_H = 20
const COL_STEP = SWATCH + 20

export async function buildPalettePage(tokens: PluginTokens): Promise<void> {
  const page = getOrResetPage('🎨 Color Palette')
  await figma.setCurrentPageAsync(page)
  await loadInterFonts()

  const stepKeys = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']
  let xOffset = 0

  // -------------------------------------------------------------------------
  // Primitive palettes
  // -------------------------------------------------------------------------
  for (const [paletteName, steps] of Object.entries(tokens.palettes)) {
    const titleNode = makeText(
      paletteName.charAt(0).toUpperCase() + paletteName.slice(1),
      11,
      hexToRgba('#78716c'),
      'Semi Bold',
    )
    titleNode.x = xOffset
    titleNode.y = -28
    page.appendChild(titleNode)

    let yOffset = 0
    for (const key of stepKeys) {
      const hex = (steps as Record<string, string>)[key]
      if (!hex) continue

      const swatch = figma.createRectangle()
      swatch.name = `${paletteName}/${key}`
      swatch.resize(SWATCH, SWATCH)
      swatch.x = xOffset
      swatch.y = yOffset
      swatch.fills = [solidPaint(hex)]
      swatch.cornerRadius = 6
      page.appendChild(swatch)

      const label = makeText(key, 9, hexToRgba('#a8a29e'))
      label.x = xOffset + 2
      label.y = yOffset + SWATCH + 2
      page.appendChild(label)

      swatch.setPluginData('hex', hex)
      yOffset += SWATCH + LABEL_H + GAP
    }

    xOffset += COL_STEP
  }

  xOffset += 12

  // -------------------------------------------------------------------------
  // Absolute colors (white, black)
  // -------------------------------------------------------------------------
  const absTitle = makeText('Absolute', 11, hexToRgba('#78716c'), 'Semi Bold')
  absTitle.x = xOffset
  absTitle.y = -28
  page.appendChild(absTitle)

  let absY = 0
  for (const [name, hex] of Object.entries(tokens.absolutes)) {
    if (hex === 'transparent') continue
    const swatch = figma.createRectangle()
    swatch.name = name
    swatch.resize(SWATCH, SWATCH)
    swatch.x = xOffset
    swatch.y = absY
    swatch.fills = [solidPaint(hex)]
    swatch.cornerRadius = 6
    swatch.strokeWeight = 1
    swatch.strokes = [solidPaintFromRgba({ r: 0.84, g: 0.83, b: 0.82, a: 1 })]
    page.appendChild(swatch)

    const label = makeText(name, 9, hexToRgba('#a8a29e'))
    label.x = xOffset + 2
    label.y = absY + SWATCH + 2
    page.appendChild(label)

    absY += SWATCH + LABEL_H + GAP
  }

  xOffset += COL_STEP + 24

  // -------------------------------------------------------------------------
  // Semantic colors — labeled rows grouped by token path segment
  // -------------------------------------------------------------------------
  const semTitle = makeText('Semantic', 11, hexToRgba('#78716c'), 'Semi Bold')
  semTitle.x = xOffset
  semTitle.y = -28
  page.appendChild(semTitle)

  const groups: Record<string, Record<string, string>> = {}
  for (const [path, hex] of Object.entries(tokens.semantic)) {
    const [group, ...rest] = path.split('/')
    if (!groups[group]) groups[group] = {}
    groups[group][rest.join('/')] = hex
  }

  let semY = 0
  for (const [groupName, values] of Object.entries(groups)) {
    const groupLabel = makeText(groupName, 10, hexToRgba('#44403c'), 'Semi Bold')
    groupLabel.x = xOffset
    groupLabel.y = semY
    page.appendChild(groupLabel)
    semY += 16

    for (const [name, hex] of Object.entries(values)) {
      const dot = figma.createEllipse()
      dot.resize(16, 16)
      dot.fills = [solidPaint(hex)]
      dot.strokeWeight = 1
      dot.strokes = [solidPaintFromRgba({ r: 0.84, g: 0.83, b: 0.82, a: 0.5 })]
      dot.x = xOffset
      dot.y = semY + 2
      page.appendChild(dot)

      const nameNode = makeText(name, 11, hexToRgba('#1c1917'))
      nameNode.x = xOffset + 24
      nameNode.y = semY
      page.appendChild(nameNode)

      const hexNode = makeText(hex, 10, hexToRgba('#a8a29e'))
      hexNode.x = xOffset + 170
      hexNode.y = semY + 1
      page.appendChild(hexNode)

      semY += 36
    }
    semY += 12
  }
}
