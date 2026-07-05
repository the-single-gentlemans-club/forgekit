/**
 * Tests for the Step 3 Hono route generator. Pure in-memory — we assert on
 * the GeneratorOutput's file list + contents. Disk-write behavior is covered
 * separately in write-files.test.ts.
 */

import { describe, expect, it, vi } from 'vitest'

import { generateHonoRoutes } from '../generators/hono-routes.js'
import type {
  ContractModel,
  EntitySchemaRef,
  RouteOperation,
  RoutePlan,
} from '../types.js'

const PROJECT_ROOT = '/project'
const OUTPUT_DIR = '/project/apps/api/src/routes'
const SCHEMAS_DIR = '/project/src/schemas'

function entity(name: string, overrides: Partial<EntitySchemaRef> = {}): EntitySchemaRef {
  return {
    name,
    filePath: `${SCHEMAS_DIR}/${name.toLowerCase()}.ts`,
    importPath: `./schemas/${name.toLowerCase()}`,
    shape: {
      kind: 'object',
      hasIdField: true,
      fields: [
        { name: 'id', optional: false, typeHint: 'string' },
        { name: 'name', optional: false, typeHint: 'string' },
      ],
    },
    ...overrides,
  }
}

function contract(entities: EntitySchemaRef[]): ContractModel {
  return {
    entities,
    rootDir: PROJECT_ROOT,
    scannedAt: '2026-05-18T00:00:00.000Z',
    warnings: [],
  }
}

function op(entity: string, kind: RouteOperation['kind'], pluralKebab: string): RouteOperation {
  const methodMap: Record<RouteOperation['kind'], RouteOperation['method']> = {
    list: 'GET',
    get: 'GET',
    create: 'POST',
    update: 'PATCH',
    delete: 'DELETE',
    custom: 'GET',
  }
  const byId = kind === 'get' || kind === 'update' || kind === 'delete'
  const path = byId ? `/${pluralKebab}/:id` : `/${pluralKebab}`
  const verb = kind === 'list' ? 'list' : kind
  const target = kind === 'list' ? `${entity}s` : entity
  // Tests build PluralName by capitalising the kebab segment — good enough
  // for fixture purposes.
  const pluralName = pluralKebab
    .split('-')
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join('')
  return {
    id: `${pluralKebab}.${kind}`,
    method: methodMap[kind],
    path,
    entity,
    singularName: entity,
    pluralName,
    pluralKebab,
    kind,
    requiresAuth: true,
    handlerName: `${verb}${target}`,
  }
}

function crudPlan(entityName: string, pluralKebab: string): RoutePlan {
  const kinds: RouteOperation['kind'][] = ['list', 'get', 'create', 'update', 'delete']
  const operations = kinds.map((k) => op(entityName, k, pluralKebab))
  const pluralName = pluralKebab
    .split('-')
    .map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1))
    .join('')
  return {
    operations,
    resources: [
      {
        entityName,
        pluralName,
        pluralKebab,
        operations,
      },
    ],
    conventions: { pluralize: {}, pathPrefix: '' },
    warnings: [],
  }
}

