import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock mcp-core to prevent any subprocess spawning
vi.mock('@forgekit/mcp-core', () => ({
  createStdioMcpClient: vi.fn(),
  createHttpMcpClient: vi.fn(),
  callTool: vi.fn(),
  McpConnectionError: class McpConnectionError extends Error {
    constructor(public readonly serverName: string, cause: unknown) {
      super(`Failed to connect to ${serverName}: ${cause}`)
    }
  },
}))

import { ForgeKitOrchestrator } from '../orchestrator.js'
import type { ForgeKitContextConfig } from '../types.js'
import * as mcpCore from '@forgekit/mcp-core'

const BASE_CONFIG: ForgeKitContextConfig = {
  figma: { accessToken: 'test-token', fileId: 'file-id', useDesktop: true },
  storybook: { projectRoot: '/tmp/project', libraries: [] },
  outputDir: '.forgekit',
}

describe('ForgeKitOrchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sets both statuses to unavailable when connections fail', async () => {
    vi.mocked(mcpCore.createStdioMcpClient).mockRejectedValue(new Error('spawn ENOENT'))

    const orchestrator = new ForgeKitOrchestrator()
    const status = await orchestrator.connect(BASE_CONFIG)

    expect(status.figma).toBe('unavailable')
    expect(status.storybook).toBe('unavailable')
  })

  it('sets figma to connected and storybook to unavailable when only figma succeeds', async () => {
    const mockFigmaClient = { callTool: vi.fn(), close: vi.fn() }

    vi.mocked(mcpCore.createStdioMcpClient)
      .mockResolvedValueOnce(mockFigmaClient as never) // figma
      .mockRejectedValueOnce(new Error('spawn ENOENT')) // storybook

    const orchestrator = new ForgeKitOrchestrator()
    const status = await orchestrator.connect(BASE_CONFIG)

    expect(status.figma).toBe('connected')
    expect(status.storybook).toBe('unavailable')
  })

  it('throws when callFigma is called and figma is unavailable', async () => {
    vi.mocked(mcpCore.createStdioMcpClient).mockRejectedValue(new Error('no figma'))

    const orchestrator = new ForgeKitOrchestrator()
    await orchestrator.connect(BASE_CONFIG)

    await expect(orchestrator.callFigma('get_variable_defs', {})).rejects.toThrow(
      /Figma MCP is unavailable/i
    )
  })

  it('throws when callStorybook is called and storybook is unavailable', async () => {
    vi.mocked(mcpCore.createStdioMcpClient).mockRejectedValue(new Error('no storybook'))

    const orchestrator = new ForgeKitOrchestrator()
    await orchestrator.connect(BASE_CONFIG)

    await expect(orchestrator.callStorybook('list_components', {})).rejects.toThrow(
      /Storybook MCP is unavailable/i
    )
  })

  it('callFigma delegates to callTool when connected', async () => {
    const mockClient = { close: vi.fn() }
    vi.mocked(mcpCore.createStdioMcpClient).mockResolvedValue(mockClient as never)
    vi.mocked(mcpCore.callTool).mockResolvedValue({ tokens: [] })

    const orchestrator = new ForgeKitOrchestrator()
    await orchestrator.connect(BASE_CONFIG)

    const result = await orchestrator.callFigma('get_variable_defs', {})
    expect(result).toEqual({ tokens: [] })
    expect(mcpCore.callTool).toHaveBeenCalledWith(mockClient, 'get_variable_defs', {})
  })

  it('getStatus returns a copy that cannot mutate internal state', async () => {
    vi.mocked(mcpCore.createStdioMcpClient).mockRejectedValue(new Error('fail'))

    const orchestrator = new ForgeKitOrchestrator()
    await orchestrator.connect(BASE_CONFIG)

    const status = orchestrator.getStatus()
    ;(status as Record<string, string>).figma = 'connected' // mutate copy

    expect(orchestrator.getStatus().figma).toBe('unavailable')
  })
})
