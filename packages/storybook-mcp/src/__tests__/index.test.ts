/** biome-ignore-all lint/style/noNonNullAssertion: <explanation> */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'

import * as tools from '../tools.js'
import type { StorybookMCPConfig } from '../types.js'
import { createStorybookMCPServer } from '../index.js'

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  const setRequestHandler = vi.fn()
  function MockServer() {
    return { setRequestHandler }
  }
  const Server = vi.fn(MockServer)
  return { Server }
})

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}))

vi.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema: 'ListToolsSchema',
  CallToolRequestSchema: 'CallToolSchema',
  ListResourcesRequestSchema: 'ListResourcesSchema',
  ReadResourceRequestSchema: 'ReadResourceSchema',
}))

vi.mock('../tools.js', () => ({
  listComponents: vi.fn(() => 'LC_RESULT'),
  analyzeComponentTool: vi.fn(() => 'ANALYZE_RESULT'),
  generateStoryTool: vi.fn(() => 'GEN_STORY_RESULT'),
  updateStoryTool: vi.fn(() => 'UPDATE_STORY_RESULT'),
  validateStoryTool: vi.fn(() => 'VALIDATE_STORY_RESULT'),
  getStoryTemplate: vi.fn(() => 'TEMPLATE_RESULT'),
  listTemplates: vi.fn(() => 'TEMPLATES_RESULT'),
  getComponentCoverage: vi.fn(() => 'COVERAGE_RESULT'),
  suggestStories: vi.fn(() => 'SUGGEST_RESULT'),
  syncAll: vi.fn(() => 'SYNC_ALL_RESULT'),
  syncComponentTool: vi.fn(() => 'SYNC_COMP_RESULT'),
  generateTestTool: vi.fn(() => 'GEN_TEST_RESULT'),
  generateDocsTool: vi.fn(() => 'GEN_DOCS_RESULT'),
  generateCodeConnectTool: vi.fn(() => 'GEN_CODE_CONNECT_RESULT'),
  checkHealthTool: vi.fn(() => 'HEALTH_RESULT'),
}))

function makeConfig(): StorybookMCPConfig {
  return {
    rootDir: '/tmp/project',
    libraries: [{ name: 'ui', path: 'src/components', storyTitlePrefix: 'UI' }],
    framework: 'vanilla',
    storyFilePattern: '**/*.stories.{ts,tsx}',
    componentPatterns: ['**/*.tsx'],
    excludePatterns: ['**/node_modules/**'],
  }
}

describe('createStorybookMCPServer', () => {
  let config: StorybookMCPConfig
  let mockServerInstance: { setRequestHandler: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    vi.clearAllMocks()
    config = makeConfig()
    createStorybookMCPServer(config)
    expect(Server).toHaveBeenCalledTimes(1)
    mockServerInstance = vi.mocked(Server).mock.results[0]?.value as {
      setRequestHandler: ReturnType<typeof vi.fn>
    }
  })

  it('constructs Server with the correct name, version, and capabilities', () => {
    expect(Server).toHaveBeenCalledWith(
      { name: 'storybook-mcp', version: '0.1.0' },
      { capabilities: { tools: {}, resources: {} } }
    )
  })

  it('registers exactly four request handlers', () => {
    expect(mockServerInstance.setRequestHandler).toHaveBeenCalledTimes(4)
  })

  it('ListTools handler returns the hard-coded tool list', async () => {
    const call = mockServerInstance.setRequestHandler.mock.calls.find(
      ([schema]) => schema === ListToolsRequestSchema
    )!
    const handler = call[1] as () => Promise<{ tools: { name: string }[] }>
    const res = await handler()
    expect(res).toHaveProperty('tools')
    expect(Array.isArray(res.tools)).toBe(true)
    const names = res.tools.map((t) => t.name)
    expect(names).toEqual(
      expect.arrayContaining([
        'list_components',
        'analyze_component',
        'generate_story',
        'update_story',
        'validate_story',
        'get_story_template',
        'list_templates',
        'get_component_coverage',
        'suggest_stories',
        'sync_all',
        'sync_component',
        'generate_test',
        'generate_docs',
        'generate_code_connect',
        'check_health',
      ])
    )
  })

  it('CallTool handler invokes the correct tool and wraps its result', async () => {
    const call = mockServerInstance.setRequestHandler.mock.calls.find(
      ([schema]) => schema === CallToolRequestSchema
    )!
    const handler = call[1] as (req: {
      params: { name: string; arguments: Record<string, unknown> }
    }) => Promise<{ content: { type: string; text: string }[]; isError?: boolean }>

    const req = {
      params: {
        name: 'list_components',
        arguments: { foo: 'bar' },
      },
    }
    const out = await handler(req)
    expect(tools.listComponents).toHaveBeenCalledWith(config, req.params.arguments)
    expect(out).toEqual({
      content: [{ type: 'text', text: JSON.stringify('LC_RESULT', null, 2) }],
    })

    const bad = await handler({
      params: { name: 'does_not_exist', arguments: {} },
    })
    expect(bad).toEqual({
      isError: true,
      content: [
        {
          type: 'text',
          text: JSON.stringify({ error: 'Unknown tool: does_not_exist' }),
        },
      ],
    })
  })

  it('ListResources handler returns the three resource URIs', async () => {
    const call = mockServerInstance.setRequestHandler.mock.calls.find(
      ([schema]) => schema === ListResourcesRequestSchema
    )!
    const handler = call[1] as () => Promise<{ resources: { uri: string }[] }>
    const res = await handler()
    expect(res).toHaveProperty('resources')
    const uris = res.resources.map((r) => r.uri)
    expect(uris).toEqual(
      expect.arrayContaining([
        'storybook://libraries',
        'storybook://patterns',
        'storybook://config',
      ])
    )
  })

  describe('ReadResource handler', () => {
    let handler: (req: {
      params: { uri: string }
    }) => Promise<{ contents: { uri: string; mimeType: string; text: string }[] }>

    beforeEach(() => {
      const call = mockServerInstance.setRequestHandler.mock.calls.find(
        ([schema]) => schema === ReadResourceRequestSchema
      )!
      handler = call[1] as typeof handler
    })

    it('returns JSON of config.libraries for storybook://libraries', async () => {
      const res = await handler({ params: { uri: 'storybook://libraries' } })
      expect(res).toEqual({
        contents: [
          {
            uri: 'storybook://libraries',
            mimeType: 'application/json',
            text: JSON.stringify(config.libraries, null, 2),
          },
        ],
      })
    })

    it('returns the patterns markdown for storybook://patterns', async () => {
      const res = await handler({ params: { uri: 'storybook://patterns' } })
      expect(res).toHaveProperty('contents')
      const c = res.contents[0]
      expect(c.uri).toBe('storybook://patterns')
      expect(c.mimeType).toBe('text/markdown')
      expect(c.text).toContain('# Storybook Patterns')
    })

    it('returns JSON of full config for storybook://config', async () => {
      const res = await handler({ params: { uri: 'storybook://config' } })
      expect(res).toEqual({
        contents: [
          {
            uri: 'storybook://config',
            mimeType: 'application/json',
            text: JSON.stringify(config, null, 2),
          },
        ],
      })
    })

    it('throws on unknown URI', async () => {
      await expect(handler({ params: { uri: 'unknown://uri' } })).rejects.toThrow(
        'Unknown resource: unknown://uri'
      )
    })
  })
})
