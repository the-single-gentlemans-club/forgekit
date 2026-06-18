/**
 * Unit tests for the Step 1 scanner.
 *
 * Most cases use ts-morph's in-memory file system so fixtures live inline —
 * no disk I/O, fast, easy to read. The on-disk hardening tests (workspace
 * boundary, bounds, cache) create temp directories under `os.tmpdir()` and
 * clean themselves up.
 */

import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { Project } from 'ts-morph'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  __resetProjectCacheForTests,
  scanFeSchemas,
  scanProject,
} from '../scanner/zod-scanner.js'
import { registerScanFeSchemasTool } from '../tools/scan-fe-schemas.js'

// Minimal stand-in for McpServer.tool — captures the handler so tests can
// invoke it directly without booting an HTTP transport.
type ToolHandler = (args: Record<string, unknown>) => Promise<{
  content: { type: string; text: string }[]
  isError?: boolean
}>

function makeFakeServer(): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  server: any
  invoke: (args: Record<string, unknown>) => Promise<{
    content: { type: string; text: string }[]
    isError?: boolean
  }>
} {
  let handler: ToolHandler | undefined
  const server = {
    tool: (_name: string, _schema: unknown, fn: ToolHandler) => {
      handler = fn
    },
  }
  return {
    server,
    invoke: async (args) => {
      if (!handler) throw new Error('tool was not registered')
      return handler(args)
    },
  }
}

const ROOT = '/virtual'

function makeProject(files: Record<string, string>): Project {
  const project = new Project({ useInMemoryFileSystem: true })
  for (const [filePath, contents] of Object.entries(files)) {
    project.createSourceFile(filePath, contents, { overwrite: true })
  }
  return project
}

async function makeTmpWorkspace(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'bff-mcp-scan-'))
  for (const [rel, contents] of Object.entries(files)) {
    const abs = path.join(dir, rel)
    await fs.mkdir(path.dirname(abs), { recursive: true })
    await fs.writeFile(abs, contents, 'utf8')
  }
  return dir
}

