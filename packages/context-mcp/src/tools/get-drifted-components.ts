import type { ForgeKitOrchestrator } from '../orchestrator.js'
import type { DriftAnalysis, FigmaVariable, ForgeKitContextConfig } from '../types.js'
import type { ComponentInfo } from 'forgekit-storybook-mcp'
import { detectDrift } from '../lib/drift.js'

export async function getDriftedComponents(
  orchestrator: ForgeKitOrchestrator,
  config: ForgeKitContextConfig
): Promise<DriftAnalysis> {
  const [tokensResult, componentsResult] = await Promise.allSettled([
    orchestrator.callFigma('get_variable_defs', {
      ...(config.figma.fileId ? { fileId: config.figma.fileId } : {}),
    }),
    orchestrator.callStorybook('list_components', { library: 'all' }),
  ])

  if (tokensResult.status === 'rejected') {
    throw new Error(`Cannot check drift: Figma tokens unavailable. ${tokensResult.reason}`)
  }

  const figmaTokens = (tokensResult.value as FigmaVariable[]) ?? []
  const components =
    componentsResult.status === 'fulfilled'
      ? ((componentsResult.value as { components: ComponentInfo[] }).components ?? [])
      : []

  return detectDrift(components, figmaTokens, {
    projectRoot: config.storybook.projectRoot,
  })
}
