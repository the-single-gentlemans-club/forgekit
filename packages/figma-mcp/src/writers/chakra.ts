import fs from 'fs/promises'
import path from 'path'
import { ThemeToken } from '../types.js'
import { WriterAdapter } from './adapter.js'

export class ChakraWriter implements WriterAdapter {
  async write(theme: ThemeToken, outputDir: string, options?: { version: 'v2' | 'v3' }): Promise<string[]> {
    await fs.mkdir(outputDir, { recursive: true })
    const version = options?.version || 'v2'

    if (version === 'v3') {
      return this.writeV3(theme, outputDir)
    }
    return this.writeV2(theme, outputDir)
  }

  private async writeV2(theme: ThemeToken, outputDir: string): Promise<string[]> {
    const filesWritten: string[] = []
    const write = async (name: string, content: string) => {
      await fs.writeFile(path.join(outputDir, name), content)
      filesWritten.push(path.join(outputDir, name))
    }

    await write('colors.ts', `export const colors = ${JSON.stringify(theme.colors, null, 2)}`)
    await write('fontSizes.ts', `export const fontSizes = ${JSON.stringify(theme.fontSizes, null, 2)}`)
    await write('space.ts', `export const space = ${JSON.stringify(theme.space, null, 2)}`)
    await write('radii.ts', `export const radii = ${JSON.stringify(theme.radii, null, 2)}`)
    await write('shadows.ts', `export const shadows = ${JSON.stringify(theme.shadows, null, 2)}`)

    const semanticTokens = theme.semanticTokens || {}
    await write('semanticTokens.ts', `export const semanticTokens = ${JSON.stringify(semanticTokens, null, 2)}`)

    const indexContent = `import { extendTheme } from '@chakra-ui/react'
import { colors } from './colors'
import { fontSizes } from './fontSizes'
import { space } from './space'
import { radii } from './radii'
import { shadows } from './shadows'
import { semanticTokens } from './semanticTokens'

export const theme = extendTheme({
  colors,
  fontSizes,
  space,
  radii,
  shadows,
  semanticTokens,
})
`
    await write('index.ts', indexContent)
    return filesWritten
  }

  private async writeV3(theme: ThemeToken, outputDir: string): Promise<string[]> {
    const filesWritten: string[] = []
    const write = async (name: string, content: string) => {
      await fs.writeFile(path.join(outputDir, name), content)
      filesWritten.push(path.join(outputDir, name))
    }

    const tokens = {
      colors: theme.colors,
      fontSizes: theme.fontSizes,
      spacing: theme.space,
      radii: theme.radii,
      shadows: theme.shadows,
    }
    await write('tokens.ts', `export const tokens = ${JSON.stringify(tokens, null, 2)}`)

    const transformToV3Semantic = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj
      const keys = Object.keys(obj)
      const isModeMap = keys.some(k => k.startsWith('_') || k === 'default')
      if (isModeMap) return { value: obj }
      const result: any = {}
      for (const [key, value] of Object.entries(obj)) {
        result[key] = transformToV3Semantic(value)
      }
      return result
    }

    const semanticTokensV3 = transformToV3Semantic(theme.semanticTokens || {})
    await write('semanticTokens.ts', `export const semanticTokens = ${JSON.stringify(semanticTokensV3, null, 2)}`)

    const indexContent = `import { createSystem, defaultConfig } from '@chakra-ui/react'
import { tokens } from './tokens'
import { semanticTokens } from './semanticTokens'

export const system = createSystem(defaultConfig, {
  theme: {
    tokens,
    semanticTokens,
  },
})
`
    await write('index.ts', indexContent)
    return filesWritten
  }
}