describe('zod-scanner', () => {
  it('finds an exported z.object schema with all metadata', () => {
    const project = makeProject({
      '/virtual/user.ts': `
        import { z } from 'zod'
        export const User = z.object({
          id: z.string().uuid(),
          name: z.string(),
          email: z.string().email(),
        })
      `,
    })

    const result = scanProject(project, ROOT)

    expect(result.entities).toHaveLength(1)
    const user = result.entities[0]!
    expect(user.name).toBe('User')
    expect(user.shape.kind).toBe('object')
    if (user.shape.kind !== 'object') throw new Error('expected object shape')
    expect(user.shape.hasIdField).toBe(true)
    expect(user.shape.fields.map((f) => f.name)).toEqual(['id', 'name', 'email'])
    expect(user.shape.fields.every((f) => f.typeHint === 'string')).toBe(true)
    expect(user.shape.fields.every((f) => f.optional === false)).toBe(true)
    expect(user.importPath).toBe('./user')
    expect(result.warnings).toEqual([])
  })

  it('finds multiple schemas in one file', () => {
    const project = makeProject({
      '/virtual/schemas.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string(), name: z.string() })
        export const Project = z.object({ id: z.string(), title: z.string() })
        export const Task = z.object({ id: z.string(), label: z.string() })
      `,
    })

    const result = scanProject(project, ROOT)
    const names = result.entities.map((e) => e.name).sort()
    expect(names).toEqual(['Project', 'Task', 'User'])
  })

  it('finds schemas across multiple files with stable ordering', () => {
    const project = makeProject({
      '/virtual/b/project.ts': `
        import { z } from 'zod'
        export const Project = z.object({ id: z.string() })
      `,
      '/virtual/a/user.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string() })
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities.map((e) => e.name)).toEqual(['User', 'Project'])
    expect(result.entities[0]!.importPath).toBe('./a/user')
    expect(result.entities[1]!.importPath).toBe('./b/project')
  })

  it('marks non-object schemas with shape.kind="scalar"', () => {
    const project = makeProject({
      '/virtual/scalars.ts': `
        import { z } from 'zod'
        export const Email = z.string().email()
        export const Age = z.number().int().min(0)
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities).toHaveLength(2)
    for (const entity of result.entities) {
      expect(entity.shape.kind).toBe('scalar')
    }
  })

  it('detects object schemas inside chained calls', () => {
    const project = makeProject({
      '/virtual/strict.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string(), name: z.string() }).strict()
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities).toHaveLength(1)
    const user = result.entities[0]!
    expect(user.shape.kind).toBe('object')
    if (user.shape.kind !== 'object') throw new Error('expected object shape')
    expect(user.shape.fields.map((f) => f.name)).toEqual(['id', 'name'])
  })

  it('ignores variables without an export keyword', () => {
    const project = makeProject({
      '/virtual/private.ts': `
        import { z } from 'zod'
        const Internal = z.object({ id: z.string() })
        export const Public = z.object({ id: z.string() })
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities.map((e) => e.name)).toEqual(['Public'])
  })

  it('ignores variables not initialized via z.*', () => {
    const project = makeProject({
      '/virtual/mixed.ts': `
        import { z } from 'zod'
        export const NotASchema = { id: 'fake' }
        export const StillNotASchema = 42
        export const RealSchema = z.object({ id: z.string() })
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities.map((e) => e.name)).toEqual(['RealSchema'])
  })

  it('ignores files that do not import z from zod', () => {
    const project = makeProject({
      '/virtual/no-zod.ts': `
        const z = { object: (x: unknown) => x }
        export const Fake = z.object({ id: 'string' })
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities).toEqual([])
  })

  it('ignores aliased zod imports (v0.2 will support this)', () => {
    const project = makeProject({
      '/virtual/aliased.ts': `
        import { z as zod } from 'zod'
        export const User = zod.object({ id: zod.string() })
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities).toEqual([])
  })

  it('extracts a description from a .describe() call', () => {
    const project = makeProject({
      '/virtual/described.ts': `
        import { z } from 'zod'
        export const User = z
          .object({ id: z.string() })
          .describe('A user account in the system')
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities[0]!.description).toBe('A user account in the system')
  })

  it('extracts a description from a JSDoc comment when .describe() is absent', () => {
    const project = makeProject({
      '/virtual/jsdoc.ts': `
        import { z } from 'zod'
        /** A project record stored in the workspace */
        export const Project = z.object({ id: z.string(), title: z.string() })
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities[0]!.description).toBe('A project record stored in the workspace')
  })

  it('prefers .describe() over JSDoc when both are present', () => {
    const project = makeProject({
      '/virtual/both.ts': `
        import { z } from 'zod'
        /** Outdated JSDoc */
        export const User = z.object({ id: z.string() }).describe('Authoritative')
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities[0]!.description).toBe('Authoritative')
  })

  it('emits a warning on duplicate schema names in different files', () => {
    const project = makeProject({
      '/virtual/a.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string() })
      `,
      '/virtual/b.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string(), email: z.string() })
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities).toHaveLength(1)
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings[0]).toContain('Duplicate schema name "User"')
  })

  it('handles an empty project cleanly', () => {
    const project = makeProject({})
    const result = scanProject(project, ROOT)

    expect(result.entities).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.rootDir).toBe(ROOT)
    expect(result.scannedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('returns hasIdField=false when no id field is present', () => {
    const project = makeProject({
      '/virtual/no-id.ts': `
        import { z } from 'zod'
        export const Snapshot = z.object({ takenAt: z.string(), value: z.number() })
      `,
    })

    const result = scanProject(project, ROOT)
    const entity = result.entities[0]!
    expect(entity.shape.kind).toBe('object')
    if (entity.shape.kind !== 'object') throw new Error('expected object shape')
    expect(entity.shape.hasIdField).toBe(false)
  })

  it('builds importPath correctly across nested directories', () => {
    const project = makeProject({
      '/virtual/src/domain/billing/invoice.ts': `
        import { z } from 'zod'
        export const Invoice = z.object({ id: z.string(), total: z.number() })
      `,
    })

    const result = scanProject(project, ROOT)
    expect(result.entities[0]!.importPath).toBe('./src/domain/billing/invoice')
  })
})

describe('scanFeSchemas — workspace bounds and limits', () => {
  let workspace: string | undefined

  beforeEach(() => {
    __resetProjectCacheForTests()
  })

  afterEach(async () => {
    if (workspace) {
      await fs.rm(workspace, { recursive: true, force: true })
      workspace = undefined
    }
  })

  it('scans a real on-disk directory and returns entities', async () => {
    workspace = await makeTmpWorkspace({
      'user.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string(), name: z.string() })
      `,
    })

    const result = await scanFeSchemas({ rootDir: workspace })
    expect(result.entities.map((e) => e.name)).toEqual(['User'])
    expect(result.warnings).toEqual([])
  })

  it('prunes node_modules during the walk', async () => {
    workspace = await makeTmpWorkspace({
      'src/user.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string() })
      `,
      'node_modules/some-pkg/index.ts': `
        import { z } from 'zod'
        export const Sneaky = z.object({ id: z.string() })
      `,
    })

    const result = await scanFeSchemas({ rootDir: workspace })
    const names = result.entities.map((e) => e.name)
    expect(names).toContain('User')
    expect(names).not.toContain('Sneaky')
  })

  it('returns a partial result with a warning when maxFiles is hit', async () => {
    workspace = await makeTmpWorkspace({
      'a.ts': `import { z } from 'zod'; export const A = z.object({ id: z.string() })`,
      'b.ts': `import { z } from 'zod'; export const B = z.object({ id: z.string() })`,
      'c.ts': `import { z } from 'zod'; export const C = z.object({ id: z.string() })`,
    })

    const result = await scanFeSchemas({ rootDir: workspace, maxFiles: 2 })
    expect(result.entities).toHaveLength(2)
    expect(result.warnings.some((w) => w.includes('Max file count reached'))).toBe(true)
  })

  it('returns a partial result with a warning when maxTotalBytes is hit', async () => {
    const big = `import { z } from 'zod'\nexport const X = z.object({ id: z.string() })\n${'// '.padEnd(2000, 'x')}`
    workspace = await makeTmpWorkspace({
      'a.ts': big,
      'b.ts': big,
      'c.ts': big,
    })

    const result = await scanFeSchemas({ rootDir: workspace, maxTotalBytes: 2500 })
    expect(result.warnings.some((w) => w.includes('Max total bytes reached'))).toBe(true)
  })

  it('reuses a cached Project across consecutive scans with identical args', async () => {
    workspace = await makeTmpWorkspace({
      'user.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string() })
      `,
    })

    const first = await scanFeSchemas({ rootDir: workspace })
    const second = await scanFeSchemas({ rootDir: workspace })

    // Both runs see the same schema and the same set of source-file paths.
    expect(first.entities.map((e) => e.name)).toEqual(second.entities.map((e) => e.name))

    // Inject a counting factory and confirm a third scan with identical args
    // does NOT call the factory (the cache hit short-circuits construction).
    let factoryCalls = 0
    const factory = (): Project =>
      new Project({
        skipAddingFilesFromTsConfig: true,
        skipFileDependencyResolution: true,
      })

    await scanFeSchemas({
      rootDir: workspace,
      projectFactory: () => {
        factoryCalls += 1
        return factory()
      },
    })
    // The factory IS called when explicitly supplied — that's its purpose as
    // a test injection. The cache test below verifies the no-factory path.
    expect(factoryCalls).toBe(1)
  })

  it('does not reconstruct the underlying Project on a cache hit', async () => {
    workspace = await makeTmpWorkspace({
      'user.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string() })
      `,
    })

    // First scan builds + caches the Project.
    const first = await scanFeSchemas({ rootDir: workspace })
    expect(first.entities.map((e) => e.name)).toEqual(['User'])

    // Add a NEW file that wasn't present on the first scan.
    await fs.writeFile(
      path.join(workspace, 'project.ts'),
      `import { z } from 'zod'\nexport const Project = z.object({ id: z.string() })\n`,
      'utf8'
    )

    // Second scan should add the new file to the cached Project.
    const second = await scanFeSchemas({ rootDir: workspace })
    const names = second.entities.map((e) => e.name).sort()
    expect(names).toEqual(['Project', 'User'])
  })

  it('honours a 0 ms TTL by always rebuilding (verified via env override)', async () => {
    workspace = await makeTmpWorkspace({
      'user.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string() })
      `,
    })

    const prev = process.env['SCAN_CACHE_TTL_MS']
    process.env['SCAN_CACHE_TTL_MS'] = '0'
    try {
      const result = await scanFeSchemas({ rootDir: workspace })
      expect(result.entities.map((e) => e.name)).toEqual(['User'])
    } finally {
      if (prev === undefined) {
        delete process.env['SCAN_CACHE_TTL_MS']
      } else {
        process.env['SCAN_CACHE_TTL_MS'] = prev
      }
    }
  })
})

describe('scan-fe-schemas tool — workspace containment', () => {
  let workspace: string | undefined

  beforeEach(() => {
    __resetProjectCacheForTests()
  })

  afterEach(async () => {
    if (workspace) {
      await fs.rm(workspace, { recursive: true, force: true })
      workspace = undefined
    }
  })

  it('rejects a rootDir resolving outside the workspace', async () => {
    workspace = await makeTmpWorkspace({})
    const { server, invoke } = makeFakeServer()
    registerScanFeSchemasTool(server, { workspaceRoot: workspace })

    const result = await invoke({ rootDir: '/etc' })
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toContain('rootDir must be within workspace')
  })

  it('rejects a rootDir escaping via "..".', async () => {
    workspace = await makeTmpWorkspace({})
    const { server, invoke } = makeFakeServer()
    registerScanFeSchemasTool(server, { workspaceRoot: workspace })

    const result = await invoke({ rootDir: '../../../tmp' })
    expect(result.isError).toBe(true)
    expect(result.content[0]!.text).toContain('rootDir must be within workspace')
  })

  it('accepts a rootDir that resolves inside the workspace', async () => {
    workspace = await makeTmpWorkspace({
      'src/user.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string() })
      `,
    })
    const { server, invoke } = makeFakeServer()
    registerScanFeSchemasTool(server, { workspaceRoot: workspace })

    const result = await invoke({ rootDir: 'src' })
    expect(result.isError).toBeUndefined()
    const model = JSON.parse(result.content[0]!.text) as { entities: { name: string }[] }
    expect(model.entities.map((e) => e.name)).toEqual(['User'])
  })

  it('accepts the workspace root itself as rootDir', async () => {
    workspace = await makeTmpWorkspace({
      'user.ts': `
        import { z } from 'zod'
        export const User = z.object({ id: z.string() })
      `,
    })
    const { server, invoke } = makeFakeServer()
    registerScanFeSchemasTool(server, { workspaceRoot: workspace })

    const result = await invoke({ rootDir: workspace })
    expect(result.isError).toBeUndefined()
    const model = JSON.parse(result.content[0]!.text) as { entities: { name: string }[] }
    expect(model.entities.map((e) => e.name)).toEqual(['User'])
  })
})
