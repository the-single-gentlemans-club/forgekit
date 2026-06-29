import path from 'node:path'

import {
  createMcpHttpServer,
  type McpHttpServerHandle,
  type McpHttpServerOptions,
} from '@forgekit/mcp-core'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

import { registerGenerateRoutesTool } from './tools/generate-routes.js'
import { registerPlanBffRoutesTool } from './tools/plan-bff-routes.js'
import { registerScanFeSchemasTool } from './tools/scan-fe-schemas.js'

// ────────────────────────────────────────────────────────────────────
// createBffMcpServer
// Tools land here as each step in tasks/todo.md ships:
//   Step 1: scan-fe-schemas       ← landed
//   Step 2: plan-bff-routes       ← landed
//   Step 3: generate-routes       ← landed
//   Step 4: generate-openapi      ← next
//   Step 5: generate-client-hooks
// ────────────────────────────────────────────────────────────────────

export interface CreateBffMcpServerOptions {
  /**
   * Absolute path the `scan-fe-schemas` tool is permitted to walk. The tool
   * rejects any `rootDir` argument that resolves outside this directory.
   * Defaults to `process.cwd()`.
   */
  workspaceRoot?: string
}

export function createBffMcpServer(options: CreateBffMcpServerOptions = {}): McpServer {
  const workspaceRoot = path.resolve(options.workspaceRoot ?? process.cwd())

  const server = new McpServer({
    name: 'forgekit-bff-mcp',
    version: '0.0.1',
  })

  registerScanFeSchemasTool(server, { workspaceRoot })
  registerPlanBffRoutesTool(server)
  registerGenerateRoutesTool(server)

  return server
}

// ────────────────────────────────────────────────────────────────────
// runHttpServer
// HTTP-only transport from day one. No stdio path.
// ────────────────────────────────────────────────────────────────────

export interface RunHttpServerOptions extends McpHttpServerOptions {
  /** Forwarded to `createBffMcpServer`. Defaults to `process.cwd()`. */
  workspaceRoot?: string
}

export async function runHttpServer(
  options: RunHttpServerOptions = {}
): Promise<McpHttpServerHandle> {
  const { workspaceRoot, ...httpOptions } = options
  const server = createBffMcpServer({ ...(workspaceRoot ? { workspaceRoot } : {}) })
  return createMcpHttpServer(server, httpOptions)
}
