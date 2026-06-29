/**
 * Zod adapter — recognizes the canonical `import { z } from 'zod'` pattern
 * and extracts schema references via ts-morph AST inspection.
 *
 * Supported patterns (v0.1):
 *   export const X = z.object({ a: z.string() })
 *   export const X = z.object({...}).strict()
 *   export const X = z.object({...}).describe('...')
 *   export const X = z.string()           // scalar — shape.kind = 'scalar'
 *   export const X = z.discriminatedUnion(...)  // recognized as 'opaque'
 *
 * Not yet supported (deferred to v0.2):
 *   import * as Zod from 'zod' ; export const X = Zod.z.object(...)
 *   import { z as ZodLib } from 'zod' ; export const X = ZodLib.object(...)
 *   Composition with z.intersection / z.merge — captured as object but
 *   fields will reflect only the outermost layer.
 */

import path from 'node:path'

import type {
  CallExpression,
  Node,
  ObjectLiteralExpression,
  PropertyAccessExpression,
  PropertyAssignment,
  SourceFile,
  VariableDeclaration,
} from 'ts-morph'
import { SyntaxKind } from 'ts-morph'

import type {
  EntitySchemaRef,
  FieldDescriptor,
  FieldTypeHint,
  SchemaShape,
} from '../types.js'

import type { SchemaAdapter, SchemaAdapterContext } from './schema-adapter.js'

const ZOD_MODULE_SPECIFIERS = new Set(['zod', 'zod/v4', 'zod/v3'])

/** Map of root Zod call names → the discriminated `FieldTypeHint`. */
const ROOT_CALL_TO_TYPE_HINT: Record<string, FieldTypeHint> = {
  string: 'string',
  number: 'number',
  bigint: 'number',
  boolean: 'boolean',
  date: 'date',
  array: 'array',
  tuple: 'array',
  object: 'object',
  record: 'object',
  map: 'object',
}

export const zodAdapter: SchemaAdapter = {
  name: 'zod',

  matchesFile(sourceFile: SourceFile): boolean {
    for (const imp of sourceFile.getImportDeclarations()) {
      const specifier = imp.getModuleSpecifierValue()
      if (!ZOD_MODULE_SPECIFIERS.has(specifier)) continue
      // Look for a named import of `z`.
      const namedImports = imp.getNamedImports()
      for (const named of namedImports) {
        if (named.getName() === 'z' && !named.getAliasNode()) return true
      }
    }
    return false
  },

  extractEntity(
    decl: VariableDeclaration,
    ctx: SchemaAdapterContext
  ): EntitySchemaRef | null {
    const init = decl.getInitializer()
    if (!init) return null

    // Must be a `z.X(...)`-rooted call chain.
    if (!isZodCallChain(init)) return null

    const name = decl.getName()
    const sourceFile = decl.getSourceFile()
    const filePath = sourceFile.getFilePath()
    const importPath = buildImportPath(ctx.rootDir, filePath)

    const shape = classifyShape(init)
    const description = extractDescription(decl, init)

    return {
      name,
      filePath,
      importPath,
      shape,
      ...(description ? { description } : {}),
    }
  },

  extractEntities(
    sourceFile: SourceFile,
    ctx: SchemaAdapterContext
  ): EntitySchemaRef[] {
    const out: EntitySchemaRef[] = []
    for (const stmt of sourceFile.getVariableStatements()) {
      if (!stmt.isExported()) continue
      if (stmt.getDeclarationKind() !== 'const') continue
      for (const decl of stmt.getDeclarations()) {
        if (!decl.getInitializer()) continue
        const entity = this.extractEntity(decl, ctx)
        if (entity) out.push(entity)
      }
    }
    return out
  },
}

// ────────────────────────────────────────────────────────────────────
// Shape classification
// ────────────────────────────────────────────────────────────────────

/**
 * Decide the `SchemaShape` for a Zod call chain. Object schemas are the
 * priority case — those are what the planner uses to generate CRUD routes.
 * Everything else is bucketed cheaply so the planner can warn precisely.
 */
function classifyShape(init: Node): SchemaShape {
  const objectCall = findOutermostZodObjectCall(init)
  if (objectCall) {
    const fields = extractFields(objectCall)
    const hasIdField = fields.some((f) => f.name === 'id')
    return { kind: 'object', fields, hasIdField }
  }

  const rootCall = findRootZodCallName(init)
  if (rootCall === null) return { kind: 'opaque' }

  if (rootCall === 'union' || rootCall === 'discriminatedUnion') {
    return { kind: 'union' }
  }
  if (rootCall === 'enum' || rootCall === 'nativeEnum') {
    return { kind: 'enum' }
  }
  if (rootCall in ROOT_CALL_TO_TYPE_HINT) {
    // Anything else that maps to a primitive/array/record is a scalar from
    // the planner's point of view — only `z.object` generates CRUD.
    return { kind: 'scalar' }
  }
  return { kind: 'opaque' }
}

