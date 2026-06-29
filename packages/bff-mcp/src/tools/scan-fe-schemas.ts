/**
 * MCP tool: `scan-fe-schemas`
 *
 * Walks a frontend codebase, discovers exported Zod schemas, returns a
 * `ContractModel`. The agent-facing entrypoint for Step 1.
 *
 * Hardening (H-002, M-007, M-011):
 *   - `rootDir` must resolve to a path *inside* `workspaceRoot`. Anything
 *     outside is rejected with an MCP error envelope. This prevents an agent
 *     (or a prompt-injected one, or a malicious HTTP caller) from pointing
 *     the scanner at `/etc`, `~/.ssh`, etc.
 *   - The scanner itself is bounded by file count, byte budget, and wall-clock
 *     timeout — surfaced as `warnings`, not exceptions.
 *   - Catch-block errors are classified and sanitized so we don't echo raw
 *     filesystem paths back to the caller.
 */

import path from 'node:path'

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { scanFeSchemas } from '../scanner/zod-scanner.js'

export interface ScanFeSchemasToolOptions {
  /** Absolute path the scanner must stay within. Required. */
  workspaceRoot: string
}

const inputSchema = {
  rootDir: z
    .string()
    .describe(
      'Absolute or workspace-relative path to the directory to scan ' +
        '(e.g. "/Users/me/myapp/src/schemas"). Must resolve to a path ' +
        'inside the configured workspace root.'
    ),
  include: z
    .array(z.string())
    .optional()
    .describe(
      'Glob patterns (relative to rootDir) for files to scan. ' +
        'Defaults to **/*.{ts,tsx}.'
    ),
  exclude: z
    .array(z.string())
    .optional()
    .describe(
      'Glob patterns to exclude. Defaults exclude node_modules, dist, build, ' +
        '.generated.ts, and test files.'
    ),
  maxFiles: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum number of files the scanner will load. Defaults to 5000.'),
  maxTotalBytes: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Maximum cumulative source bytes the scanner will read. Defaults to 100 MB.'),
  timeoutMs: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Wall-clock timeout in milliseconds. Defaults to 30 000 (30 s).'),
}

export function registerScanFeSchemasTool(
  server: McpServer,
  options: ScanFeSchemasToolOptions
): void {
  const workspaceRoot = path.resolve(options.workspaceRoot)

  server.tool('scan-fe-schemas', inputSchema, async (args) => {
    // ── Workspace containment check ───────────────────────────────────
    const resolvedRoot = path.resolve(workspaceRoot, args.rootDir)
    const rel = path.relative(workspaceRoot, resolvedRoot)
    const isOutside = rel.startsWith('..') || path.isAbsolute(rel)
    if (isOutside) {
      return {
        content: [
          {
            type: 'text',
            text: `rootDir must be within workspace: ${workspaceRoot}`,
          },
        ],
        isError: true,
      }
    }

    try {
      const model = await scanFeSchemas({
        rootDir: resolvedRoot,
        include: args.include,
        exclude: args.exclude,
        workspaceRoot,
        ...(args.maxFiles !== undefined ? { maxFiles: args.maxFiles } : {}),
        ...(args.maxTotalBytes !== undefined ? { maxTotalBytes: args.maxTotalBytes } : {}),
        ...(args.timeoutMs !== undefined ? { timeoutMs: args.timeoutMs } : {}),
      })

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(model, null, 2),
          },
        ],
      }
    } catch (err) {
      return {
        content: [
          {
            type: 'text',
            text: classifyScanError(err),
          },
        ],
        isError: true,
      }
    }
  })
}

/**
 * Classifies a thrown error into a caller-safe message. Anything we don't
 * recognise becomes a generic "internal error" and the raw stack is logged
 * server-side only.
 */
function classifyScanError(err: unknown): string {
  if (err && typeof err === 'object') {
    const code = (err as { code?: unknown }).code
    if (typeof code === 'string') {
      if (code === 'ENOENT' || code === 'EACCES' || code === 'ENOTDIR' || code === 'EPERM') {
        return `Failed to scan: filesystem error (code: ${code})`
      }
    }
    if (err instanceof RangeError) {
      return 'Failed to scan: path length exceeded the platform limit'
    }
  }

  // Unknown — keep details server-side; surface a generic envelope.
  process.stderr.write(
    `[bff-mcp] scan-fe-schemas internal error: ${
      err instanceof Error ? err.stack ?? err.message : String(err)
    }\n`
  )
  return 'Failed to scan: internal error'
}
