/**
 * builders/spacing.ts
 *
 * Builds the 📐 Spacing & Radius page.
 * Generic — no project-specific references.
 */
import type { PluginTokens } from '../types.js'
import { getOrResetPage, hexToRgba, loadInterFonts, makeText, solidPaintFromRgba } from '../utils.js'

export async function buildSpacingPage(tokens: PluginTokens): Promise<void> {
  const page = getOrResetPage('📐 Spacing & Radius')
  await figma.setCurrentPageAsync(page)
  await loadInterFonts()

  const TEAL_400 = hexToRgba('#2dd4bf')
  const STONE_200 = hexToRgba('#e7e5e4')
  const STONE_600 = hexToRgba('#57534e')
  const STONE_400 = hexToRgba('#a8a29e')
  const TEAL_600 = hexToRgba('#0d9488')

  let y = 0

  function sectionTitle(text: string): void {
    const node = makeText(text, 11, TEAL_600, 'Semi Bold')
    node.x = 0
    node.y = y
    page.appendChild(node)
    y += 24
  }

  // -------------------------------------------------------------------------
  // Spacing scale
  // -------------------------------------------------------------------------
  sectionTitle('SPACING SCALE')

  for (const [key, px] of Object.entries(tokens.spacing)) {
    const rowH = Math.max(px, 8) + 8

    const label = makeText(`space-${key}  ${px}px`, 11, STONE_600)
    label.x = 0
    label.y = y + (rowH - 14) / 2
    page.appendChild(label)

    if (px > 0) {
      const bar = figma.createRectangle()
      bar.name = `spacing/space-${key}`
      bar.resize(px, Math.max(px, 8))
      bar.x = 140
      bar.y = y
      bar.fills = [solidPaintFromRgba(TEAL_400)]
      bar.cornerRadius = 3
      page.appendChild(bar)

      const ann = makeText(`${px}`, 9, STONE_400)
      ann.x = 140 + px + 6
      ann.y = y + (Math.max(px, 8) - 12) / 2
      page.appendChild(ann)
    }

    const guide = figma.createLine()
    guide.resize(400, 0)
    guide.x = 0
    guide.y = y + rowH
    guide.strokes = [solidPaintFromRgba(STONE_200)]
    guide.strokeWeight = 1
    page.appendChild(guide)

    y += rowH + 12
  }

  y += 48

  // -------------------------------------------------------------------------
  // Border radius scale
  // -------------------------------------------------------------------------
  sectionTitle('BORDER RADIUS')

  const entries = Object.entries(tokens.borderRadius)
  const BOX = 64
  let x = 0

  for (const [name, radius] of entries) {
    const box = figma.createRectangle()
    box.name = `radius/${name}`
    box.resize(BOX, BOX)
    box.x = x
    box.y = y
    box.fills = [solidPaintFromRgba({ r: 0.08, g: 0.58, b: 0.53, a: 0.12 })]
    box.strokeWeight = 2
    box.strokes = [solidPaintFromRgba(TEAL_600)]
    box.cornerRadius = Math.min(radius, BOX / 2)
    page.appendChild(box)

    const label = makeText(`${name}\n${radius}px`, 9, STONE_600)
    label.x = x
    label.y = y + BOX + 6
    page.appendChild(label)

    x += BOX + 24
  }
}
