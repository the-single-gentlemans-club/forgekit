export interface OutputConfig {
  format: 'chakra' | 'chakra-v3' | 'shadcn' | 'docs'
  dir: string
  // Optional: Override the global file ID for this specific output
  figmaFileId?: string
  // Shadcn specific
  cssPath?: string
  // Docs specific
  title?: string
}

export interface ChakraMCPConfig {
  figmaFileId?: string
  figmaAccessToken?: string
  // Legacy support
  outputDir?: string
  framework?: 'chakra' | 'chakra-v3'
  // New support
  outputs?: OutputConfig[]
}

export type TokenType = 'color' | 'typography' | 'spacing' | 'borderRadius' | 'boxShadow' | 'other'

export interface FigmaToken {
  name: string
  value: string | Record<string, string> // string for primitive, Record<ModeName, Value> for semantic
  type: TokenType
  collection: string
  modes?: Record<string, string> // Map modeId to modeName
  isSemantic: boolean
  description?: string
}

export interface ThemeToken {
  colors: Record<string, any>
  fontSizes: Record<string, any>
  space: Record<string, any>
  radii: Record<string, any>
  shadows: Record<string, any>
  semanticTokens?: {
    colors?: Record<string, any>
    radii?: Record<string, any>
    space?: Record<string, any>
    shadows?: Record<string, any>
  }
}
