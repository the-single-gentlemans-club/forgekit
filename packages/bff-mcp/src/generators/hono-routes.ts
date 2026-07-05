/**
 * Hono route generator — turns a ContractModel + RoutePlan into a tree of
 * `.generated.ts` route files, plus per-entity and top-level index files.
 *
 * Output layout (relative to `outputDir`):
 *
 *   {outputDir}/
 *     index.generated.ts              ← registers every entity's routes
 *     users/
 *       list.generated.ts             ← GET    /users
 *       get.generated.ts              ← GET    /users/:id
 *       create.generated.ts           ← POST   /users
 *       update.generated.ts           ← PATCH  /users/:id
 *       delete.generated.ts           ← DELETE /users/:id
 *       index.generated.ts            ← registers all 5 for the entity
 *     projects/
 *       ...
 *
 * Hand-written escape hatches expected to live alongside (never overwritten):
 *   - `{outputDir}/{kebab-plural}/middleware.ts`   — auth (Step 6 populates)
 *   - `{outputDir}/{kebab-plural}/persistence.ts`  — DB / business logic
 *
 * Generated handlers ship with TODO stubs that compile and run; the user
 * replaces the stubs with calls into their persistence layer.
 *
 * Security note (CR-001): every identifier that lands inside emitted TS is
 * validated against a strict regex before interpolation. Banner comments use
 * `//` single-line form so embedded `*\/` sequences in filenames cannot
 * escape the comment context. The `filePath` value is JSON-encoded, which
 * also strips control characters (including stray `\n`s) before emission.
 */

import path from 'node:path'

import type {
  ContractModel,
  EntitySchemaRef,
  GeneratedFile,
  GeneratorOutput,
  ResourceGroup,
  RouteOperation,
  RoutePlan,
} from '../types.js'

import { format } from './format.js'

export interface GenerateRoutesOptions {
  /** Absolute path to the directory where generated routes are rooted. */
  outputDir: string
  /**
   * Injectable clock for deterministic output. Defaults to wall-clock ISO
   * timestamps. Tests pass a fixed string to assert byte-identical output
   * across runs.
   */
  clock?: () => string
}

// ────────────────────────────────────────────────────────────────────
// Validation — every value that reaches a renderer must pass one of these
// ────────────────────────────────────────────────────────────────────

/** TS identifier shape — used for entity names and handler names. */
export const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/
/** Hono path spec — leading slash, then ASCII path chars + `:param` segments. */
export const PATH_SPEC_RE = /^\/[A-Za-z0-9/_\-:.]*$/
/** kebab-case segment used as a path component and import specifier. */
export const KEBAB_RE = /^[a-z][a-z0-9-]*$/

export function validateIdentifier(name: string): boolean {
  return typeof name === 'string' && IDENTIFIER_RE.test(name)
}

export function validatePathSpec(spec: string): boolean {
  return typeof spec === 'string' && PATH_SPEC_RE.test(spec)
}

export function validateKebab(seg: string): boolean {
  return typeof seg === 'string' && KEBAB_RE.test(seg)
}

// ────────────────────────────────────────────────────────────────────
// Entry point
// ────────────────────────────────────────────────────────────────────

interface RenderedFile {
  relativePath: string
  source: string
}

