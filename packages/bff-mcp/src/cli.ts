#!/usr/bin/env node
/**
 * @forgekit/bff-mcp CLI
 *
 * MCP server: FE schemas → BFF endpoints (Hono + Zod + OpenAPI + TanStack Query).
 * HTTP-only transport — no stdio path.
 *
 * Usage:
 *   npx forgekit-bff [options]
 *
 * Add to Claude Desktop / Claude Code mcp settings (after running --http):
 *   {
 *     "mcpServers": {
 *       "forgekit-bff": {
 *         "url": "http://127.0.0.1:3003/mcp"
 *       }
 *     }
 *   }
 */
import 'dotenv/config'

import path from 'node:path'

import { runHttpServer } from './server.js'

const args = process.argv.slice(2)

function getArg(flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx > -1) return args[idx + 1]
  const eq = args.find((a) => a.startsWith(`${flag}=`))
  return eq ? eq.slice(flag.length + 1) : undefined
}

function showHelp(): void {
  process.stdout.write(`
forgekit-bff-mcp — MCP server: FE schemas → BFF endpoints (Hono + Zod + OpenAPI + TanStack Query)

USAGE:
  npx forgekit-bff [options]

OPTIONS:
  --port=PORT          HTTP port (default: PORT env or 3003)
  --host=HOST          HTTP bind host (default: 127.0.0.1)
  --workspace=PATH     Absolute workspace root the scanner is permitted to walk
                       (default: current working directory). The scan-fe-schemas
                       tool refuses any rootDir that resolves outside this path.
  -h, --help           Show this help

TOOLS EXPOSED (v0.1 — under active development, see tasks/todo.md):
  scan-fe-schemas         Walk a directory, find exported Zod schemas, return a contract model
  plan-bff-routes         Take a contract model, return a route plan (CRUD + computed views)
  generate-routes         Emit Hono route files from a route plan
  generate-openapi        Emit an OpenAPI 3.1 spec from the contract model
  generate-client-hooks   Emit TanStack Query hooks + cache keys for the FE
`)
}

function isLoopback(host: string | undefined): boolean {
  if (!host) return true
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') return true
  return false
}

async function main(): Promise<void> {
  if (args.includes('--help') || args.includes('-h')) {
    showHelp()
    process.exit(0)
  }

  const portRaw = getArg('--port')
  const port = portRaw ? Number(portRaw) : Number(process.env['PORT'] ?? 3003)
  const host = getArg('--host')

  if (host && !isLoopback(host)) {
    process.stderr.write(
      `[bff-mcp] WARNING: --host is set to "${host}", a non-loopback interface. ` +
        `The MCP server will refuse to listen on a public interface unless ` +
        `authentication is configured. Use --host=127.0.0.1 (default) for local-only access.\n`
    )
  }

  const workspaceArg = getArg('--workspace')
  const workspaceRoot = path.resolve(workspaceArg ?? process.cwd())

  const handle = await runHttpServer({
    port,
    ...(host ? { host } : {}),
    workspaceRoot,
  })
  process.stderr.write(
    `[bff-mcp] HTTP endpoint ready at ${handle.url}\n` +
      `[bff-mcp] Scanner workspace root: ${workspaceRoot}\n` +
      `[bff-mcp] Press Ctrl+C to stop.\n`
  )

  const shutdown = async (): Promise<void> => {
    process.stderr.write('\n[bff-mcp] Shutting down...\n')
    await handle.close()
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((err: unknown) => {
  process.stderr.write(`[bff-mcp] Fatal error: ${err instanceof Error ? err.message : String(err)}\n`)
  process.exit(1)
})
