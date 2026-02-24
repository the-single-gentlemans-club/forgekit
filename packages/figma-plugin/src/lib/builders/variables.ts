/**
 * builders/variables.ts
 *
 * Creates Figma Variable collections from PluginTokens.
 * Generic — no project-specific references.
 */
import type { PluginTokens } from '../types.js'
import { getOrCreateCollection, getOrCreateVariable, hexToRgba, uiLog, uiProgress } from '../utils.js'

/** Build all Variable collections from the token set. Returns total variable count. */
export async function syncVariables(tokens: PluginTokens): Promise<number> {
  let total = 0

  // -------------------------------------------------------------------------
  // 1. Primitives — raw color palettes
  // -------------------------------------------------------------------------
  uiLog('Creating primitive color variables…')
  const primColl = getOrCreateCollection('Primitives')
  const primMode = primColl.modes[0].modeId
  primColl.renameMode(primMode, 'Default')

  // Map name → variable id for alias resolution
  const primitiveIds: Record<string, string> = {}

  for (const [paletteName, steps] of Object.entries(tokens.palettes)) {
    for (const [shade, hex] of Object.entries(steps)) {
      const varName = `${paletteName}/${shade}`
      const v = getOrCreateVariable(varName, primColl, 'COLOR')
      v.setValueForMode(primMode, hexToRgba(hex))
      v.scopes = ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR']
      primitiveIds[varName] = v.id
      total++
    }
  }

  for (const [name, hex] of Object.entries(tokens.absolutes)) {
    const v = getOrCreateVariable(name, primColl, 'COLOR')
    v.setValueForMode(primMode, hexToRgba(hex))
    v.scopes = ['ALL_FILLS', 'STROKE_COLOR']
    primitiveIds[name] = v.id
    total++
  }

  uiLog(`  ✓ ${total} primitive colors`, 'success')
  uiProgress(25)

  // -------------------------------------------------------------------------
  // 2. Semantic — aliases pointing to primitives
  // -------------------------------------------------------------------------
  uiLog('Creating semantic alias variables…')
  const semColl = getOrCreateCollection('Semantic')
  const semMode = semColl.modes[0].modeId
  semColl.renameMode(semMode, 'Light')

  // Reverse-lookup: hex value → primitive variable id
  const hexToPrimId: Record<string, string> = {}
  for (const [paletteName, steps] of Object.entries(tokens.palettes)) {
    for (const [shade, hex] of Object.entries(steps)) {
      hexToPrimId[hex.toLowerCase()] = primitiveIds[`${paletteName}/${shade}`]
    }
  }
  for (const [name, hex] of Object.entries(tokens.absolutes)) {
    hexToPrimId[hex.toLowerCase()] = primitiveIds[name]
  }

  let semCount = 0
  for (const [name, hex] of Object.entries(tokens.semantic)) {
    const v = getOrCreateVariable(name, semColl, 'COLOR')
    const primId = hexToPrimId[hex.toLowerCase()]
    if (primId) {
      v.setValueForMode(semMode, { type: 'VARIABLE_ALIAS', id: primId })
    } else {
      v.setValueForMode(semMode, hexToRgba(hex))
    }
    v.scopes = ['ALL_FILLS', 'STROKE_COLOR', 'EFFECT_COLOR']
    semCount++
    total++
  }

  uiLog(`  ✓ ${semCount} semantic aliases`, 'success')
  uiProgress(45)

  // -------------------------------------------------------------------------
  // 3. Dimensions — spacing, border radius, typography numbers
  // -------------------------------------------------------------------------
  uiLog('Creating dimension variables…')
  const dimColl = getOrCreateCollection('Dimensions')
  const dimMode = dimColl.modes[0].modeId
  dimColl.renameMode(dimMode, 'Default')

  let dimCount = 0

  for (const [key, value] of Object.entries(tokens.spacing)) {
    const v = getOrCreateVariable(`spacing/space-${key}`, dimColl, 'FLOAT')
    v.setValueForMode(dimMode, value)
    v.scopes = ['WIDTH_HEIGHT', 'GAP']
    dimCount++
    total++
  }

  for (const [key, value] of Object.entries(tokens.borderRadius)) {
    const v = getOrCreateVariable(`radius/${key}`, dimColl, 'FLOAT')
    v.setValueForMode(dimMode, value)
    v.scopes = ['CORNER_RADIUS']
    dimCount++
    total++
  }

  for (const [key, value] of Object.entries(tokens.typography.fontSize)) {
    const v = getOrCreateVariable(`typography/size/${key}`, dimColl, 'FLOAT')
    v.setValueForMode(dimMode, value)
    v.scopes = ['FONT_SIZE']
    dimCount++
    total++
  }

  for (const [key, value] of Object.entries(tokens.typography.fontWeight)) {
    const v = getOrCreateVariable(`typography/weight/${key}`, dimColl, 'FLOAT')
    v.setValueForMode(dimMode, value)
    v.scopes = ['FONT_WEIGHT']
    dimCount++
    total++
  }

  for (const [key, value] of Object.entries(tokens.typography.lineHeight)) {
    const v = getOrCreateVariable(`typography/lineHeight/${key}`, dimColl, 'FLOAT')
    v.setValueForMode(dimMode, value)
    dimCount++
    total++
  }

  uiLog(`  ✓ ${dimCount} dimension variables`, 'success')
  uiProgress(65)

  return total
}