describe('generateHonoRoutes', () => {
  it('emits 7 files for one entity (5 routes + entity index + top index)', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })

    expect(result.warnings).toEqual([])
    expect(result.files.map((f) => f.relativePath).sort()).toEqual([
      'index.generated.ts',
      'users/create.generated.ts',
      'users/delete.generated.ts',
      'users/get.generated.ts',
      'users/index.generated.ts',
      'users/list.generated.ts',
      'users/update.generated.ts',
    ])
  })

  it('marks every output file with generated=true', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })
    for (const file of result.files) {
      expect(file.generated).toBe(true)
    }
  })

  it('generates 13 files for two entities (5+1 each + 1 top)', async () => {
    const c = contract([entity('User'), entity('Project')])
    const userPlan = crudPlan('User', 'users')
    const projectPlan = crudPlan('Project', 'projects')
    const plan: RoutePlan = {
      operations: [...userPlan.operations, ...projectPlan.operations],
      resources: [...userPlan.resources, ...projectPlan.resources],
      conventions: { pluralize: {}, pathPrefix: '' },
      warnings: [],
    }
    const result = await generateHonoRoutes(c, plan, { outputDir: OUTPUT_DIR })

    expect(result.files).toHaveLength(13)
    expect(result.files.some((f) => f.relativePath === 'users/list.generated.ts')).toBe(true)
    expect(result.files.some((f) => f.relativePath === 'projects/list.generated.ts')).toBe(true)
  })

  it('embeds the schema import as a relative path', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })

    const listFile = result.files.find((f) => f.relativePath === 'users/list.generated.ts')
    expect(listFile).toBeDefined()
    // from /project/apps/api/src/routes/users/list.generated.ts
    //   to /project/src/schemas/user.ts
    //  => ../../../../../src/schemas/user
    expect(listFile!.contents).toContain(
      "import { User } from '../../../../../src/schemas/user'"
    )
  })

  it('list route generates an array response and stub returning []', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })
    const file = result.files.find((f) => f.relativePath === 'users/list.generated.ts')!

    expect(file.contents).toContain("method: 'get'")
    expect(file.contents).toContain("path: '/users'")
    expect(file.contents).toContain('schema: z.array(User)')
    expect(file.contents).toContain(
      "const items: z.infer<typeof User>[] = []"
    )
  })

  it('get route has /:id param and 404 response', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })
    const file = result.files.find((f) => f.relativePath === 'users/get.generated.ts')!

    expect(file.contents).toContain("path: '/users/:id'")
    expect(file.contents).toContain('params: z.object({ id: z.string() })')
    expect(file.contents).toContain('404:')
  })

  it('create route omits the id field on the body schema', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })
    const file = result.files.find((f) => f.relativePath === 'users/create.generated.ts')!

    expect(file.contents).toContain("method: 'post'")
    expect(file.contents).toContain('User.omit({ id: true })')
    expect(file.contents).toContain('201:')
  })

  it('update route makes every field optional via partial()', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })
    const file = result.files.find((f) => f.relativePath === 'users/update.generated.ts')!

    expect(file.contents).toContain("method: 'patch'")
    expect(file.contents).toContain('User.partial()')
    expect(file.contents).toContain('params: z.object({ id: z.string() })')
  })

  it('delete route returns 204 with no body', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })
    const file = result.files.find((f) => f.relativePath === 'users/delete.generated.ts')!

    expect(file.contents).toContain("method: 'delete'")
    expect(file.contents).toContain('204:')
    expect(file.contents).toContain('return c.body(null, 204)')
  })

  it('every route file imports @hono/zod-openapi and exports a register function', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })

    const routeFiles = result.files.filter(
      (f) => f.relativePath.endsWith('.generated.ts') && f.relativePath.includes('/') &&
        !f.relativePath.endsWith('index.generated.ts')
    )
    expect(routeFiles).toHaveLength(5)
    for (const file of routeFiles) {
      expect(file.contents).toContain("from '@hono/zod-openapi'")
      expect(file.contents).toMatch(/export function register\w+\(app: OpenAPIHono\): void/)
    }
  })

  it('entity index registers every route for that entity', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })
    const indexFile = result.files.find((f) => f.relativePath === 'users/index.generated.ts')!

    expect(indexFile.contents).toContain('export function registerUserRoutes(app: OpenAPIHono)')
    expect(indexFile.contents).toContain('registerListUsers')
    expect(indexFile.contents).toContain('registerGetUser')
    expect(indexFile.contents).toContain('registerCreateUser')
    expect(indexFile.contents).toContain('registerUpdateUser')
    expect(indexFile.contents).toContain('registerDeleteUser')
  })

  it('top-level index registers every entity router', async () => {
    const c = contract([entity('User'), entity('Project')])
    const userPlan = crudPlan('User', 'users')
    const projectPlan = crudPlan('Project', 'projects')
    const plan: RoutePlan = {
      operations: [...userPlan.operations, ...projectPlan.operations],
      resources: [...userPlan.resources, ...projectPlan.resources],
      conventions: { pluralize: {}, pathPrefix: '' },
      warnings: [],
    }
    const result = await generateHonoRoutes(c, plan, { outputDir: OUTPUT_DIR })
    const topIndex = result.files.find((f) => f.relativePath === 'index.generated.ts')!

    expect(topIndex.contents).toContain('export function registerAllRoutes(app: OpenAPIHono)')
    expect(topIndex.contents).toContain('registerUserRoutes')
    expect(topIndex.contents).toContain('registerProjectRoutes')
  })

  it('every generated file carries the AUTOGENERATED banner', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })
    for (const file of result.files) {
      expect(file.contents).toContain('AUTOGENERATED by @forgekit/bff-mcp')
    }
  })

  it('warns when a plan references an entity not in the contract', async () => {
    const c = contract([entity('User')])
    const ghostOp = op('Ghost', 'list', 'ghosts')
    const plan: RoutePlan = {
      operations: [ghostOp],
      resources: [
        {
          entityName: 'Ghost',
          pluralName: 'Ghosts',
          pluralKebab: 'ghosts',
          operations: [ghostOp],
        },
      ],
      conventions: { pluralize: {}, pathPrefix: '' },
      warnings: [],
    }
    const result = await generateHonoRoutes(c, plan, { outputDir: OUTPUT_DIR })

    expect(result.warnings.length).toBeGreaterThanOrEqual(1)
    expect(result.warnings.some((w) => w.includes('No entity "Ghost"'))).toBe(true)
  })

  it('produces formatted output (no semis, single quotes, trailing commas)', async () => {
    const result = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
      outputDir: OUTPUT_DIR,
    })
    const file = result.files.find((f) => f.relativePath === 'users/list.generated.ts')!

    // prettier formatting markers
    expect(file.contents).toContain("from '@hono/zod-openapi'")
    expect(file.contents).not.toMatch(/from "@hono\/zod-openapi";/)
  })

  // ──────────────────────────────────────────────────────────────────
  // [CR-001] Validation — refuse to interpolate hostile identifiers.
  // ──────────────────────────────────────────────────────────────────

  describe('input validation (CR-001)', () => {
    it('skips an entity whose name contains a semicolon', async () => {
      const evil = entity('User; process.exit(1); const X')
      const plan = crudPlan('User; process.exit(1); const X', 'users')
      const result = await generateHonoRoutes(contract([evil]), plan, { outputDir: OUTPUT_DIR })

      expect(result.files).toEqual([
        // The empty top-level index is still emitted but it imports nothing.
        expect.objectContaining({ relativePath: 'index.generated.ts' }),
      ])
      expect(
        result.warnings.some((w) =>
          /entity name .* contains invalid characters/.test(w)
        )
      ).toBe(true)
    })

    it('skips an entity whose name contains quote characters', async () => {
      const evil = entity('User"; evil()//')
      const plan = crudPlan('User"; evil()//', 'users')
      const result = await generateHonoRoutes(contract([evil]), plan, { outputDir: OUTPUT_DIR })

      // No route files emitted — only the empty top-level index.
      const routeFiles = result.files.filter((f) => f.relativePath !== 'index.generated.ts')
      expect(routeFiles).toEqual([])
      expect(result.warnings.some((w) => w.includes('invalid characters'))).toBe(true)
    })

    it('keeps banner uninjectable when entity.filePath contains a block-comment-close', async () => {
      // The old generator used /* */ block comments, so a `*/` in filePath
      // could escape the comment context. We now use // single-line comments
      // and JSON-encode the filePath, so the `*/` is encoded as `*/` inside
      // a quoted string and cannot terminate anything.
      const e = entity('User', {
        filePath: '/project/src/schemas/user.ts*/\nconst INJECTED = 1;\n//.ts',
      })
      const result = await generateHonoRoutes(contract([e]), crudPlan('User', 'users'), {
        outputDir: OUTPUT_DIR,
      })

      const file = result.files.find((f) => f.relativePath === 'users/list.generated.ts')!
      // The banner must not contain a bare INJECTED token at module scope.
      // Because we JSON-encode the filePath, any newline becomes `\n` and
      // stays inside quotes — there is no way to land at module top level.
      expect(file.contents).not.toMatch(/^const INJECTED = 1;$/m)
      // And there must be no `*/` followed by a newline + token that would
      // close a block comment (we no longer use /* */ for the banner at all).
      expect(file.contents).toMatch(/\/\/ AUTOGENERATED by @forgekit\/bff-mcp/)
    })

    it('skips an op whose path contains invalid characters', async () => {
      const badOp: RouteOperation = {
        id: 'users.list',
        method: 'GET',
        path: "/users'; DROP TABLE users; --",
        entity: 'User',
        singularName: 'User',
        pluralName: 'Users',
        pluralKebab: 'users',
        kind: 'list',
        requiresAuth: true,
        handlerName: 'listUsers',
      }
      const plan: RoutePlan = {
        operations: [badOp],
        resources: [
          {
            entityName: 'User',
            pluralName: 'Users',
            pluralKebab: 'users',
            operations: [badOp],
          },
        ],
        conventions: { pluralize: {}, pathPrefix: '' },
        warnings: [],
      }
      const result = await generateHonoRoutes(contract([entity('User')]), plan, {
        outputDir: OUTPUT_DIR,
      })

      // No users/list.generated.ts because the only op was rejected.
      expect(result.files.some((f) => f.relativePath === 'users/list.generated.ts')).toBe(
        false
      )
      expect(result.warnings.some((w) => /route path .* contains invalid characters/.test(w))).toBe(
        true
      )
    })

    it('skips an op whose handlerName is not a valid identifier', async () => {
      const badOp: RouteOperation = {
        id: 'users.list',
        method: 'GET',
        path: '/users',
        entity: 'User',
        singularName: 'User',
        pluralName: 'Users',
        pluralKebab: 'users',
        kind: 'list',
        requiresAuth: true,
        handlerName: 'list users; evil()',
      }
      const plan: RoutePlan = {
        operations: [badOp],
        resources: [
          {
            entityName: 'User',
            pluralName: 'Users',
            pluralKebab: 'users',
            operations: [badOp],
          },
        ],
        conventions: { pluralize: {}, pathPrefix: '' },
        warnings: [],
      }
      const result = await generateHonoRoutes(contract([entity('User')]), plan, {
        outputDir: OUTPUT_DIR,
      })

      expect(result.files.some((f) => f.relativePath === 'users/list.generated.ts')).toBe(
        false
      )
      expect(result.warnings.some((w) => /handler name .* contains invalid characters/.test(w))).toBe(
        true
      )
    })

    it('skips an entity whose pluralKebab is not valid kebab-case', async () => {
      // The id's kebab segment is what the generator currently keys off (via
      // `op.id.split('.')[0]`). Once the generator switches to `op.pluralKebab`,
      // this fixture's `pluralKebab` field becomes the load-bearing one — both
      // are intentionally bad here so the test stays correct either way.
      const badOp: RouteOperation = {
        id: 'BAD_SEGMENT.list',
        method: 'GET',
        path: '/users',
        entity: 'User',
        singularName: 'User',
        pluralName: 'BadSegment',
        pluralKebab: 'BAD_SEGMENT',
        kind: 'list',
        requiresAuth: true,
        handlerName: 'listUsers',
      }
      const plan: RoutePlan = {
        operations: [badOp],
        resources: [
          {
            entityName: 'User',
            pluralName: 'BadSegment',
            pluralKebab: 'BAD_SEGMENT',
            operations: [badOp],
          },
        ],
        conventions: { pluralize: {}, pathPrefix: '' },
        warnings: [],
      }
      const result = await generateHonoRoutes(contract([entity('User')]), plan, {
        outputDir: OUTPUT_DIR,
      })

      expect(result.warnings.some((w) => /invalid characters; expected \/\^\[a-z\]/.test(w))).toBe(
        true
      )
      const routeFiles = result.files.filter((f) => f.relativePath !== 'index.generated.ts')
      expect(routeFiles).toEqual([])
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // [H-019] Deterministic clock
  // ──────────────────────────────────────────────────────────────────

  describe('deterministic clock (H-019)', () => {
    it('produces byte-identical output across runs with a fixed clock', async () => {
      const clock = () => '2099-01-01T00:00:00.000Z'
      const a = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
        outputDir: OUTPUT_DIR,
        clock,
      })
      const b = await generateHonoRoutes(contract([entity('User')]), crudPlan('User', 'users'), {
        outputDir: OUTPUT_DIR,
        clock,
      })

      expect(a.files.map((f) => f.contents)).toEqual(b.files.map((f) => f.contents))
    })

    it('uses the same timestamp across every file in a single run', async () => {
      const clock = vi.fn(() => 'FIXED-TS-MARKER')
      const result = await generateHonoRoutes(
        contract([entity('User')]),
        crudPlan('User', 'users'),
        { outputDir: OUTPUT_DIR, clock }
      )

      // Captured exactly once at the top of generateHonoRoutes.
      expect(clock).toHaveBeenCalledTimes(1)
      for (const file of result.files) {
        expect(file.contents).toContain('FIXED-TS-MARKER')
      }
    })

    it('falls back to Date.now-based ISO when no clock is supplied', async () => {
      const result = await generateHonoRoutes(
        contract([entity('User')]),
        crudPlan('User', 'users'),
        { outputDir: OUTPUT_DIR }
      )
      const file = result.files[0]!
      expect(file.contents).toMatch(/Generated: \d{4}-\d{2}-\d{2}T/)
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // [H-006] Prettier failure → transactional empty result
  // ──────────────────────────────────────────────────────────────────

  describe('prettier failure (H-006)', () => {
    it('returns zero files and a warning if any file fails to format', async () => {
      vi.resetModules()
      vi.doMock('../generators/format.js', () => ({
        format: async (source: string) => {
          // Fail on the create file only; everything else would succeed —
          // but the partial-success result must still be ZERO files.
          if (source.includes('Create')) {
            throw new Error('boom: synthetic prettier failure')
          }
          return source
        },
      }))

      const mod = await import('../generators/hono-routes.js')
      const result = await mod.generateHonoRoutes(
        contract([entity('User')]),
        crudPlan('User', 'users'),
        { outputDir: OUTPUT_DIR }
      )

      expect(result.files).toEqual([])
      expect(result.warnings.some((w) => /Prettier format failed/.test(w))).toBe(true)

      vi.doUnmock('../generators/format.js')
      vi.resetModules()
    })
  })
})