export async function generateHonoRoutes(
  contract: ContractModel,
  plan: RoutePlan,
  options: GenerateRoutesOptions
): Promise<GeneratorOutput> {
  const outputDir = path.resolve(options.outputDir)
  const warnings: string[] = []
  const rendered: RenderedFile[] = []
  // One timestamp per generation so files in the same run agree.
  const generatedAt = options.clock?.() ?? new Date().toISOString()

  const entitiesByName = new Map(contract.entities.map((e) => [e.name, e]))
  const resources = resolveResources(plan)

  for (const resource of resources) {
    const entityName = resource.entityName
    const entity = entitiesByName.get(entityName)
    if (!entity) {
      warnings.push(`No entity "${entityName}" in contract; skipping its routes.`)
      continue
    }

    if (!validateIdentifier(entity.name)) {
      warnings.push(
        `Skipped ${entityName}: entity name "${entity.name}" contains invalid characters; expected /^[A-Za-z_$][A-Za-z0-9_$]*$/.`
      )
      continue
    }

    const pluralKebab = resource.pluralKebab
    if (!pluralKebab) {
      warnings.push(`Entity "${entityName}" has no pluralKebab; skipping.`)
      continue
    }
    if (!validateKebab(pluralKebab)) {
      warnings.push(
        `Skipped ${entityName}: derived path segment "${pluralKebab}" contains invalid characters; expected /^[a-z][a-z0-9-]*$/.`
      )
      continue
    }
    if (resource.operations.length === 0) {
      warnings.push(`Entity "${entityName}" has no operations; skipping.`)
      continue
    }

    const entityDir = path.join(outputDir, pluralKebab)
    const validOps: RouteOperation[] = []

    // One file per operation
    for (const op of resource.operations) {
      if (!validateIdentifier(op.handlerName)) {
        warnings.push(
          `Skipped ${op.id}: handler name "${op.handlerName}" contains invalid characters; expected /^[A-Za-z_$][A-Za-z0-9_$]*$/.`
        )
        continue
      }
      if (!validatePathSpec(op.path)) {
        warnings.push(
          `Skipped ${op.id}: route path "${op.path}" contains invalid characters; expected /^\\/[A-Za-z0-9/_\\-:.]*$/.`
        )
        continue
      }

      const filePath = path.join(entityDir, `${op.kind}.generated.ts`)
      const source = renderRouteFile(entity, op, filePath, generatedAt)
      if (source === null) {
        warnings.push(
          `Skipped ${op.id}: render returned no source (unsupported op kind or validation failure).`
        )
        continue
      }
      rendered.push({
        relativePath: path.relative(outputDir, filePath),
        source,
      })
      validOps.push(op)
    }

    if (validOps.length === 0) {
      // Nothing to register — don't emit a dangling entity index.
      continue
    }

    // Entity-level index that registers the validated ops
    const entityIndexPath = path.join(entityDir, 'index.generated.ts')
    const entityIndexSource = renderEntityIndex(entity.name, validOps, generatedAt)
    rendered.push({
      relativePath: path.relative(outputDir, entityIndexPath),
      source: entityIndexSource,
    })
  }

  // Top-level index — only includes entities that produced at least one file.
  const indexEntities = collectIndexEntities(rendered, resources)
  if (indexEntities.length > 0) {
    const topIndexSource = renderTopLevelIndex(indexEntities, generatedAt)
    rendered.push({
      relativePath: 'index.generated.ts',
      source: topIndexSource,
    })
  } else {
    const topIndexSource = renderTopLevelIndexEmpty(generatedAt)
    rendered.push({
      relativePath: 'index.generated.ts',
      source: topIndexSource,
    })
  }

  // Format every file in parallel. If any throw, surface as warnings and
  // emit ZERO files so the writer never observes a partial-write state.
  let formatted: string[]
  try {
    formatted = await Promise.all(rendered.map((r) => format(r.source)))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    warnings.push(`Prettier format failed; no files emitted: ${message}`)
    return { files: [], warnings }
  }

  const files: GeneratedFile[] = rendered.map((r, i) => ({
    relativePath: r.relativePath,
    contents: formatted[i] as string,
    generated: true,
  }))

  return { files, warnings }
}

/**
 * Pick the entity names that survived validation — i.e. those that ended up
 * with at least one rendered route file. The top-level index only imports
 * from these so we never emit an import referencing a directory we skipped.
 */
