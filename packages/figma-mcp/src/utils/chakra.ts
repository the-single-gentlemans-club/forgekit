import { FigmaToken, ThemeToken } from '../types.js'

export function generateThemeTokens(tokens: FigmaToken[]): ThemeToken {
  const theme: ThemeToken = {
    colors: {},
    fontSizes: {},
    space: {},
    radii: {},
    shadows: {},
    semanticTokens: {
      colors: {},
      radii: {},
      space: {},
      shadows: {},
    },
  }

  for (const token of tokens) {
    if (token.isSemantic) {
      const value = mapModesToChakra(token.value as Record<string, string>)

      switch (token.type) {
        case 'color':
          assignNested(theme.semanticTokens!.colors!, token.name, value)
          break
        case 'borderRadius':
          assignNested(theme.semanticTokens!.radii!, token.name, value)
          break
        case 'spacing':
          assignNested(theme.semanticTokens!.space!, token.name, value)
          break
        case 'boxShadow':
          assignNested(theme.semanticTokens!.shadows!, token.name, value)
          break
        // Typography is tricky in semantic tokens, usually handled via textStyles, skipping for now or adding to generic
      }
    } else {
      const value = token.value as string

      switch (token.type) {
        case 'color':
          assignNested(theme.colors, token.name, value)
          break
        case 'typography':
          // Typography often flat in fontSizes
          theme.fontSizes[token.name] = value
          break
        case 'spacing':
          theme.space[token.name] = value
          break
        case 'borderRadius':
          theme.radii[token.name] = value
          break
        case 'boxShadow':
          theme.shadows[token.name] = value
          break
      }
    }
  }

  return theme
}

function mapModesToChakra(modes: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {}

  for (const [mode, value] of Object.entries(modes)) {
    if (mode === 'light') {
      result['default'] = value
      result['_light'] = value
    } else if (mode === 'dark') {
      result['_dark'] = value
    } else {
      result[`_${mode}`] = value
    }
  }

  // Ensure 'default' exists if we have values but no explicit 'light' mode
  if (!result['default'] && Object.keys(result).length > 0) {
    // If we have _dark but no default, use _dark as default? No, usually bad.
    // But if we have 'base' or something, use that.
    // Fallback: use the first value found.
    result['default'] = Object.values(result)[0]
  }

  return result
}

function assignNested(obj: Record<string, any>, path: string, value: any) {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]
    // If it doesn't exist, create object
    if (!current[part]) {
      current[part] = {}
    }
    // If it exists but is a string (conflict), we have a problem.
    // e.g. 'blue' = '#00f' AND 'blue.500' = '#...'
    // Figma usually prevents this, but we should be careful.
    if (typeof current[part] !== 'object') {
      // Convert leaf to object with 'DEFAULT' key? Chakra supports this in some places but not all.
      // For now, overwrite (last write wins) or ignore.
      // Let's assume structure is clean.
      current[part] = {}
    }
    current = current[part]
  }

  current[parts[parts.length - 1]] = value
}
