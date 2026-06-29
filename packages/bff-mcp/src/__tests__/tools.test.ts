/**
 * MCP tool wrappers — exercised through an in-memory client/server transport
 * pair. Each test connects a fresh `McpServer` to a fresh `Client` so there's
 * no state bleed across cases.
 *
 * H-011: all three tools had zero direct end-to-end coverage before this file.
 * The tests go through the SDK so we exercise the same Zod-validation path
 * that an agent would hit at runtime (catching e.g. the `.strict()` rejections
 * Agent D added on the input schemas).
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { afterEach, describe, expect, it } from 'vitest'

import { createBffMcpServer } from '../server.js'

interface ToolCallResult {
  content: Array<{ type: string; text?: string }>
  isError?: boolean
}

/**
 * Spin up a paired client/server bound to a workspace root. Returns the
 * connected `Client` plus a `dispose()` that closes both ends.
 */
async function connectClient(
  workspaceRoot: string
): Promise<{ client: Client; dispose: () => Promise<void> }> {
  const server = createBffMcpServer({ workspaceRoot })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  const client = new Client({ name: 'bff-mcp-test', version: '0.0.0' }, { capabilities: {} })
  await client.connect(clientTransport)
  return {
    client,
    dispose: async () => {
      await client.close()
      await server.close()
    },
  }
}

async function makeTmpWorkspace(files: Record<string, string>): Promise<string> {
  const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'bff-mcp-tools-')))
  for (const [rel, contents] of Object.entries(files)) {
    const abs = path.join(dir, rel)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, contents, 'utf8')
  }
  return dir
}

let workspace: string | undefined
let dispose: (() => Promise<void>) | undefined

afterEach(async () => {
  if (dispose) {
    await dispose()
    dispose = undefined
  }
  if (workspace) {
    await fs.rm(workspace, { recursive: true, force: true })
    workspace = undefined
  }
})

describe('scan-fe-schemas tool', () => {
  it('returns a JSON ContractModel on the happy path', async () => {
    workspace = await makeTmpWorkspace({
      'src/user.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string(), name: z.string() })
      `,
    })
    const conn = await connectClient(workspace)
    dispose = conn.dispose

    const result = (await conn.client.callTool({
      name: 'scan-fe-schemas',
      arguments: { rootDir: workspace },
    })) as ToolCallResult

    expect(result.isError).toBeFalsy()
    const text = result.content[0]?.text ?? ''
    const parsed = JSON.parse(text) as {
      entities: Array<{ name: string; shape: { kind: string } }>
    }
    expect(parsed.entities.map((e) => e.name)).toEqual(['User'])
    expect(parsed.entities[0]!.shape.kind).toBe('object')
  })

  it('rejects a rootDir outside the workspace with isError=true', async () => {
    workspace = await makeTmpWorkspace({})
    const conn = await connectClient(workspace)
    dispose = conn.dispose

    const result = (await conn.client.callTool({
      name: 'scan-fe-schemas',
      arguments: { rootDir: '/etc' },
    })) as ToolCallResult

    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toContain('rootDir must be within workspace')
  })

  it('rejects an arguments object missing required rootDir', async () => {
    workspace = await makeTmpWorkspace({})
    const conn = await connectClient(workspace)
    dispose = conn.dispose

    // Cast to bypass static typing — we want to exercise the Zod-validation
    // layer that would normally catch a malformed agent payload. The SDK
    // raises an McpError on validation failure; the client rejects.
    let failed = false
    try {
      const result = (await conn.client.callTool({
        name: 'scan-fe-schemas',
        arguments: {} as unknown as { rootDir: string },
      })) as ToolCallResult
      if (result.isError === true) failed = true
    } catch {
      failed = true
    }
    expect(failed).toBe(true)
  })

  it('rejects a rootDir that escapes via ".."', async () => {
    workspace = await makeTmpWorkspace({})
    const conn = await connectClient(workspace)
    dispose = conn.dispose

    const result = (await conn.client.callTool({
      name: 'scan-fe-schemas',
      arguments: { rootDir: '../../../tmp' },
    })) as ToolCallResult

    expect(result.isError).toBe(true)
  })
})

describe('plan-bff-routes tool', () => {
  it('accepts the verbatim JSON output of scan-fe-schemas (round-trip)', async () => {
    workspace = await makeTmpWorkspace({
      'src/user.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string(), email: z.string() })
      `,
    })
    const conn = await connectClient(workspace)
    dispose = conn.dispose

    // 1. Scan.
    const scan = (await conn.client.callTool({
      name: 'scan-fe-schemas',
      arguments: { rootDir: workspace },
    })) as ToolCallResult
    expect(scan.isError).toBeFalsy()
    const contractModel = JSON.parse(scan.content[0]!.text!) as unknown

    // 2. Pass the parsed ContractModel directly into plan-bff-routes — this
    //    is the exact path an agent walks: tool output → next tool input.
    const plan = (await conn.client.callTool({
      name: 'plan-bff-routes',
      arguments: { contractModel: contractModel as Record<string, unknown> },
    })) as ToolCallResult

    expect(plan.isError).toBeFalsy()
    const parsedPlan = JSON.parse(plan.content[0]!.text!) as {
      operations: Array<{ entity: string; kind: string }>
    }
    const userOps = parsedPlan.operations.filter((o) => o.entity === 'User')
    expect(userOps).toHaveLength(5)
  })

  it('rejects a contract with unknown extra fields at the entity level (strict schemas)', async () => {
    workspace = await makeTmpWorkspace({})
    const conn = await connectClient(workspace)
    dispose = conn.dispose

    // The strict EntitySchemaRef schema (Agent D) should reject unknown keys.
    // The MCP SDK's input validation throws an McpError on Zod failure, which
    // the client surfaces by rejecting the callTool promise. We accept either
    // reject *or* isError=true so the test stays meaningful if the SDK ever
    // converts validation errors into result envelopes instead.
    const payload = {
      name: 'plan-bff-routes',
      arguments: {
        contractModel: {
          entities: [
            {
              name: 'User',
              filePath: '/x/user.ts',
              importPath: './x/user',
              shape: { kind: 'object', fields: [], hasIdField: true },
              somethingUnexpected: true,
            },
          ],
          rootDir: '/x',
          scannedAt: '2026-01-01T00:00:00.000Z',
          warnings: [],
        },
      },
    }

    let failed = false
    try {
      const result = (await conn.client.callTool(payload)) as ToolCallResult
      if (result.isError === true) failed = true
    } catch {
      failed = true
    }
    expect(failed).toBe(true)
  })

  it('passes through warnings produced by the planner', async () => {
    workspace = await makeTmpWorkspace({})
    const conn = await connectClient(workspace)
    dispose = conn.dispose

    const result = (await conn.client.callTool({
      name: 'plan-bff-routes',
      arguments: {
        contractModel: {
          entities: [
            {
              name: 'Email',
              filePath: '/x/email.ts',
              importPath: './x/email',
              shape: { kind: 'scalar' },
            },
          ],
          rootDir: '/x',
          scannedAt: '2026-01-01T00:00:00.000Z',
          warnings: [],
        },
      },
    })) as ToolCallResult

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0]!.text!) as {
      operations: unknown[]
      warnings: string[]
    }
    expect(parsed.operations).toEqual([])
    expect(parsed.warnings.some((w) => w.includes('Email'))).toBe(true)
  })
})