function collectIndexEntities(
  rendered: RenderedFile[],
  resources: ResourceGroup[]
): Array<{ name: string; pluralKebab: string }> {
  // Map back from emitted route files (e.g. "users/list.generated.ts") to
  // the kebab segment.
  const renderedKebabs = new Set<string>()
  for (const r of rendered) {
    const seg = r.relativePath.split('/')[0]
    if (seg && r.relativePath.includes('/')) renderedKebabs.add(seg)
  }

  const out: Array<{ name: string; pluralKebab: string }> = []
  for (const resource of resources) {
    if (!renderedKebabs.has(resource.pluralKebab)) continue
    if (!validateIdentifier(resource.entityName) || !validateKebab(resource.pluralKebab)) continue
    out.push({ name: resource.entityName, pluralKebab: resource.pluralKebab })
  }
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Returns the plan's `resources`, enriched from the flat `operations` array
 * when needed. Two fallback cases:
 *
 *   1. `plan.resources` is empty entirely → derive ResourceGroups from
 *      `plan.operations` (grouped by entity).
 *   2. `plan.resources` is populated but some resource has an empty
 *      `operations` array → fill that resource's operations from
 *      `plan.operations` filtered by entity name.
 *
 * Both cases handle plans built by hand (tests, external callers) that
 * populate the flat list but not the grouped view (or vice versa).
 */
function resolveResources(plan: RoutePlan): ResourceGroup[] {
  if (plan.resources.length === 0) {
    return deriveResourcesFromOperations(plan.operations)
  }
  return plan.resources.map((r) => {
    if (r.operations.length > 0) return r
    const matching = plan.operations.filter((op) => op.entity === r.entityName)
    return matching.length > 0 ? { ...r, operations: matching } : r
  })
}

function deriveResourcesFromOperations(operations: RouteOperation[]): ResourceGroup[] {
  const grouped = new Map<string, RouteOperation[]>()
  for (const op of operations) {
    const arr = grouped.get(op.entity)
    if (arr) arr.push(op)
    else grouped.set(op.entity, [op])
  }
  const out: ResourceGroup[] = []
  for (const [entityName, ops] of grouped) {
    const first = ops[0]
    if (!first) continue
    out.push({
      entityName,
      pluralName: first.pluralName,
      pluralKebab: first.pluralKebab,
      operations: ops,
    })
  }
  return out
}

// ────────────────────────────────────────────────────────────────────
// Per-file renderers
// ────────────────────────────────────────────────────────────────────

function renderRouteFile(
  entity: EntitySchemaRef,
  op: RouteOperation,
  filePath: string,
  generatedAt: string
): string | null {
  // All inputs were validated upstream, but renderers are defensive too —
  // a future caller might invoke these directly.
  if (!validateIdentifier(entity.name)) return null
  if (!validateIdentifier(op.handlerName)) return null
  if (!validatePathSpec(op.path)) return null

  const schemaImport = computeRelativeImport(filePath, entity.filePath)
  const header = banner(entity, op, generatedAt)

  switch (op.kind) {
    case 'list':
      return renderList(entity, op, schemaImport, header)
    case 'get':
      return renderGet(entity, op, schemaImport, header)
    case 'create':
      return renderCreate(entity, op, schemaImport, header)
    case 'update':
      return renderUpdate(entity, op, schemaImport, header)
    case 'delete':
      return renderDelete(entity, op, schemaImport, header)
    case 'custom':
      // Custom routes aren't generated in v0.1 — they're for v0.2+.
      return `${header}\n// Custom routes are not generated in v0.1.\nexport {}\n`
  }
}

function renderList(
  entity: EntitySchemaRef,
  op: RouteOperation,
  schemaImport: string,
  header: string
): string {
  return `${header}
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

import { ${entity.name} } from '${schemaImport}'

const route = createRoute({
  method: '${op.method.toLowerCase()}',
  path: '${op.path}',
  responses: {
    200: {
      description: 'List ${entity.name} records',
      content: { 'application/json': { schema: z.array(${entity.name}) } },
    },
  },
})

export function register${capitalize(op.handlerName)}(app: OpenAPIHono): void {
  app.openapi(route, async (c) => {
    // TODO(persistence): replace with a call into your data layer.
    // TODO(auth): wire requireUser from ./middleware once Step 6 ships.
    const items: z.infer<typeof ${entity.name}>[] = []
    return c.json(items)
  })
}
`
}

function renderGet(
  entity: EntitySchemaRef,
  op: RouteOperation,
  schemaImport: string,
  header: string
): string {
  return `${header}
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

import { ${entity.name} } from '${schemaImport}'

const route = createRoute({
  method: '${op.method.toLowerCase()}',
  path: '${op.path}',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: 'Get a ${entity.name} by id',
      content: { 'application/json': { schema: ${entity.name} } },
    },
    404: {
      description: '${entity.name} not found',
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
    },
  },
})

export function register${capitalize(op.handlerName)}(app: OpenAPIHono): void {
  app.openapi(route, async (c) => {
    // TODO(auth): wire requireUser from ./middleware once Step 6 ships.
    const { id } = c.req.valid('param')
    // TODO(persistence): replace with a lookup by id.
    void id
    return c.json({ error: 'Not implemented' }, 404)
  })
}
`
}

function renderCreate(
  entity: EntitySchemaRef,
  op: RouteOperation,
  schemaImport: string,
  header: string
): string {
  return `${header}
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

import { ${entity.name} } from '${schemaImport}'

// Input shape: the entity without its server-assigned id field.
const Create${entity.name}Body = ${entity.name}.omit({ id: true })

const route = createRoute({
  method: '${op.method.toLowerCase()}',
  path: '${op.path}',
  request: {
    body: { content: { 'application/json': { schema: Create${entity.name}Body } } },
  },
  responses: {
    201: {
      description: '${entity.name} created',
      content: { 'application/json': { schema: ${entity.name} } },
    },
  },
})

export function register${capitalize(op.handlerName)}(app: OpenAPIHono): void {
  app.openapi(route, async (c) => {
    // TODO(auth): wire requireUser from ./middleware once Step 6 ships.
    const body = c.req.valid('json')
    // TODO(persistence): replace with a real insert.
    const created = { id: 'stub-id', ...body } as z.infer<typeof ${entity.name}>
    return c.json(created, 201)
  })
}
`
}

function renderUpdate(
  entity: EntitySchemaRef,
  op: RouteOperation,
  schemaImport: string,
  header: string
): string {
  return `${header}
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

import { ${entity.name} } from '${schemaImport}'

// Input shape: every field on ${entity.name} optional for partial update.
const Update${entity.name}Body = ${entity.name}.partial()

const route = createRoute({
  method: '${op.method.toLowerCase()}',
  path: '${op.path}',
  request: {
    params: z.object({ id: z.string() }),
    body: { content: { 'application/json': { schema: Update${entity.name}Body } } },
  },
  responses: {
    200: {
      description: '${entity.name} updated',
      content: { 'application/json': { schema: ${entity.name} } },
    },
    404: {
      description: '${entity.name} not found',
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
    },
  },
})

export function register${capitalize(op.handlerName)}(app: OpenAPIHono): void {
  app.openapi(route, async (c) => {
    // TODO(auth): wire requireUser from ./middleware once Step 6 ships.
    const { id } = c.req.valid('param')
    const body = c.req.valid('json')
    // TODO(persistence): replace with a real update by id.
    const updated = { id, ...body } as z.infer<typeof ${entity.name}>
    return c.json(updated)
  })
}
`
}

function renderDelete(
  entity: EntitySchemaRef,
  op: RouteOperation,
  schemaImport: string,
  header: string
): string {
  return `${header}
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi'

import { ${entity.name} } from '${schemaImport}'

const route = createRoute({
  method: '${op.method.toLowerCase()}',
  path: '${op.path}',
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    204: { description: '${entity.name} deleted' },
    404: {
      description: '${entity.name} not found',
      content: { 'application/json': { schema: z.object({ error: z.string() }) } },
    },
  },
})

export function register${capitalize(op.handlerName)}(app: OpenAPIHono): void {
  app.openapi(route, async (c) => {
    // TODO(auth): wire requireUser from ./middleware once Step 6 ships.
    const { id } = c.req.valid('param')
    void id
    // TODO(persistence): replace with a real delete by id.
    void ${entity.name}
    return c.body(null, 204)
  })
}
`
}

function renderEntityIndex(
  entityName: string,
  ops: RouteOperation[],
  generatedAt: string
): string {
  const imports = ops
    .map((op) => {
      const fn = `register${capitalize(op.handlerName)}`
      return `import { ${fn} } from './${op.kind}.generated.js'`
    })
    .join('\n')

  const calls = ops
    .map((op) => `  register${capitalize(op.handlerName)}(app)`)
    .join('\n')

  return `${bannerSimple(`Registers every ${entityName} route on the given OpenAPIHono app.`, generatedAt)}
import type { OpenAPIHono } from '@hono/zod-openapi'

${imports}

export function register${entityName}Routes(app: OpenAPIHono): void {
${calls}
}
`
}

function renderTopLevelIndex(
  entities: Array<{ name: string; pluralKebab: string }>,
  generatedAt: string
): string {
  const imports = entities
    .map(
      ({ name, pluralKebab }) =>
        `import { register${name}Routes } from './${pluralKebab}/index.generated.js'`
    )
    .join('\n')

  const calls = entities.map(({ name }) => `  register${name}Routes(app)`).join('\n')

  return `${bannerSimple('Registers every generated route on the given OpenAPIHono app.', generatedAt)}
import type { OpenAPIHono } from '@hono/zod-openapi'

${imports}

export function registerAllRoutes(app: OpenAPIHono): void {
${calls}
}
`
}

function renderTopLevelIndexEmpty(generatedAt: string): string {
  return `${bannerSimple('Registers every generated route on the given OpenAPIHono app.', generatedAt)}
import type { OpenAPIHono } from '@hono/zod-openapi'

export function registerAllRoutes(app: OpenAPIHono): void {
  void app
}
`
}

// ────────────────────────────────────────────────────────────────────
// Banners — single-line // comments, JSON-encoded filePath
// ────────────────────────────────────────────────────────────────────
//
// We use // (not /* */) so that an attacker who controls a value rendered
// inside the banner cannot escape the comment by injecting `*\/`. JSON
// encoding `filePath` additionally strips/escapes control characters and
// quotes; the value is on its own `//` line so even a newline inside the
// string would be quoted as `\n` and stay on one rendered line.

function banner(entity: EntitySchemaRef, op: RouteOperation, generatedAt: string): string {
  // op.id, op.method, and op.path were validated upstream. We re-quote
  // entity.filePath defensively because it's user-controlled.
  const safeFilePath = JSON.stringify(String(entity.filePath ?? ''))
  return `/* eslint-disable */
// AUTOGENERATED by @forgekit/bff-mcp — do not edit by hand.
// Operation: ${op.id} (${op.method} ${op.path})
// Entity:    ${entity.name} (filePath=${safeFilePath})
// Generated: ${generatedAt}`
}

function bannerSimple(line: string, generatedAt: string): string {
  // The `line` here is generator-authored (not user input), so it's safe.
  return `/* eslint-disable */
// AUTOGENERATED by @forgekit/bff-mcp — do not edit by hand.
// ${line}
// Generated: ${generatedAt}`
}

// ────────────────────────────────────────────────────────────────────
// Small helpers
// ────────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Strips characters from a path string that would break a TS string literal:
 * C0 control chars (newline, CR, etc.) and the four quote-like chars
 * (single, double, backslash, backtick). Replaced with underscores.
 */
function sanitizeImportSpecifier(spec: string): string {
  let out = ''
  for (let i = 0; i < spec.length; i++) {
    const code = spec.charCodeAt(i)
    const isControl = code < 0x20
    const isQuote = code === 0x22 || code === 0x27 || code === 0x5c || code === 0x60
    out += isControl || isQuote ? '_' : spec.charAt(i)
  }
  return out
}

/**
 * Compute the module specifier a generated file should use to import a target
 * file. Strips the `.ts`/`.tsx` extension and normalizes to forward slashes.
 *
 *   from: /project/apps/api/src/routes/users/list.generated.ts
 *   to:   /project/src/schemas/user.ts
 *   ->    ../../../../src/schemas/user
 *
 * Defensive: control characters, quotes, and backslashes are stripped from
 * the result so an attacker who controls `toAbsFile` (via a poisoned
 * EntitySchemaRef.filePath) cannot escape the single-quoted string literal
 * we interpolate this into. The banner is already JSON-encoded; this closes
 * the same hole on the import side.
 */
function computeRelativeImport(fromAbsFile: string, toAbsFile: string): string {
  const rel = path
    .relative(path.dirname(fromAbsFile), toAbsFile)
    .replace(/\.(ts|tsx)$/i, '')
  const normalized = rel.split(path.sep).join('/')
  // Strip C0 control chars + quote-like chars that could escape the
  // single-quoted string literal we interpolate this into.
  const safe = sanitizeImportSpecifier(normalized)
  
  return safe.startsWith('.') ? safe : `./${safe}`
}
