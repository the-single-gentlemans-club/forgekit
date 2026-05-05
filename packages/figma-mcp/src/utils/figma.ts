import axios from 'axios'

import { FigmaToken, TokenType } from '../types.js'

interface FigmaVariable {
  id: string
  name: string
  key: string
  variableCollectionId: string
  resolvedType: 'BOOLEAN' | 'FLOAT' | 'STRING' | 'COLOR'
  valuesByMode: Record<string, any>
  remote: boolean
  description: string
  hiddenFromPublishing: boolean
  scopes: string[]
}

interface FigmaVariableCollection {
  id: string
  name: string
  key: string
  modes: { modeId: string; name: string }[]
  defaultModeId: string
  remote: boolean
  hiddenFromPublishing: boolean
}

interface FigmaLocalVariablesResponse {
  status: number
  error: boolean
  meta: {
    variables: Record<string, FigmaVariable>
    variableCollections: Record<string, FigmaVariableCollection>
  }
}

export async function fetchFigmaTokens(fileId: string, accessToken: string): Promise<FigmaToken[]> {
  console.error(`Fetching variables for file ${fileId}...`)

  try {
    const response = await axios.get<FigmaLocalVariablesResponse>(
      `https://api.figma.com/v1/files/${fileId}/variables/local`,
      {
        headers: {
          'X-Figma-Token': accessToken,
        },
      }
    )

    if (response.status !== 200 || response.data.error) {
      throw new Error(`Figma API Error: ${response.status}`)
    }

    const { variables, variableCollections } = response.data.meta
    const tokens: FigmaToken[] = []

    // Index for fast lookup
    const variablesMap = new Map<string, FigmaVariable>()
    Object.values(variables).forEach((v) => variablesMap.set(v.id, v))

    const collectionsMap = new Map<string, FigmaVariableCollection>()
    Object.values(variableCollections).forEach((c) => collectionsMap.set(c.id, c))

    // Helper to resolve values recursively
    const resolveValue = (value: any, contextModeId: string, visited = new Set<string>()): any => {
      if (value === undefined || value === null) return null

      // Handle Aliases
      if (typeof value === 'object' && 'type' in value && value.type === 'VARIABLE_ALIAS') {
        const refId = value.id
        if (visited.has(refId)) {
          console.warn(`Circular dependency detected for variable ${refId}`)
          return null
        }

        const refVar = variablesMap.get(refId)
        if (!refVar) return null // Reference might be remote or missing

        const refCollection = collectionsMap.get(refVar.variableCollectionId)
        if (!refCollection) return null

        // Determine mode to use for reference
        // 1. Try same mode ID (e.g. Light -> Light)
        // 2. Fallback to default mode (e.g. Light -> Primitive Default)
        // 3. Fallback to first available mode
        let refModeId = contextModeId
        const modeExists = refCollection.modes.some((m) => m.modeId === contextModeId)

        if (!modeExists) {
          refModeId = refCollection.defaultModeId || refCollection.modes[0]?.modeId
        }

        const refValue = refVar.valuesByMode[refModeId]
        return resolveValue(refValue, refModeId, new Set([...visited, refId]))
      }

      // Handle Color Structs
      if (typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
        return rgbaToHex(value)
      }

      return value
    }

    for (const variable of Object.values(variables)) {
      if (variable.remote) continue

      const collection = collectionsMap.get(variable.variableCollectionId)
      if (!collection) continue

      // Determine if this is a semantic token (has multiple modes or is in a collection named like one)
      // For simplicity, if a collection has > 1 mode, we treat it as semantic.
      const isSemantic = collection.modes.length > 1

      let tokenValue: string | Record<string, string>
      let tokenType: TokenType = 'other'

      // Determine Type
      if (variable.resolvedType === 'COLOR') {
        tokenType = 'color'
      } else if (variable.resolvedType === 'FLOAT') {
        const name = variable.name.toLowerCase()
        const collName = collection.name.toLowerCase()
        if (name.includes('radius') || collName.includes('radius')) tokenType = 'borderRadius'
        else if (name.includes('space') || name.includes('gap') || collName.includes('space'))
          tokenType = 'spacing'
        else if (name.includes('size') || name.includes('font')) tokenType = 'typography'
        else tokenType = 'spacing' // Default float to spacing
      }

      if (isSemantic) {
        tokenValue = {} as Record<string, string>
        for (const mode of collection.modes) {
          const rawVal = variable.valuesByMode[mode.modeId]
          const resolved = resolveValue(rawVal, mode.modeId)
          if (resolved !== null) {
            // Normalize mode name (e.g. "Light Mode" -> "light", "Dark" -> "dark")
            const modeKey = sanitizeModeName(mode.name)
            tokenValue[modeKey] = resolved

            // Add px to numbers if needed
            if (
              tokenType === 'spacing' ||
              tokenType === 'borderRadius' ||
              tokenType === 'typography'
            ) {
              if (typeof resolved === 'number') {
                tokenValue[modeKey] = `${resolved}px`
              }
            }
          }
        }
      } else {
        // Primitive / Single Mode
        const modeId = collection.defaultModeId || collection.modes[0]?.modeId
        if (!modeId) continue

        const rawVal = variable.valuesByMode[modeId]
        const resolved = resolveValue(rawVal, modeId)

        if (resolved === null) continue

        tokenValue = resolved
        if (
          (tokenType === 'spacing' || tokenType === 'borderRadius' || tokenType === 'typography') &&
          typeof resolved === 'number'
        ) {
          tokenValue = `${resolved}px`
        }
      }

      tokens.push({
        name: sanitizeName(variable.name),
        value: tokenValue,
        type: tokenType,
        collection: collection.name,
        isSemantic,
        description: variable.description,
      })
    }

    console.error(`Found ${tokens.length} tokens.`)
    return tokens
  } catch (error: any) {
    console.error('Error fetching Figma variables:', error.message)
    if (axios.isAxiosError(error) && error.response) {
      console.error('Response data:', error.response.data)
    }
    throw error
  }
}

function sanitizeName(name: string): string {
  return name.toLowerCase().replace(/\//g, '.').replace(/\s+/g, '-')
}

function sanitizeModeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+mode/g, '')
    .replace(/\s+/g, '')
}

function rgbaToHex(color: { r: number; g: number; b: number; a?: number } | any): string {
  if (!color || typeof color !== 'object') return '#000000'

  const toHex = (n: number) => {
    const hex = Math.round(n * 255).toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }

  const r = toHex(color.r)
  const g = toHex(color.g)
  const b = toHex(color.b)

  if (color.a !== undefined && color.a < 1) {
    const a = toHex(color.a)
    return `#${r}${g}${b}${a}`
  }

  return `#${r}${g}${b}`
}