describe('generate-routes tool', () => {
  function makeContractAndPlan(): {
    contractModel: Record<string, unknown>
    routePlan: Record<string, unknown>
  } {
    const contractModel = {
      entities: [
        {
          name: 'User',
          filePath: '/project/src/schemas/user.ts',
          importPath: './src/schemas/user',
          shape: {
            kind: 'object',
            fields: [
              { name: 'id', optional: false, typeHint: 'string' },
              { name: 'name', optional: false, typeHint: 'string' },
            ],
            hasIdField: true,
          },
        },
      ],
      rootDir: '/project',
      scannedAt: '2026-01-01T00:00:00.000Z',
      warnings: [],
    }
    const baseOp = {
      entity: 'User',
      singularName: 'User',
      pluralName: 'Users',
      pluralKebab: 'users',
      requiresAuth: true,
    }
    const routePlan = {
      operations: [
        {
          ...baseOp,
          id: 'users.list',
          method: 'GET',
          path: '/users',
          kind: 'list',
          handlerName: 'listUsers',
        },
        {
          ...baseOp,
          id: 'users.get',
          method: 'GET',
          path: '/users/:id',
          kind: 'get',
          handlerName: 'getUser',
        },
        {
          ...baseOp,
          id: 'users.create',
          method: 'POST',
          path: '/users',
          kind: 'create',
          handlerName: 'createUser',
        },
        {
          ...baseOp,
          id: 'users.update',
          method: 'PATCH',
          path: '/users/:id',
          kind: 'update',
          handlerName: 'updateUser',
        },
        {
          ...baseOp,
          id: 'users.delete',
          method: 'DELETE',
          path: '/users/:id',
          kind: 'delete',
          handlerName: 'deleteUser',
        },
      ],
      resources: [
        {
          entityName: 'User',
          pluralName: 'Users',
          pluralKebab: 'users',
          operations: [],
        },
      ],
      conventions: { pluralize: {}, pathPrefix: '' },
      warnings: [],
    }
    return { contractModel, routePlan }
  }

  it('returns a summary with dryRun=true without writing files', async () => {
    workspace = await makeTmpWorkspace({})
    const conn = await connectClient(workspace)
    dispose = conn.dispose

    const outDir = path.join(workspace, 'apps/api/src/routes')

    const { contractModel, routePlan } = makeContractAndPlan()
    const result = (await conn.client.callTool({
      name: 'generate-routes',
      arguments: { contractModel, routePlan, outputDir: outDir, dryRun: true },
    })) as ToolCallResult

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0]!.text!) as {
      generated: number
      written: number
      files: Array<{ relativePath: string; preview?: string }>
    }
    expect(parsed.generated).toBeGreaterThan(0)
    // Every file should carry a preview when dryRun is true.
    for (const file of parsed.files) {
      expect(typeof file.preview).toBe('string')
    }

    // No files on disk.
    let written: string[] = []
    try {
      written = await fs.readdir(outDir)
    } catch {
      // Directory may not have been created at all — that's the expected
      // dryRun behavior.
    }
    expect(written).toEqual([])
  })

  it('writes files to disk when dryRun is omitted', async () => {
    workspace = await makeTmpWorkspace({})
    const conn = await connectClient(workspace)
    dispose = conn.dispose

    const outDir = path.join(workspace, 'apps/api/src/routes')

    const { contractModel, routePlan } = makeContractAndPlan()
    const result = (await conn.client.callTool({
      name: 'generate-routes',
      arguments: { contractModel, routePlan, outputDir: outDir },
    })) as ToolCallResult

    expect(result.isError).toBeFalsy()
    const parsed = JSON.parse(result.content[0]!.text!) as {
      written: number
    }
    expect(parsed.written).toBeGreaterThanOrEqual(0)

    // At least the top-level index should now exist on disk.
    const stat = await fs.stat(path.join(outDir, 'index.generated.ts'))
    expect(stat.isFile()).toBe(true)
  })
})
