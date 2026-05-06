# @forgekit/mcp-core

> Shared MCP client factories and utilities for the ForgeKit MCP ecosystem.

This internal library provides the transport layer that `forgekit-context` uses to connect to downstream MCP servers (Figma, Storybook). It is not published to npm — it is a monorepo-internal package consumed by `forgekit-context`.

## API

### `createStdioMcpClient(clientName, params)`

Spawns a subprocess and connects via stdio transport. Used for `figma-developer-mcp` and `forgekit-storybook-mcp`.

```typescript
import { createStdioMcpClient } from '@forgekit/mcp-core'

const client = await createStdioMcpClient('figma', {
  command: 'npx',
  args: ['figma-developer-mcp', '--stdio'],
  env: { FIGMA_ACCESS_TOKEN: process.env.FIGMA_ACCESS_TOKEN },
  stderr: 'pipe', // prevents subprocess stderr from corrupting parent stdio
})
```

### `createHttpMcpClient(clientName, url, headers?)`

Connects to a remote MCP server via `StreamableHTTPClientTransport` (SDK 1.26.0+). Used for the Figma desktop Dev Mode MCP server.

```typescript
import { createHttpMcpClient } from '@forgekit/mcp-core'

const client = await createHttpMcpClient('figma-dev-mode', 'http://127.0.0.1:3845/sse')
```

> **Note:** `SSEClientTransport` is deprecated in SDK 1.26.0. This package uses `StreamableHTTPClientTransport` exclusively.

### `callTool(client, name, args)`

Type-safe wrapper around `client.callTool`. Extracts `content[0].text`, parses JSON, and throws a typed `McpToolError` if the response contains `isError: true`.

```typescript
import { callTool } from '@forgekit/mcp-core'

const result = await callTool(client, 'list_components', { library: 'ui' })
```

### `mergeSummaries(...strings)`

Joins non-empty summary strings with a newline separator. Used by orchestrator tools to combine partial results.

### Error classes

| Class                | When thrown                                                      |
| -------------------- | ---------------------------------------------------------------- |
| `McpToolError`       | Tool returned `isError: true`. Has `toolName` field.             |
| `McpConnectionError` | Client unavailable or connection failed. Has `serverName` field. |

## Development

```bash
# Build
npx nx build @forgekit/mcp-core

# Test
NODE_ENV=development npx nx test @forgekit/mcp-core
```

## Used by

- [`forgekit-context`](../context-mcp/README.md) — imports all four exports
