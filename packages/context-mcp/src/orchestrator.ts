import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import {
  createStdioMcpClient,
  createHttpMcpClient,
  callTool,
  McpConnectionError,
} from '@forgekit/mcp-core'
import type { ForgeKitContextConfig } from './types.js'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

export type ConnectionStatus = 'connected' | 'unavailable' | 'not-attempted'

export interface OrchestratorStatus {
  figma: ConnectionStatus
  storybook: ConnectionStatus
  figmaError?: string
  storybookError?: string
}

export class ForgeKitOrchestrator {
  private figmaClient: Client | null = null
  private storybookClient: Client | null = null
  private status: OrchestratorStatus = {
    figma: 'not-attempted',
    storybook: 'not-attempted',
  }

  async connect(config: ForgeKitContextConfig): Promise<OrchestratorStatus> {
    const [figmaResult, storybookResult] = await Promise.allSettled([
      this.connectFigma(config),
      this.connectStorybook(config),
    ])

    if (figmaResult.status === 'rejected') {
      this.status.figma = 'unavailable'
      this.status.figmaError = figmaResult.reason instanceof Error
        ? figmaResult.reason.message
        : String(figmaResult.reason)
      process.stderr.write(`[context-mcp] Figma MCP unavailable: ${this.status.figmaError}\n`)
    } else {
      this.status.figma = 'connected'
    }

    if (storybookResult.status === 'rejected') {
      this.status.storybook = 'unavailable'
      this.status.storybookError = storybookResult.reason instanceof Error
        ? storybookResult.reason.message
        : String(storybookResult.reason)
      process.stderr.write(`[context-mcp] Storybook MCP unavailable: ${this.status.storybookError}\n`)
    } else {
      this.status.storybook = 'connected'
    }

    return this.getStatus()
  }

  private async connectFigma(config: ForgeKitContextConfig): Promise<void> {
    const { figma } = config
    const useDesktop = figma.useDesktop !== false  // default: true

    try {
      if (useDesktop) {
        this.figmaClient = await createStdioMcpClient('figma-downstream', {
          command: 'npx',
          args: ['figma-developer-mcp', '--stdio'],
          env: {
            ...process.env as Record<string, string>,
            FIGMA_ACCESS_TOKEN: figma.accessToken,
            ...(figma.fileId ? { FIGMA_FILE_ID: figma.fileId } : {}),
          },
          stderr: 'pipe',
        })
      } else {
        const remoteUrl = figma.remoteUrl ?? 'https://mcp.figma.com/v1/figma-mcp'
        this.figmaClient = await createHttpMcpClient(
          'figma-downstream',
          remoteUrl,
          { Authorization: `Bearer ${figma.accessToken}` }
        )
      }
    } catch (err) {
      throw new McpConnectionError('figma-developer-mcp', err)
    }
  }

  private async connectStorybook(config: ForgeKitContextConfig): Promise<void> {
    const { storybook } = config

    let cliPath = ''

    // Try resolving from the installed package
    try {
      const resolved = import.meta.resolve?.('forgekit-storybook-mcp')
      if (resolved) {
        const pkgDir = path.dirname(fileURLToPath(resolved))
        cliPath = path.join(pkgDir, '..', 'dist', 'cli.js')
      }
    } catch {
      // fallthrough to monorepo path
    }

    // Fallback: monorepo relative path
    if (!cliPath) {
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = path.dirname(__filename)
      cliPath = path.resolve(__dirname, '..', '..', 'storybook-mcp', 'dist', 'cli.js')
    }

    try {
      this.storybookClient = await createStdioMcpClient('storybook-downstream', {
        command: 'node',
        args: [
          cliPath,
          '--skip-init',
          ...(storybook.licenseKey ? [`--license=${storybook.licenseKey}`] : []),
        ],
        env: {
          ...process.env as Record<string, string>,
          STORYBOOK_MCP_PROJECT_ROOT: storybook.projectRoot,
          ...(storybook.licenseKey ? { STORYBOOK_MCP_LICENSE: storybook.licenseKey } : {}),
        },
        cwd: storybook.projectRoot,
        stderr: 'pipe',
      })
    } catch (err) {
      throw new McpConnectionError('forgekit-storybook-mcp', err)
    }
  }

  async callFigma(tool: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.figmaClient || this.status.figma !== 'connected') {
      throw new Error(
        `Figma MCP is unavailable${this.status.figmaError ? `: ${this.status.figmaError}` : ''}. ` +
        `Ensure FIGMA_ACCESS_TOKEN is set and figma-developer-mcp is installed.`
      )
    }
    return callTool(this.figmaClient, tool, args)
  }

  async callStorybook(tool: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.storybookClient || this.status.storybook !== 'connected') {
      throw new Error(
        `Storybook MCP is unavailable${this.status.storybookError ? `: ${this.status.storybookError}` : ''}. ` +
        `Ensure forgekit-storybook-mcp is built and accessible.`
      )
    }
    return callTool(this.storybookClient, tool, args)
  }

  getStatus(): OrchestratorStatus {
    return { ...this.status }
  }

  async disconnect(): Promise<void> {
    await Promise.allSettled([
      this.figmaClient?.close(),
      this.storybookClient?.close(),
    ])
    this.figmaClient = null
    this.storybookClient = null
  }
}