// ────────────────────────────────────────────────────────────────────
// AST helpers
// ────────────────────────────────────────────────────────────────────

/**
 * Walks an expression and returns true if it's a call chain rooted at the
 * identifier `z`. Covers both flat (`z.object({})`) and chained
 * (`z.object({}).strict().describe('...')`) forms.
 */
function isZodCallChain(node: Node): boolean {
  let current: Node | undefined = node
  while (current) {
    const kind = current.getKind()
    if (kind === SyntaxKind.CallExpression) {
      const callExpr: CallExpression | undefined = current.asKind(SyntaxKind.CallExpression)
      if (!callExpr) return false
      current = callExpr.getExpression()
      continue
    }
    if (kind === SyntaxKind.PropertyAccessExpression) {
      const prop: PropertyAccessExpression | undefined = current.asKind(SyntaxKind.PropertyAccessExpression)
      if (!prop) return false
      current = prop.getExpression()
      continue
    }
    if (kind === SyntaxKind.Identifier) {
      return current.getText() === 'z'
    }
    return false
  }
  return false
}

/**
 * Find the name of the first `z.X(...)` call in a chain — i.e. the call
 * closest to the root identifier `z`. For `z.string().optional()` that's
 * `'string'`; for `z.object({...}).strict()` it's `'object'`.
 *
 * Returns `null` if the chain isn't shaped like `z.X(...)`.
 */
function findRootZodCallName(node: Node): string | null {
  // Walk down to the innermost call expression whose callee is `z.X`.
  let innermost: CallExpression | null = null
  let current: Node | undefined = node
  while (current) {
    const kind = current.getKind()
    if (kind === SyntaxKind.CallExpression) {
      const callExpr: CallExpression | undefined = current.asKind(SyntaxKind.CallExpression)
      if (!callExpr) return null
      innermost = callExpr
      current = callExpr.getExpression()
      continue
    }
    if (kind === SyntaxKind.PropertyAccessExpression) {
      const prop: PropertyAccessExpression | undefined = current.asKind(SyntaxKind.PropertyAccessExpression)
      if (!prop) return null
      current = prop.getExpression()
      continue
    }
    break
  }
  if (!innermost) return null
  const callee = innermost.getExpression()
  if (callee.getKind() !== SyntaxKind.PropertyAccessExpression) return null
  const prop = callee.asKind(SyntaxKind.PropertyAccessExpression)
  if (!prop) return null
  const base = prop.getExpression()
  if (base.getKind() !== SyntaxKind.Identifier) return null
  if (base.getText() !== 'z') return null
  return prop.getName()
}

/**
 * Finds the outermost `z.object(...)` call in a chain. Returns null if no
 * object call exists at any level of the chain.
 *
 * For `z.object({...}).strict().describe('...')` this returns the original
 * `z.object({...})` call so we can inspect its argument.
 */
function findOutermostZodObjectCall(node: Node): CallExpression | null {
  let current: Node | undefined = node
  while (current) {
    const kind = current.getKind()
    if (kind === SyntaxKind.CallExpression) {
      const callExpr: CallExpression | undefined = current.asKind(SyntaxKind.CallExpression)
      if (!callExpr) return null
      const callee = callExpr.getExpression()
      if (callee.getKind() === SyntaxKind.PropertyAccessExpression) {
        const prop = callee.asKind(SyntaxKind.PropertyAccessExpression)
        if (prop && prop.getName() === 'object') {
          const base = prop.getExpression()
          if (base.getKind() === SyntaxKind.Identifier && base.getText() === 'z') {
            return callExpr
          }
        }
      }
      current = callExpr.getExpression()
      continue
    }
    if (kind === SyntaxKind.PropertyAccessExpression) {
      const prop: PropertyAccessExpression | undefined = current.asKind(SyntaxKind.PropertyAccessExpression)
      if (!prop) return null
      current = prop.getExpression()
      continue
    }
    return null
  }
  return null
}

/**
 * Extract the field descriptors from a `z.object({...})` call. Each property
 * yields a `{ name, optional, typeHint }` triple. `optional` is detected by
 * scanning the property's value for an `.optional()` call anywhere in the
 * chain; `typeHint` is mapped from the root `z.X(...)` name of the chain.
 */
