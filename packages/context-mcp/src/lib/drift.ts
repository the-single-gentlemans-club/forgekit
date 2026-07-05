import fs from 'node:fs'
import path from 'node:path'

import type { ComponentInfo } from 'forgekit-storybook-mcp'

import type { DriftAnalysis,DriftedComponent, DriftItem, FigmaVariable } from '../types.js'

// Regex patterns for detecting hardcoded design values in source files
const COLOR_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d+[\s,]+\d+[\s,]+\d+[^)]*\)/g
const SPACING_PATTERN = /:\s*['"]?(\d+(?:\.\d+)?px)['"]?/g

export interface DriftScanOptions {
  projectRoot: string
}

/**
 * detectDrift — compares Figma token values against component source files.
 *
 * Heuristic approach (no full AST):
 * 1. Build a reverse lookup map from Figma token raw values → token name
 * 2. Read each component source file
 * 3. Regex-scan lines for hardcoded color/spacing values
 * 4. Skip comment lines and lines already using token/variable references
 * 5. Any match against the token map = drift
 */
export function detectDrift(
  components: ComponentInfo[],
  figmaTokens: FigmaVariable[],
  opts: DriftScanOptions
): DriftAnalysis {
  const tokenMap = buildTokenMap(figmaTokens)
  const drifted: DriftedComponent[] = []
  const clean: string[] = []

  for (const component of components) {
    const fullPath = path.isAbsolute(component.filePath)
      ? component.filePath
      : path.join(opts.projectRoot, component.filePath)

    let source: string
    try {
      source = fs.readFileSync(fullPath, 'utf-8')
    } catch {
      continue
    }

    const driftItems = scanSourceForDrift(source, tokenMap)

    if (driftItems.length > 0) {
      drifted.push({ componentName: component.name, filePath: component.filePath, driftItems })
    } else {
      clean.push(component.name)
    }
  }

  const summary =
    drifted.length === 0
      ? `All ${clean.length} component(s) use design tokens correctly.`
      : `${drifted.length} component(s) have hardcoded values that should use Figma tokens. ${clean.length} component(s) are clean.`

  return { drifted, clean, summary }
}

// Build reverse lookup: normalized-value → { name, type }
function buildTokenMap(tokens: FigmaVariable[]): Map<string, { name: string; type: string }> {
  const map = new Map<string, { name: string; type: string }>()

  for (const token of tokens) {
    const val = typeof token.value === 'string' ? token.value : null
    if (!val) continue

    if (token.type === 'COLOR') {
      const normalized = normalizeColor(val)
      if (normalized) map.set(normalized, { name: token.name, type: 'color' })
    } else if (token.type === 'FLOAT' || (token.type === 'STRING' && val.endsWith('px'))) {
      map.set(val, { name: token.name, type: 'spacing' })
    }
  }

  return map
}

function scanSourceForDrift(
  source: string,
  tokenMap: Map<string, { name: string; type: string }>
): DriftItem[] {
  const items: DriftItem[] = []
  const lines = source.split('\n')

  lines.forEach((line, idx) => {
    const trimmed = line.trimStart()

    // Skip comment lines
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return

    // Skip lines already using token/variable references
    if (
      line.includes('var(--') ||
      line.includes('tokens.') ||
      line.includes('theme.') ||
      line.includes('colors.') ||
      line.includes('semantic.')
    )
      return

    // Check colors
    for (const match of line.matchAll(COLOR_PATTERN)) {
      const normalized = normalizeColor(match[0])
      const token = normalized ? tokenMap.get(normalized) : undefined
      if (token && token.type === 'color') {
        items.push({
          type: 'color',
          hardcodedValue: match[0],
          expectedToken: token.name,
          expectedFigmaVariable: token.name,
          line: idx + 1,
        })
      }
    }

    // Check spacing values
    for (const match of line.matchAll(SPACING_PATTERN)) {
      const val = match[1]
      const token = tokenMap.get(val)
      if (token && token.type === 'spacing') {
        items.push({
          type: 'spacing',
          hardcodedValue: val,
          expectedToken: token.name,
          expectedFigmaVariable: token.name,
          line: idx + 1,
        })
      }
    }
  })

  return items
}

function normalizeColor(value: string): string | null {
  const hex6 = value.match(/^#([0-9a-fA-F]{6})$/)
  if (hex6) return `#${hex6[1].toLowerCase()}`

  const hex3 = value.match(/^#([0-9a-fA-F]{3})$/)
  if (hex3) {
    const [r, g, b] = hex3[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase()
  }

  const hex8 = value.match(/^#([0-9a-fA-F]{8})$/)
  if (hex8) return `#${hex8[1].toLowerCase()}`

  // rgba/rgb — return lowercase for comparison
  if (value.toLowerCase().startsWith('rgb')) return value.toLowerCase().replace(/\s+/g, '')

  return null
}
