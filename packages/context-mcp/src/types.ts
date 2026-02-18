import type { LibraryConfig } from 'forgekit-storybook-mcp'
import type { ComponentInfo } from 'forgekit-storybook-mcp'

// -----------------------------------------------
// Top-level config for context-mcp
// -----------------------------------------------
export interface ForgeKitContextConfig {
  figma: FigmaConfig
  storybook: StorybookContextConfig
  outputDir?: string  // defaults to '.forgekit/'
}

export interface FigmaConfig {
  accessToken: string           // FIGMA_ACCESS_TOKEN env var
  fileId?: string               // specific Figma file ID
  useDesktop?: boolean          // spawn local npx figma-developer-mcp (default: true)
  remoteUrl?: string            // override remote URL
}

export interface StorybookContextConfig {
  projectRoot: string
  libraries: LibraryConfig[]
  licenseKey?: string
}

// -----------------------------------------------
// Figma domain types (from figma-developer-mcp responses)
// -----------------------------------------------
export interface FigmaVariable {
  name: string
  value: string | Record<string, string>
  type: 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'
  collection: string
  modes?: string[]
  isSemantic?: boolean
  description?: string
}

export interface CodeConnectEntry {
  figmaNodeId: string
  figmaComponentName: string
  codeComponentName?: string
  filePath?: string
  confidence?: number
}

export interface CodeConnectSuggestion {
  figmaNodeId: string
  figmaComponentName: string
  suggestedCodeComponent?: string
  confidence: number
  reasoning?: string
}

// -----------------------------------------------
// Aggregated design system state
// -----------------------------------------------
export interface DesignSystemState {
  figmaTokens: FigmaVariable[]
  codeConnectMap: CodeConnectEntry[]
  components: ComponentInfo[]
  summary: string
}

// -----------------------------------------------
// Gap analysis
// -----------------------------------------------
export interface GapAnalysis {
  figmaComponentsWithoutCode: CodeConnectEntry[]
  codeComponentsWithoutFigma: ComponentInfo[]
  componentsWithoutStories: ComponentInfo[]
  summary: string
}

// -----------------------------------------------
// Drift detection
// -----------------------------------------------
export interface DriftedComponent {
  componentName: string
  filePath: string
  driftItems: DriftItem[]
}

export interface DriftItem {
  type: 'color' | 'spacing' | 'typography' | 'borderRadius' | 'shadow'
  hardcodedValue: string
  expectedToken: string
  expectedFigmaVariable: string
  line?: number
}

export interface DriftAnalysis {
  drifted: DriftedComponent[]
  clean: string[]
  summary: string
}

// -----------------------------------------------
// Onboard result
// -----------------------------------------------
export interface OnboardResult {
  rulesFile: string
  syncPreview: unknown
  instructions: string
}