function extractFields(objectCall: CallExpression): FieldDescriptor[] {
  const args = objectCall.getArguments()
  if (args.length === 0) return []
  const first = args[0]
  if (!first || first.getKind() !== SyntaxKind.ObjectLiteralExpression) return []
  const obj = first.asKind(SyntaxKind.ObjectLiteralExpression) as ObjectLiteralExpression
  const fields: FieldDescriptor[] = []
  for (const prop of obj.getProperties()) {
    if (prop.getKind() === SyntaxKind.PropertyAssignment) {
      const pa = prop.asKind(SyntaxKind.PropertyAssignment) as PropertyAssignment
      const name = pa.getName()
      const value = pa.getInitializer()
      fields.push(describeField(name, value))
      continue
    }
    if (prop.getKind() === SyntaxKind.ShorthandPropertyAssignment) {
      // `{ id }` — no inline schema, so we can't probe the chain.
      const text = prop.getText().trim()
      if (text) {
        fields.push({ name: text, optional: false, typeHint: 'unknown' })
      }
    }
  }
  return fields
}

function describeField(name: string, value: Node | undefined): FieldDescriptor {
  if (!value) return { name, optional: false, typeHint: 'unknown' }
  const optional = chainContainsCall(value, 'optional') || chainContainsCall(value, 'nullish')
  const rootCall = findRootZodCallName(value)
  const typeHint: FieldTypeHint =
    rootCall !== null && rootCall in ROOT_CALL_TO_TYPE_HINT
      ? (ROOT_CALL_TO_TYPE_HINT[rootCall] ?? 'unknown')
      : 'unknown'
  return { name, optional, typeHint }
}

/**
 * Returns true if `node` is a call chain that includes a `.method()` call at
 * any level. Used to detect `.optional()` / `.nullish()` on a field.
 */
function chainContainsCall(node: Node, method: string): boolean {
  let current: Node | undefined = node
  while (current) {
    const kind = current.getKind()
    if (kind === SyntaxKind.CallExpression) {
      const callExpr: CallExpression | undefined = current.asKind(SyntaxKind.CallExpression)
      if (!callExpr) return false
      const callee = callExpr.getExpression()
      if (callee.getKind() === SyntaxKind.PropertyAccessExpression) {
        const prop = callee.asKind(SyntaxKind.PropertyAccessExpression)
        if (prop && prop.getName() === method) return true
      }
      current = callExpr.getExpression()
      continue
    }
    if (kind === SyntaxKind.PropertyAccessExpression) {
      const prop: PropertyAccessExpression | undefined = current.asKind(SyntaxKind.PropertyAccessExpression)
      if (!prop) return false
      current = prop.getExpression()
      continue
    }
    return false
  }
  return false
}

/**
 * Builds the module specifier a generator would write into a generated file
 * to import the schema. v0.1 uses a relative path from the scan root with the
 * file extension stripped; in v0.2 we'll honor tsconfig path aliases.
 */
function buildImportPath(rootDir: string, filePath: string): string {
  const rel = path.relative(rootDir, filePath)
  const noExt = rel.replace(/\.(ts|tsx)$/i, '')
  const normalized = noExt.split(path.sep).join('/')
  // Always prefix with ./ so it's a valid relative specifier.
  return normalized.startsWith('.') ? normalized : `./${normalized}`
}

/**
 * Pulls a description from (a) a `.describe('...')` call in the schema's
 * chain, or (b) a JSDoc comment immediately above the declaration. The
 * `.describe()` call wins if both are present.
 */
function extractDescription(decl: VariableDeclaration, init: Node): string | undefined {
  const fromDescribe = findDescribeArgument(init)
  if (fromDescribe !== undefined) return fromDescribe

  const stmt = decl.getVariableStatementOrThrow()
  const jsdocs = stmt.getJsDocs()
  if (jsdocs.length === 0) return undefined
  const description = jsdocs[jsdocs.length - 1]?.getDescription().trim()
  return description && description.length > 0 ? description : undefined
}

function findDescribeArgument(node: Node): string | undefined {
  let current: Node | undefined = node
  while (current) {
    const kind = current.getKind()
    if (kind === SyntaxKind.CallExpression) {
      const callExpr: CallExpression | undefined = current.asKind(SyntaxKind.CallExpression)
      if (!callExpr) return undefined
      const callee = callExpr.getExpression()
      if (callee.getKind() === SyntaxKind.PropertyAccessExpression) {
        const prop = callee.asKind(SyntaxKind.PropertyAccessExpression)
        if (prop && prop.getName() === 'describe') {
          const arg = callExpr.getArguments()[0]
          if (arg && arg.getKind() === SyntaxKind.StringLiteral) {
            const lit = arg.asKind(SyntaxKind.StringLiteral)
            if (lit) return lit.getLiteralValue()
          }
        }
      }
      current = callExpr.getExpression()
      continue
    }
    if (kind === SyntaxKind.PropertyAccessExpression) {
      const prop: PropertyAccessExpression | undefined = current.asKind(SyntaxKind.PropertyAccessExpression)
      if (!prop) return undefined
      current = prop.getExpression()
      continue
    }
    return undefined
  }
  return undefined
}
