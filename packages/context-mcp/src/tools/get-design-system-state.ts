import type { ForgeKitOrchestrator } from '../orchestrator.js'
import type { DesignSystemState, FigmaVariable, CodeConnectEntry, ForgeKitContextConfig } from '../types.js'
import type { ComponentInfo } from 'forgekit-storybook-mcp'
import { mergeSummaries } from '@forgekit/mcp-core'

export async function getDesignSystemState(
  orchestrator: ForgeKitOrchestrator,
  config: ForgeKitContextConfig
): Promise<DesignSystemState> {
  const [tokensResult, connectMapResult, componentsResult] = await Promise.allSettled([
    orchestrator.callFigma('get_variable_defs', {
      ...(config.figma.fileId ? { fileId: config.figma.fileId } : {}),
    }),
    orchestrator.callFigma('get_code_connect_map', {
      ...(config.figma.fileId ? { fileId: config.figma.fileId } : {}),
    }),
    orchestrator.callStorybook('list_components', { library: 'all' }),
  ])

  const figmaTokens = tokensResult.status === 'fulfilled'
    ? ((tokensResult.value as FigmaVariable[]) ?? [])
    : []

  const codeConnectMap = connectMapResult.status === 'fulfilled'
    ? ((connectMapResult.value as CodeConnectEntry[]) ?? [])
    : []

  const componentsData = componentsResult.status === 'fulfilled'
    ? (componentsResult.value as { components: ComponentInfo[] })
    : { components: [] }

  const components = componentsData.components ?? []
  const withStories = components.filter(c => c.hasStory).length

  const summaryParts: string[] = [
    `${figmaTokens.length} Figma tokens`,
    `${codeConnectMap.length} Code Connect entries`,
    `${components.length} React components (${withStories} with stories)`,
  ]

  if (tokensResult.status === 'rejected') {
    summaryParts.push(`Figma tokens unavailable: ${tokensResult.reason}`)
  }
  if (connectMapResult.status === 'rejected') {
    summaryParts.push(`Code Connect map unavailable: ${connectMapResult.reason}`)
  }
  if (componentsResult.status === 'rejected') {
    summaryParts.push(`Component list unavailable: ${componentsResult.reason}`)
  }

  return {
    figmaTokens,
    codeConnectMap,
    components,
    summary: mergeSummaries(...summaryParts),
  }
}
