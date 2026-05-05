import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { ForgeKitOrchestrator } from './orchestrator.js'
import type { ForgeKitContextConfig } from './types.js'
import { getDesignSystemState } from './tools/get-design-system-state.js'
import { getGaps } from './tools/get-gaps.js'
import { getComponent } from './tools/get-component.js'
import { getDriftedComponents } from './tools/get-drifted-components.js'
import { getMissingComponents } from './tools/get-missing-components.js'
import { onboard } from './tools/onboard.js'
import { syncStoriesToFigma } from './tools/sync-stories-to-figma.js'

export function createContextMCPServer(
  config: ForgeKitContextConfig,
  orchestrator: ForgeKitOrchestrator
): Server {
  const server = new Server(
    { name: 'forgekit-context', version: '0.1.0' },
    { capabilities: { tools: {} } }
  )

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'get_design_system_state',
        description:
          'Get the complete state of the design system: Figma tokens, Code Connect mappings, and all React components with Storybook coverage.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_gaps',
        description:
          'Identify gaps between Figma design and code: components in Figma without code, code components without Figma mappings, and code components without stories.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_component',
        description:
          'Get merged Figma design context and React component analysis for a specific component.',
        inputSchema: {
          type: 'object',
          properties: {
            componentName: {
              type: 'string',
              description: 'Component name in PascalCase (e.g. "Button")',
            },
            componentPath: {
              type: 'string',
              description: 'Relative path to the component file (optional)',
            },
            figmaNodeId: {
              type: 'string',
              description: 'Specific Figma node ID to look up (optional)',
            },
          },
          required: ['componentName'],
        },
      },
      {
        name: 'get_drifted_components',
        description:
          'Find components that use hardcoded color or spacing values that should instead reference Figma design tokens.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'get_missing_components',
        description:
          'Get Figma Code Connect suggestions: Figma components that have no corresponding code component mapped.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'onboard',
        description:
          'Initialize ForgeKit for this project: generate design system rules from Figma and preview story/test/docs generation.',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'sync_stories_to_figma',
        description:
          'Push Storybook story renders to Figma as editable frames via Code to Canvas. ' +
          'Requires Figma desktop app with Dev Mode MCP server enabled (Preferences → Enable Dev Mode MCP Server).',
        inputSchema: {
          type: 'object',
          properties: {
            library: {
              type: 'string',
              description: 'Filter by library name (optional — syncs all libraries if omitted)',
            },
            storybookUrl: {
              type: 'string',
              description: 'Storybook base URL (default: http://localhost:6006)',
            },
            dryRun: {
              type: 'boolean',
              description: 'Preview which stories would be pushed without actually pushing them',
            },
          },
        },
      },
    ],
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params
    const typedArgs = (args ?? {}) as Record<string, unknown>

    try {
      let result: unknown

      switch (name) {
        case 'get_design_system_state':
          result = await getDesignSystemState(orchestrator, config)
          break
        case 'get_gaps':
          result = await getGaps(orchestrator, config)
          break
        case 'get_component':
          result = await getComponent(orchestrator, config, {
            componentName: typedArgs['componentName'] as string,
            componentPath: typedArgs['componentPath'] as string | undefined,
            figmaNodeId: typedArgs['figmaNodeId'] as string | undefined,
          })
          break
        case 'get_drifted_components':
          result = await getDriftedComponents(orchestrator, config)
          break
        case 'get_missing_components':
          result = await getMissingComponents(orchestrator, config)
          break
        case 'onboard':
          result = await onboard(orchestrator, config)
          break
        case 'sync_stories_to_figma':
          result = await syncStoriesToFigma(orchestrator, {
            library: typedArgs['library'] as string | undefined,
            storybookUrl:
              (typedArgs['storybookUrl'] as string | undefined) ?? config.storybook.storybookUrl,
            dryRun: typedArgs['dryRun'] as boolean | undefined,
          })
          break
        default:
          throw new Error(`Unknown tool: ${name}`)
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return {
        content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
        isError: true,
      }
    }
  })

  return server
}

export async function runContextServer(config: ForgeKitContextConfig): Promise<void> {
  const orchestrator = new ForgeKitOrchestrator()

  process.stderr.write('[context-mcp] Connecting to downstream MCP servers...\n')
  const status = await orchestrator.connect(config)
  process.stderr.write(
    `[context-mcp] Figma: ${status.figma} | Storybook: ${status.storybook} | FigmaDev: ${status.figmaDev}\n`
  )

  if (status.figma === 'unavailable' && status.storybook === 'unavailable') {
    process.stderr.write(
      '[context-mcp] WARNING: Both downstream MCPs are unavailable. Tools will return errors.\n'
    )
  }

  const gracefulShutdown = async () => {
    process.stderr.write('[context-mcp] Shutting down...\n')
    await orchestrator.disconnect()
    process.exit(0)
  }

  process.on('SIGINT', gracefulShutdown)
  process.on('SIGTERM', gracefulShutdown)

  const server = createContextMCPServer(config, orchestrator)
  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write('[context-mcp] MCP server running on stdio\n')
}
