import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { generateThemeTokens } from './utils/chakra.js'
import { fetchFigmaTokens } from './utils/figma.js'
import { writeThemeFile } from './utils/writer.js'
import { loadConfig } from './config.js'


export async function syncTheme(args: { 
  figmaFileId?: string
  figmaAccessToken?: string
  outputDir?: string
  framework?: 'chakra' | 'chakra-v3' 
}) {
  const config = await loadConfig()
  const token = args.figmaAccessToken || config?.figmaAccessToken || process.env.FIGMA_ACCESS_TOKEN
  
  if (!token) {
    throw new Error('Missing figmaAccessToken. Provide it via arguments, env var FIGMA_ACCESS_TOKEN, or forgekit.json')
  }

  const globalFileId = args.figmaFileId || config?.figmaFileId
  
  // If we have legacy/single output mode
  if (!config?.outputs || config.outputs.length === 0) {
      if (!globalFileId) throw new Error('Missing figmaFileId.')
      const rawTokens = await fetchFigmaTokens(globalFileId, token)
      const theme = generateThemeTokens(rawTokens)
      const filesWritten = await writeThemeFile(theme, args.outputDir || config?.outputDir || './src/theme', args.framework || config?.framework || 'chakra')
      return { filesWritten, outputDir: args.outputDir || config?.outputDir || './src/theme' }
  }

  // Multi-Output Mode
  // We need to group outputs by fileId to avoid re-fetching
  const outputsByFile = new Map<string, typeof config.outputs>()
  
  for (const output of config.outputs) {
      const fileId = output.figmaFileId || globalFileId
      if (!fileId) throw new Error(`Missing figmaFileId for output format ${output.format}`)
      
      if (!outputsByFile.has(fileId)) {
          outputsByFile.set(fileId, [])
      }
      outputsByFile.get(fileId)!.push(output)
  }

  const allFilesWritten: string[] = []

  for (const [fileId, outputs] of outputsByFile.entries()) {
      console.error(`Fetching tokens from file: ${fileId}...`)
      const rawTokens = await fetchFigmaTokens(fileId, token)
      const theme = generateThemeTokens(rawTokens)
      
      // Create a temporary config with just these outputs to pass to writer
      const tempConfig = { ...config, outputs }
      const files = await writeThemeFile(theme, '', 'chakra', tempConfig)
      allFilesWritten.push(...files)
  }

  return { filesWritten: allFilesWritten, outputDir: 'multiple' }
}

export async function runServer() {
  const server = new McpServer({
    name: 'forgekit-figma-mcp',
    version: '0.1.0',
  })

  server.tool(
    'sync-theme',
    {
      figmaFileId: z.string().optional().describe('The ID of the Figma file to sync from'),
      figmaAccessToken: z.string().optional().describe('Figma Personal Access Token'),
      outputDir: z.string().optional().describe('Directory to output the generated theme files'),
      framework: z.enum(['chakra', 'chakra-v3']).optional().describe('The target Chakra UI version'),
    },
    async (args) => {
      try {
        const { filesWritten } = await syncTheme(args)

        return {
          content: [
            {
              type: 'text',
              text: `Successfully synced Design System tokens!\n\nGenerated files:\n${filesWritten.join('\n')}`,
            },
          ],
        }
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text',
              text: `Error syncing theme: ${error.message}`,
            },
          ],
          isError: true,
        }
      }
    }
  )

  const transport = new StdioServerTransport()
  await server.connect(transport)
  console.error('ForgeKit Figma MCP Server running on stdio')
}
