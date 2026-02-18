/**
 * sync_stories_to_figma
 * Pushes Storybook story renders to Figma as editable frames using Code to Canvas.
 * Requires Figma desktop app with Dev Mode MCP server enabled (127.0.0.1:3845).
 */

import type { ForgeKitOrchestrator } from '../orchestrator.js'
import type { SyncToFigmaResult } from '../types.js'

interface ComponentInfo {
  name: string
  filePath: string
  hasStory: boolean
  storyPath?: string
}

interface ListComponentsResult {
  components: ComponentInfo[]
  total: number
}

/**
 * Convert a component name + story file path to a Storybook story ID.
 * Storybook IDs are generated as: kebab-case(title)--kebab-case(storyName)
 * e.g. "components-button--default"
 *
 * Since we don't have the actual title here, we derive a best-effort ID
 * from the component name. The user/AI can refine as needed.
 */
function deriveStoryId(componentName: string): string {
  const kebab = componentName
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
  return `components-${kebab}--default`
}

export async function syncStoriesToFigma(
  orchestrator: ForgeKitOrchestrator,
  args: {
    library?: string
    storybookUrl?: string
    dryRun?: boolean
  }
): Promise<SyncToFigmaResult> {
  const devModeAvailable = orchestrator.isFigmaDevAvailable()
  const storybookBaseUrl = args.storybookUrl?.replace(/\/$/, '') ?? 'http://localhost:6006'

  // 1. Get components that have stories
  const listResult = await orchestrator.callStorybook('list_components', {
    ...(args.library ? { library: args.library } : {}),
    hasStory: true,
  }) as ListComponentsResult

  const components = listResult.components ?? []

  if (components.length === 0) {
    return {
      pushed: [],
      skipped: [],
      devModeAvailable,
      summary: 'No components with stories found. Run sync_all first to generate stories.',
    }
  }

  if (!devModeAvailable) {
    return {
      pushed: [],
      skipped: components.map(c => ({ componentName: c.name, reason: 'Figma Dev Mode MCP unavailable' })),
      devModeAvailable: false,
      summary:
        `Found ${components.length} components with stories, but Figma Dev Mode MCP is not running.\n\n` +
        'To enable Code to Canvas:\n' +
        '  1. Open Figma desktop app\n' +
        '  2. Go to Preferences → Enable Dev Mode MCP Server\n' +
        '  3. Restart context-mcp\n',
    }
  }

  const pushed: SyncToFigmaResult['pushed'] = []
  const skipped: SyncToFigmaResult['skipped'] = []

  // 2. For each component, push its Default story to Figma
  for (const component of components) {
    const storyId = deriveStoryId(component.name)
    const storyUrl = `${storybookBaseUrl}/iframe.html?id=${storyId}&viewMode=story`

    if (args.dryRun) {
      pushed.push({
        componentName: component.name,
        storyName: 'Default',
        storyUrl,
      })
      continue
    }

    try {
      const result = await orchestrator.callFigmaDev('generate_figma_design', {
        componentName: component.name,
        storyUrl,
        targetFrame: component.name,
      }) as { frameId?: string } | null

      pushed.push({
        componentName: component.name,
        storyName: 'Default',
        storyUrl,
        figmaFrameId: result?.frameId,
      })
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err)
      skipped.push({ componentName: component.name, reason })
    }
  }

  const pushedCount = pushed.length
  const skippedCount = skipped.length

  return {
    pushed,
    skipped,
    devModeAvailable,
    summary: args.dryRun
      ? `Dry run: would push ${pushedCount} component stories to Figma via Code to Canvas`
      : `Pushed ${pushedCount} stories to Figma${skippedCount > 0 ? `, ${skippedCount} skipped` : ''}`,
  }
}
