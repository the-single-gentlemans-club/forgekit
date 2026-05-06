import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import type { StdioServerParameters } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

// -----------------------------------------------
// Content types from MCP tool call responses
// -----------------------------------------------
export interface McpTextContent {
  type: 'text'
  text: string
}

// -----------------------------------------------
// createStdioMcpClient
// Spawns a subprocess and connects via stdio transport
// -----------------------------------------------
export async function createStdioMcpClient(
  clientName: string,
  params: StdioServerParameters
): Promise<Client> {
  const transport = new StdioClientTransport(params)
  const client = new Client({ name: clientName, version: '0.1.0' }, { capabilities: {} })
  await client.connect(transport)
  return client
}

// -----------------------------------------------
// createHttpMcpClient
// Connects via StreamableHTTP transport (remote MCP servers)
// Note: SSEClientTransport is deprecated in SDK 1.26.0
// -----------------------------------------------
export async function createHttpMcpClient(
  clientName: string,
  url: string,
  headers?: Record<string, string>
): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: headers ?? {} },
  })
  const client = new Client({ name: clientName, version: '0.1.0' }, { capabilities: {} })
  await client.connect(transport)
  return client
}

// -----------------------------------------------
// callTool
// Type-safe wrapper: extracts text content, parses JSON,
// throws McpToolError if the tool returns isError: true
// -----------------------------------------------
export async function callTool(
  client: Client,
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  const result = await client.callTool({ name, arguments: args })

  if (result.isError === true) {
    const errText = extractText(result.content as McpTextContent[])
    throw new McpToolError(name, errText)
  }

  const text = extractText(result.content as McpTextContent[])

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// -----------------------------------------------
// extractText — pull first text item from MCP content array
// -----------------------------------------------
function extractText(content: McpTextContent[]): string {
  const textContent = content?.find((c) => c.type === 'text')
  return textContent?.text ?? ''
}

// -----------------------------------------------
// mergeSummaries — join non-empty summary strings
// -----------------------------------------------
export function mergeSummaries(...summaries: (string | undefined)[]): string {
  return summaries.filter(Boolean).join(' | ')
}

// -----------------------------------------------
// McpToolError — thrown when a tool call returns isError
// -----------------------------------------------
export class McpToolError extends Error {
  constructor(
    public readonly toolName: string,
    message: string
  ) {
    super(`MCP tool '${toolName}' failed: ${message}`)
    this.name = 'McpToolError'
  }
}

// -----------------------------------------------
// McpConnectionError — thrown when a client fails to connect
// -----------------------------------------------
export class McpConnectionError extends Error {
  constructor(
    public readonly serverName: string,
    cause: unknown
  ) {
    const msg = cause instanceof Error ? cause.message : String(cause)
    super(`Failed to connect to MCP server '${serverName}': ${msg}`)
    this.name = 'McpConnectionError'
    if (cause instanceof Error) this.cause = cause
  }
}
