import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  callTool,
  createHttpMcpClient,
  createStdioMcpClient,
  McpConnectionError,
} from '@forgekit/mcp-core'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'

import type { ForgeKitContextConfig } from './types.js'

export type ConnectionStatus = 'connected' | 'unavailable' | 'not-attempted'

export interface OrchestratorStatus {
  figma: ConnectionStatus
  storybook: ConnectionStatus
  figmaDev: ConnectionStatus
  figmaError?: string
  storybookError?: string
  figmaDevError?: string
}

const FIGMA_DEV_MODE_URL = 'http://127.0.0.1:3845/sse'

export class ForgeKitOrchestrator {
  private figmaClient: Client | null = null
  private figmaDevClient: Client | null = null
  private storybookClient: Client | null = null
  private status: OrchestratorStatus = {
    figma: 'not-attempted',
    storybook: 'not-attempted',
    figmaDev: 'not-attempted',
  }

  async connect(config: ForgeKitContextConfig): Promise<OrchestratorStatus> {
    const [figmaResult, storybookResult, figmaDevResult] = await Promise.allSettled([
      this.connectFigma(config),
      this.connectStorybook(config),
      this.connectFigmaDev(),
    ])

    if (figmaResult.status === 'rejected') {
      this.status.figma = 'unavailable'
      this.status.figmaError =
        figmaResult.reason instanceof Error
          ? figmaResult.reason.message
          : String(figmaResult.reason)
      process.stderr.write(`[context-mcp] Figma MCP unavailable: ${this.status.figmaError}\n`)
    } else {
      this.status.figma = 'connected'
    }

    if (storybookResult.status === 'rejected') {
      this.status.storybook = 'unavailable'
      this.status.storybookError =
        storybookResult.reason instanceof Error
          ? storybookResult.reason.message
          : String(storybookResult.reason)
      process.stderr.write(
        `[context-mcp] Storybook MCP unavailable: ${this.status.storybookError}\n`
      )
    } else {
      this.status.storybook = 'connected'
    }

    if (figmaDevResult.status === 'rejected') {
      this.status.figmaDev = 'unavailable'
      this.status.figmaDevError =
        figmaDevResult.reason instanceof Error
          ? figmaDevResult.reason.message
          : String(figmaDevResult.reason)
      process.stderr.write(
        `[context-mcp] Figma Dev Mode MCP unavailable (Figma desktop not running): ${this.status.figmaDevError}\n`
      )
    } else {
      this.status.figmaDev = 'connected'
      process.stderr.write(
        '[context-mcp] Figma Dev Mode MCP connected (Code to Canvas available)\n'
      )
    }

    return this.getStatus()
  }

  private async connectFigma(config: ForgeKitContextConfig): Promise<void> {
    const { figma } = config
    const useDesktop = figma.useDesktop !== false // default: true

    try {
      if (useDesktop) {
        this.figmaClient = await createStdioMcpClient('figma-downstream', {
          command: 'npx',
          args: ['figma-developer-mcp', '--stdio'],
          env: {
            ...(process.env as Record<string, string>),
            FIGMA_ACCESS_TOKEN: figma.accessToken,
            ...(figma.fileId ? { FIGMA_FILE_ID: figma.fileId } : {}),
          },
          stderr: 'pipe',
        })
      } else {
        const remoteUrl = figma.remoteUrl ?? 'https://mcp.figma.com/v1/figma-mcp'
        this.figmaClient = await createHttpMcpClient('figma-downstream', remoteUrl, {
          Authorization: `Bearer ${figma.accessToken}`,
        })
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
        args: [cliPath, '--skip-init'],
        env: {
          ...(process.env as Record<string, string>),
          STORYBOOK_MCP_PROJECT_ROOT: storybook.projectRoot,
        },
        cwd: storybook.projectRoot,
        stderr: 'pipe',
      })
    } catch (err) {
      throw new McpConnectionError('forgekit-storybook-mcp', err)
    }
  }

  private async connectFigmaDev(): Promise<void> {
    // Connect to Figma desktop's Dev Mode MCP server (Code to Canvas endpoint)
    // This is non-fatal — Figma desktop must be running with Dev Mode MCP enabled
    this.figmaDevClient = await createHttpMcpClient(
      'figma-dev-mode',
      FIGMA_DEV_MODE_URL
      // No auth headers — uses OAuth inside Figma desktop
    )
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

  async callFigmaDev(tool: string, args: Record<string, unknown>): Promise<unknown> {
    if (!this.figmaDevClient || this.status.figmaDev !== 'connected') {
      throw new Error(
        'Figma Dev Mode MCP is unavailable. To enable Code to Canvas:\n' +
          '  1. Open Figma desktop app\n' +
          '  2. Go to Preferences → Enable Dev Mode MCP Server\n' +
          `  3. The server should start at ${FIGMA_DEV_MODE_URL}\n` +
          '  4. Restart context-mcp\n'
      )
    }
    return callTool(this.figmaDevClient, tool, args)
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
      this.figmaDevClient?.close(),
      this.storybookClient?.close(),
    ])
    this.figmaClient = null
    this.figmaDevClient = null
    this.storybookClient = null
  }

  isFigmaDevAvailable(): boolean {
    return this.status.figmaDev === 'connected'
  }
}
