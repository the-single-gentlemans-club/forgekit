import type { ForgeKitOrchestrator } from '../orchestrator.js'
import type { ForgeKitContextConfig } from '../types.js'
import type { ComponentAnalysis } from 'forgekit-storybook-mcp'

export interface GetComponentArgs {
  componentName: string
  componentPath?: string
  figmaNodeId?: string
}

export interface GetComponentResult {
  figmaDesignContext: unknown | null
  codeAnalysis: ComponentAnalysis | null
  summary: string
}

export async function getComponent(
  orchestrator: ForgeKitOrchestrator,
  config: ForgeKitContextConfig,
  args: GetComponentArgs
): Promise<GetComponentResult> {
  const [figmaResult, codeResult] = await Promise.allSettled([
    orchestrator.callFigma('get_design_context', {
      componentName: args.componentName,
      ...(args.figmaNodeId ? { nodeId: args.figmaNodeId } : {}),
      ...(config.figma.fileId ? { fileId: config.figma.fileId } : {}),
    }),
    orchestrator.callStorybook('analyze_component', {
      componentPath: args.componentPath ?? `src/components/${args.componentName}.tsx`,
    }),
  ])

  const figmaDesignContext = figmaResult.status === 'fulfilled' ? figmaResult.value : null
  const analysisData = codeResult.status === 'fulfilled'
    ? (codeResult.value as { analysis: ComponentAnalysis } | null)
    : null
  const codeAnalysis = analysisData?.analysis ?? null

  const parts: string[] = []
  if (figmaDesignContext) parts.push('Figma design context retrieved')
  else parts.push(`Figma unavailable: ${figmaResult.status === 'rejected' ? figmaResult.reason : 'unknown'}`)
  if (codeAnalysis) parts.push(`${codeAnalysis.props.length} props analyzed`)
  else parts.push(`Code analysis unavailable: ${codeResult.status === 'rejected' ? codeResult.reason : 'unknown'}`)

  return { figmaDesignContext, codeAnalysis, summary: parts.join('; ') }
}
