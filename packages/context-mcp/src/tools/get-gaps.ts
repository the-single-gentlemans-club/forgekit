import type { ForgeKitOrchestrator } from '../orchestrator.js'
import type { ForgeKitContextConfig,GapAnalysis } from '../types.js'
import { getDesignSystemState } from './get-design-system-state.js'

export async function getGaps(
  orchestrator: ForgeKitOrchestrator,
  config: ForgeKitContextConfig
): Promise<GapAnalysis> {
  const state = await getDesignSystemState(orchestrator, config)
  const { codeConnectMap, components } = state

  // Figma components with no code mapping (no filePath or codeComponentName)
  const figmaComponentsWithoutCode = codeConnectMap.filter(
    (entry) => !entry.filePath && !entry.codeComponentName
  )

  // Code components not referenced in any Code Connect entry
  const connectedNames = new Set(codeConnectMap.map((e) => e.codeComponentName).filter(Boolean))
  const codeComponentsWithoutFigma = components.filter((c) => !connectedNames.has(c.name))

  // Components that exist in code but have no Storybook story
  const componentsWithoutStories = components.filter((c) => !c.hasStory)

  const summary = [
    `${figmaComponentsWithoutCode.length} Figma component(s) without code`,
    `${codeComponentsWithoutFigma.length} code component(s) without Figma mapping`,
    `${componentsWithoutStories.length} component(s) without stories`,
  ].join(', ')

  return {
    figmaComponentsWithoutCode,
    codeComponentsWithoutFigma,
    componentsWithoutStories,
    summary,
  }
}
