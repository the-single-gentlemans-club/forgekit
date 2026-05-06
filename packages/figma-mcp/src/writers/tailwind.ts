import fs from 'fs/promises'
import path from 'path'

import { ThemeToken } from '../types.js'
import { WriterAdapter } from './adapter.js'

export class TailwindWriter implements WriterAdapter {
  async write(
    theme: ThemeToken,
    outputDir: string,
    options?: { cssPath?: string }
  ): Promise<string[]> {
    const filesWritten: string[] = []

    // 1. Generate CSS Variables (globals.css)
    if (options?.cssPath) {
      const cssContent = this.generateCssVariables(theme)
      // Ensure directory exists
      await fs.mkdir(path.dirname(options.cssPath), { recursive: true })

      // We don't want to overwrite the whole file usually, but for this MVP we might.
      // Better strategy: Read file, replace :root { ... } content?
      // For now: Write a separate file 'theme.css' that can be imported.
      const themeCssPath = path.join(path.dirname(options.cssPath), 'theme.css')
      await fs.writeFile(themeCssPath, cssContent)
      filesWritten.push(themeCssPath)
    }

    // 2. Generate Tailwind Config snippet (json)
    // This allows users to copy-paste or import into tailwind.config.ts
    const tailwindConfig = this.generateTailwindConfig(theme)
    await fs.mkdir(outputDir, { recursive: true })
    const configPath = path.join(outputDir, 'tailwind.theme.json')
    await fs.writeFile(configPath, JSON.stringify(tailwindConfig, null, 2))
    filesWritten.push(configPath)

    return filesWritten
  }

  private generateCssVariables(theme: ThemeToken): string {
    let css = ':root {\n'
    let darkCss = '.dark {\n'

    // Helper to flatten object to css vars
    const processColors = (obj: any, prefix: string) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object') {
          // Check if it's a semantic token (has _light, _dark)
          if (value && (value as any)._light) {
            const lightVal = this.hexToHsl((value as any)._light)
            const darkVal = this.hexToHsl((value as any)._dark || (value as any)._light)

            const varName = `--${prefix}-${key}`.replace(/-+/g, '-').toLowerCase()
            css += `  ${varName}: ${lightVal};\n`
            darkCss += `  ${varName}: ${darkVal};\n`
          } else {
            processColors(value, `${prefix}-${key}`)
          }
        } else if (typeof value === 'string') {
          const varName = `--${prefix}-${key}`.replace(/-+/g, '-').toLowerCase()
          // If it looks like a color, convert to HSL for Shadcn
          if (value.startsWith('#') || value.startsWith('rgb')) {
            css += `  ${varName}: ${this.hexToHsl(value)};\n`
          } else {
            css += `  ${varName}: ${value};\n`
          }
        }
      }
    }

    // Process Semantic Colors first (Shadcn relies heavily on these)
    if (theme.semanticTokens?.colors) {
      processColors(theme.semanticTokens.colors, '')
    }

    // Process Primitives as fallback vars?
    // Usually Shadcn maps primitives like 'slate-500' directly in tailwind,
    // but we can expose them as vars too if needed.
    // Let's stick to semantic for now as that's the main value prop.

    css += '}\n\n'
    darkCss += '}\n'

    return css + darkCss
  }

  private generateTailwindConfig(theme: ThemeToken): any {
    // Generate the 'extend' object for tailwind.config.js
    const extend: any = {
      colors: {},
      borderRadius: {},
    }

    // Map Semantic Colors
    const processSemanticColors = (obj: any, prefix: string, target: any) => {
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'object' && (value as any)._light) {
          // It's a token
          const varName = `--${prefix}-${key}`.replace(/-+/g, '-').toLowerCase()
          target[key] = `hsl(var(${varName}))`
        } else if (typeof value === 'object') {
          target[key] = {}
          processSemanticColors(value, `${prefix}-${key}`, target[key])
        }
      }
    }

    if (theme.semanticTokens?.colors) {
      processSemanticColors(theme.semanticTokens.colors, '', extend.colors)
    }

    // Map Radii
    if (theme.radii) {
      for (const [key, value] of Object.entries(theme.radii)) {
        extend.borderRadius[key] = value
      }
    }

    return extend
  }

  private hexToHsl(hex: string): string {
    // Simple hex to hsl conversion (Shadcn uses space separated: 222.2 47.4% 11.2%)
    let c = hex.substring(1).split('')
    if (c.length === 3) {
      c = [c[0], c[0], c[1], c[1], c[2], c[2]]
    }
    const r = parseInt(c[0] + c[1], 16) / 255
    const g = parseInt(c[2] + c[3], 16) / 255
    const b = parseInt(c[4] + c[5], 16) / 255

    const max = Math.max(r, g, b),
      min = Math.min(r, g, b)
    let h = 0,
      s = 0
    const l = (max + min) / 2

    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0)
          break
        case g:
          h = (b - r) / d + 2
          break
        case b:
          h = (r - g) / d + 4
          break
      }
      h /= 6
    }

    // Round to 1 decimal
    const H = (h * 360).toFixed(1)
    const S = (s * 100).toFixed(1) + '%'
    const L = (l * 100).toFixed(1) + '%'

    return `${H} ${S} ${L}`
  }
}
