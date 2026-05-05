import type { ForgeKitOrchestrator } from '../orchestrator.js'
import type { CodeConnectSuggestion, ForgeKitContextConfig } from '../types.js'

export interface MissingComponentsResult {
  suggestions: CodeConnectSuggestion[]
  summary: string
}

export async function getMissingComponents(
  orchestrator: ForgeKitOrchestrator,
  config: ForgeKitContextConfig
): Promise<MissingComponentsResult> {
  const raw = await orchestrator.callFigma('get_code_connect_suggestions', {
    ...(config.figma.fileId ? { fileId: config.figma.fileId } : {}),
  })

  const suggestions = (raw as CodeConnectSuggestion[]) ?? []
  const highConfidence = suggestions.filter((s) => s.confidence >= 0.8)

  const summary =
    `${suggestions.length} suggestion(s) found. ` +
    `${highConfidence.length} high-confidence (≥80%) mapping(s).`

  return { suggestions, summary }
}
