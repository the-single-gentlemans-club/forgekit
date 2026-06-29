/**
 * createBffMcpServer — boots an MCP server and registers the three tools.
 *
 * H-016: these wiring assertions were missing. Each tool is verified to be
 * listed by the SDK's `tools/list` endpoint via an in-memory client, and the
 * workspaceRoot threading is verified by issuing a scan that *should* be
 * rejected from inside the configured workspace root.
 *
 * (cli.ts is intentionally not tested here — it's a thin argv parser whose
 * only behavior is to read env / argv and invoke `runHttpServer`. The HTTP
 * transport itself is covered by `@forgekit/mcp-core`. Adding a cli test
 * would require process.argv manipulation with low payoff; we accept this
 * gap and recommend revisiting if cli grows logic.)
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

async function makeWorkspace(): Promise<string> {
  return await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), 'bff-mcp-server-'))
  )
}

async function connect(
  workspaceRoot: string
): Promise<{ client: Client; dispose: () => Promise<void> }> {
  const server = createBffMcpServer({ workspaceRoot })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
  await server.connect(serverTransport)
  const client = new Client(
    { name: 'bff-mcp-server-test', version: '0.0.0' },
    { capabilities: {} }
  )
  await client.connect(clientTransport)
  return {
    client,
    dispose: async () => {
      await client.close()
      await server.close()
    },
  }
}

describe('createBffMcpServer', () => {
  it('registers the three expected tools', async () => {
    workspace = await makeWorkspace()
    const conn = await connect(workspace)
    dispose = conn.dispose

    const list = await conn.client.listTools()
    const names = list.tools.map((t) => t.name).sort()
    expect(names).toEqual(['generate-routes', 'plan-bff-routes', 'scan-fe-schemas'])
  })

  it('threads workspaceRoot into the scan-fe-schemas tool', async () => {
    // Build two adjacent workspaces. Configure the server with workspace A
    // and try to scan workspace B — should be rejected.
    const workspaceA = await makeWorkspace()
    workspace = workspaceA // ensures cleanup
    const workspaceBParent = await fs.realpath(
      await fs.mkdtemp(path.join(os.tmpdir(), 'bff-mcp-server-other-'))
    )

    try {
      const conn = await connect(workspaceA)
      dispose = conn.dispose

      const result = (await conn.client.callTool({
        name: 'scan-fe-schemas',
        arguments: { rootDir: workspaceBParent },
      })) as ToolCallResult

      expect(result.isError).toBe(true)
      expect(result.content[0]!.text!).toContain('rootDir must be within workspace')
    } finally {
      await fs.rm(workspaceBParent, { recursive: true, force: true })
    }
  })

  it('defaults workspaceRoot to process.cwd() when not supplied', async () => {
    // We can't easily flip cwd, but we can at least verify that constructing
    // the server with no options doesn't throw and that the tool listing
    // still surfaces the expected names.
    const server = createBffMcpServer()
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    const client = new Client(
      { name: 'cwd-default-test', version: '0.0.0' },
      { capabilities: {} }
    )
    await client.connect(clientTransport)
    try {
      const list = await client.listTools()
      expect(list.tools.map((t) => t.name).sort()).toEqual([
        'generate-routes',
        'plan-bff-routes',
        'scan-fe-schemas',
      ])
    } finally {
      await client.close()
      await server.close()
    }
  })
})
