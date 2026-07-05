/**
 * builders/typography.ts
 *
 * Builds the ✍️ Typography page: font size specimens, weight scale, line height guide.
 * Generic — no project-specific references.
 */
import type { PluginTokens } from '../types.js'
import {
  getOrResetPage,
  hexToRgba,
  loadInterFonts,
  makeFrame,
  makeText,
  solidPaintFromRgba,
} from '../utils.js'

export async function buildTypographyPage(tokens: PluginTokens): Promise<void> {
  const page = getOrResetPage('✍️ Typography')
  await figma.setCurrentPageAsync(page)
  await loadInterFonts()

  const STONE_900 = hexToRgba('#1c1917')
  const STONE_400 = hexToRgba('#a8a29e')
  const STONE_600 = hexToRgba('#57534e')
  const TEAL_600 = hexToRgba('#0d9488')

  function sectionTitle(text: string, y: number): number {
    const node = makeText(text, 11, TEAL_600, 'Semi Bold')
    node.x = 0
    node.y = y
    page.appendChild(node)
    return y + 24
  }

  let y = 0
  const SAMPLE = 'The quick brown fox jumps over the lazy dog'

  // -------------------------------------------------------------------------
  // Font sizes
  // -------------------------------------------------------------------------
  y = sectionTitle('FONT SIZES', y)

  for (const [name, size] of Object.entries(tokens.typography.fontSize)) {
    const row = makeFrame({
      name: `fontSize/${name}`,
      width: 800,
      height: Math.max(size + 16, 40),
      direction: 'HORIZONTAL',
      gap: 24,
      fills: [],
    })
    row.counterAxisAlignItems = 'CENTER'
    row.x = 0
    row.y = y

    const labelFrame = makeFrame({ name: 'label', width: 120, height: 40, fills: [] })
    const nameNode = makeText(name, 12, STONE_600, 'Semi Bold')
    const sizeNode = makeText(`${size}px`, 11, STONE_400)
    nameNode.y = 0
    sizeNode.y = 16
    labelFrame.appendChild(nameNode)
    labelFrame.appendChild(sizeNode)

    const specimen = figma.createText()
    specimen.fontName = { family: 'Inter', style: 'Regular' }
    specimen.fontSize = size
    specimen.characters = SAMPLE
    specimen.fills = [solidPaintFromRgba(STONE_900)]

    row.appendChild(labelFrame)
    row.appendChild(specimen)
    page.appendChild(row)

    y += Math.max(size + 16, 40) + 20
  }

  y += 32

  // -------------------------------------------------------------------------
  // Font weights
  // -------------------------------------------------------------------------
  y = sectionTitle('FONT WEIGHTS', y)

  const weightStyles: Record<string, string> = {
    '400': 'Regular',
    '500': 'Medium',
    '600': 'Semi Bold',
    '700': 'Bold',
  }

  for (const [name, weight] of Object.entries(tokens.typography.fontWeight)) {
    const style = weightStyles[String(weight)] ?? 'Regular'
    const row = makeFrame({
      name: `fontWeight/${name}`,
      width: 600,
      height: 48,
      direction: 'HORIZONTAL',
      gap: 24,
      fills: [],
    })
    row.counterAxisAlignItems = 'CENTER'
    row.x = 0
    row.y = y

    const labelFrame = makeFrame({ name: 'label', width: 120, height: 48, fills: [] })
    const nameNode = makeText(name, 12, STONE_600, 'Semi Bold')
    const weightNode = makeText(`${weight} / ${style}`, 11, STONE_400)
    nameNode.y = 0
    weightNode.y = 16
    labelFrame.appendChild(nameNode)
    labelFrame.appendChild(weightNode)

    let specimen: TextNode
    try {
      await figma.loadFontAsync({ family: 'Inter', style })
      specimen = figma.createText()
      specimen.fontName = { family: 'Inter', style }
    } catch {
      specimen = figma.createText()
      specimen.fontName = { family: 'Inter', style: 'Regular' }
    }
    specimen.fontSize = 20
    specimen.characters = 'The quick brown fox.'
    specimen.fills = [solidPaintFromRgba(STONE_900)]

    row.appendChild(labelFrame)
    row.appendChild(specimen)
    page.appendChild(row)

    y += 48 + 16
  }

  y += 32

  // -------------------------------------------------------------------------
  // Line heights
  // -------------------------------------------------------------------------
  y = sectionTitle('LINE HEIGHTS', y)

  for (const [name, lineH] of Object.entries(tokens.typography.lineHeight)) {
    const baseSize = 16
    const lineHeightPx = Math.round(baseSize * lineH)

    const row = makeFrame({
      name: `lineHeight/${name}`,
      width: 600,
      height: lineHeightPx * 3 + 16,
      direction: 'HORIZONTAL',
      gap: 24,
      fills: [],
    })
    row.counterAxisAlignItems = 'MIN'
    row.x = 0
    row.y = y

    const labelFrame = makeFrame({ name: 'label', width: 120, height: 48, fills: [] })
    const nameNode = makeText(name, 12, STONE_600, 'Semi Bold')
    const valueNode = makeText(`${lineH} (${lineHeightPx}px at 16px)`, 11, STONE_400)
    nameNode.y = 0
    valueNode.y = 16
    labelFrame.appendChild(nameNode)
    labelFrame.appendChild(valueNode)

    const multiline = figma.createText()
    multiline.fontName = { family: 'Inter', style: 'Regular' }
    multiline.fontSize = baseSize
    multiline.lineHeight = { value: lineH * 100, unit: 'PERCENT' }
    multiline.characters =
      "Complete your tasks for today.\nEven small steps count.\nYou're doing great."
    multiline.fills = [solidPaintFromRgba(STONE_900)]

    row.appendChild(labelFrame)
    row.appendChild(multiline)
    page.appendChild(row)

    y += lineHeightPx * 3 + 16 + 24
  }
}
