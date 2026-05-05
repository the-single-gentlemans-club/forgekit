Below is a Jest test suite that verifies that createStorybookMCPServer correctly registers all four handlers, and that each handler behaves as expected. It mocks out the MCP Server, transport, schemas, and all tool functions so you can test in isolation.

File: index.test.ts

```ts
// Mocks for the MCP SDK server and schemas
jest.mock('@modelcontextprotocol/sdk/server/index.js', () => {
  const setRequestHandler = jest.fn()
  const Server = jest.fn().mockImplementation(() => ({
    setRequestHandler,
  }))
  return { Server }
})

jest.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: jest.fn(),
}))

jest.mock('@modelcontextprotocol/sdk/types.js', () => ({
  ListToolsRequestSchema:   'ListToolsSchema',
  CallToolRequestSchema:    'CallToolSchema',
  ListResourcesRequestSchema: 'ListResourcesSchema',
  ReadResourceRequestSchema:  'ReadResourceSchema',
}))

// Mock all of our tool implementations
jest.mock('./tools.js', () => ({
  listComponents: jest.fn(() => 'LC_RESULT'),
  analyzeComponentTool: jest.fn(() => 'ANALYZE_RESULT'),
  generateStoryTool:    jest.fn(() => 'GEN_STORY_RESULT'),
  updateStoryTool:      jest.fn(() => 'UPDATE_STORY_RESULT'),
  validateStoryTool:    jest.fn(() => 'VALIDATE_STORY_RESULT'),
  getStoryTemplate:     jest.fn(() => 'TEMPLATE_RESULT'),
  listTemplates:        jest.fn(() => 'TEMPLATES_RESULT'),
  getComponentCoverage: jest.fn(() => 'COVERAGE_RESULT'),
  suggestStories:      jest.fn(() => 'SUGGEST_RESULT'),
  syncAll:             jest.fn(() => 'SYNC_ALL_RESULT'),
  syncComponentTool:   jest.fn(() => 'SYNC_COMP_RESULT'),
  generateTestTool:    jest.fn(() => 'GEN_TEST_RESULT'),
  generateDocsTool:    jest.fn(() => 'GEN_DOCS_RESULT'),
  generateCodeConnectTool: jest.fn(() => 'GEN_CODE_CONNECT_RESULT'),
  checkHealthTool:     jest.fn(() => 'HEALTH_RESULT'),
}))

// Now import under test
import { createStorybookMCPServer } from './index'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import * as tools from './tools.js'

describe('createStorybookMCPServer', () => {
  let config: any
  let server: any
  let mockServerInstance: { setRequestHandler: jest.Mock }

  beforeEach(() => {
    jest.clearAllMocks()
    config = { libraries: { ui: { rootDir: './ui' } } }
    server = createStorybookMCPServer(config)
    // Grab the one-and-only Server instance we constructed
    expect(Server).toHaveBeenCalledTimes(1)
    mockServerInstance = Server.mock.results[0].value
  })

  it('constructs Server with the correct name, version, and empty capabilities', () => {
    expect(Server).toHaveBeenCalledWith(
      { name: 'storybook-mcp', version: '0.1.0' },
      { capabilities: { tools: {}, resources: {} } }
    )
  })

  it('registers exactly four request handlers', () => {
    // ListTools, CallTool, ListResources, ReadResource
    expect(mockServerInstance.setRequestHandler).toHaveBeenCalledTimes(4)
  })

  it('ListTools handler returns the hard-coded tool list', async () => {
    // find the handler registered under ListToolsRequestSchema
    const call = mockServerInstance.setRequestHandler.mock.calls.find(
      ([schema]) => schema === ListToolsRequestSchema
    )!
    const handler = call[1] as () => Promise<any>
    const res = await handler()
    expect(res).toHaveProperty('tools')
    expect(Array.isArray(res.tools)).toBe(true)
    // check first few tools by name
    const names = res.tools.map((t: any) => t.name)
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
    const handler = call[1] as (req: any) => Promise<any>

    // Example: list_components
    const req = {
      params: {
        name: 'list_components',
        arguments: { foo: 'bar' },
      },
    }
    const out = await handler(req)
    // our mock listComponents returns 'LC_RESULT'
    expect(tools.listComponents).toHaveBeenCalledWith(config, req.params.arguments)
    expect(out).toEqual({
      content: [{ type: 'text', text: JSON.stringify('LC_RESULT', null, 2) }],
    })

    // Unknown tool
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
    const handler = call[1] as () => Promise<any>
    const res = await handler()
    expect(res).toHaveProperty('resources')
    const uris = res.resources.map((r: any) => r.uri)
    expect(uris).toEqual(expect.arrayContaining([
      'storybook://libraries',
      'storybook://patterns',
      'storybook://config',
    ]))
  })

  describe('ReadResource handler', () => {
    let handler: (req: any) => Promise<any>
    beforeEach(() => {
      const call = mockServerInstance.setRequestHandler.mock.calls.find(
        ([schema]) => schema === ReadResourceRequestSchema
      )!
      handler = call[1] as any
    })

    it('returns JSON of config.libraries for storybook://libraries', async () => {
      const res = await handler({ params: { uri: 'storybook://libraries' } })
      expect(res).toEqual({
        contents: [{
          uri: 'storybook://libraries',
          mimeType: 'application/json',
          text: JSON.stringify(config.libraries, null, 2),
        }],
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
        contents: [{
          uri: 'storybook://config',
          mimeType: 'application/json',
          text: JSON.stringify(config, null, 2),
        }],
      })
    })

    it('throws on unknown URI', async () => {
      await expect(
        handler({ params: { uri: 'unknown://uri' } })
      ).rejects.toThrow('Unknown resource: unknown://uri')
    })
  })
})
```

Explanation of the mocks and key assertions:

• We mock out the MCP `Server` class so that its constructor and `setRequestHandler` calls are fully observable.  
• We stub each tool in `./tools.js` to return a simple string so we can assert that each branch in the CallTool handler is wired correctly.  
• We mock the four request‐schema objects as simple strings so that the identity checks in the handler registration can be asserted.  
• We verify:  
  - the `Server` constructor receives the correct `name`, `version`, and empty `capabilities` object  
  - exactly four handlers are registered (ListTools, CallTool, ListResources, ReadResource)  
  - the ListTools handler returns an array containing all of our defined tool names  
  - the CallTool handler invokes the right stub and correctly wraps both success and unknown‐tool errors  
  - the ListResources handler enumerates the three URIs  
  - the ReadResource handler returns the expected JSON or markdown, and throws on an unknown URI.