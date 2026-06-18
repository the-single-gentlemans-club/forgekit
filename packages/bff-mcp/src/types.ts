/**
 * Contract model types — the shared shape between scanner, planner, and generators.
 *
 * The scanner (Step 1) produces a `ContractModel`. The planner (Step 2) consumes it
 * and produces a `RoutePlan`. The generators (Steps 3–5) consume both.
 *
 * Design note: entities are referenced statically (path + name + lightweight metadata),
 * not by materializing runtime Zod objects. Generators that need runtime Zod (e.g.
 * the OpenAPI generator) dynamic-import the user's source from `importPath`.
 */

// ────────────────────────────────────────────────────────────────────
// Contract model — produced by `scan-fe-schemas`
// ────────────────────────────────────────────────────────────────────

/**
 * Cheap, AST-derived hint about a field's runtime type. Populated by the Zod
 * adapter from the first identifier in the field's call chain — `z.string()`
 * → `'string'`, `z.array(...)` → `'array'`, etc. Everything we can't classify
 * cheaply (unions, enums, lazy, transforms, deeply chained refinements) is
 * `'unknown'`. v0.2 may grow this; for v0.1 we deliberately don't recurse.
 */
export type FieldTypeHint =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'array'
  | 'object'
  | 'unknown'

/**
 * One field discovered on an object-shaped schema. Order matches source order
 * so hook generators can produce typed cache keys deterministically.
 */
export interface FieldDescriptor {
  /** Property name as written in the schema (`id`, `email`, …). */
  name: string
  /** True if the field's call chain ends in `.optional()`. */
  optional: boolean
  /** Cheap AST hint; see `FieldTypeHint`. */
  typeHint: FieldTypeHint
}

/**
 * Discriminated union over the shape of a discovered schema. Replaces the
 * old `isObjectSchema` / `hasIdField` / `fieldNames` flags so consumers can
 * narrow once instead of guarding three booleans.
 *
 *   - `object` — a `z.object({...})` (the CRUD case). Carries fields + an
 *     `hasIdField` shortcut so planners don't re-scan `fields`.
 *   - `scalar` — `z.string()`, `z.number()`, etc.
 *   - `union` | `enum` | `opaque` — recognised but not introspected in v0.1.
 */
export type SchemaShape =
  | { kind: 'object'; fields: FieldDescriptor[]; hasIdField: boolean }
  | { kind: 'scalar' }
  | { kind: 'union' | 'enum' | 'opaque' }

/**
 * A reference to one exported schema discovered in the FE codebase.
 * Captures everything generators need without holding a runtime value.
 */
export interface EntitySchemaRef {
  /** PascalCase name as exported (e.g. `User`). */
  name: string
  /** Absolute path to the file declaring the schema. */
  filePath: string
  /** Module specifier a generated file would use to import this. */
  importPath: string
  /** Structural classification of the schema. */
  shape: SchemaShape
  /** Inline description discovered via JSDoc or Zod `.describe()`. */
  description?: string
}

/**
 * The complete contract model for one scan invocation.
 */
export interface ContractModel {
  entities: EntitySchemaRef[]
  /** Root directory that was scanned (absolute path). */
  rootDir: string
  /** Timestamp of the scan, useful for caches. */
  scannedAt: string
  /** Soft diagnostics surfaced during the scan. */
  warnings: string[]
}

// ────────────────────────────────────────────────────────────────────
// Route plan — produced by `plan-bff-routes`, consumed by all generators
// ────────────────────────────────────────────────────────────────────

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

export interface RouteOperation {
  /** Stable identifier (e.g. `users.list`, `users.create`). */
  id: string
  method: HttpMethod
  /** Route path (e.g. `/users`, `/users/:id`). */
  path: string
  /** Entity this operation targets (PascalCase singular, e.g. `User`). */
  entity: string
  /**
   * Entity name in singular form. For canonical CRUD this is identical to
   * `entity`; kept as a distinct field so future v0.2 patterns (e.g. nested
   * routes, custom verbs) can override it without overloading `entity`.
   */
  singularName: string
  /** Pluralized entity name (e.g. `Users`, `ProjectMembers`). */
  pluralName: string
  /**
   * Kebab-cased plural used in the route path and as the path-segment id
   * (e.g. `users`, `project-members`). Generators consume this directly
   * instead of re-deriving it from `op.id`.
   */
  pluralKebab: string
  /** Operation kind — generators use this to pick the right template. */
  kind: 'list' | 'get' | 'create' | 'update' | 'delete' | 'custom'
  /** Whether the route requires authentication (defaults true). */
  requiresAuth: boolean
  /** Suggested handler function name. */
  handlerName: string
}

/**
 * One resource — the operations that belong to a single entity, already
 * grouped and named. Generators that emit per-resource files (Hono routes,
 * hooks) prefer this view over the flat `operations` list because they no
 * longer have to call `groupBy(plan.operations, op => op.entity)` and
 * re-derive the plural-kebab segment.
 */
export interface ResourceGroup {
  /** PascalCase singular (e.g. `User`). Matches `operations[*].entity`. */
  entityName: string
  /** PascalCase plural (e.g. `Users`). Matches `operations[*].pluralName`. */
  pluralName: string
  /** kebab-cased plural (e.g. `users`, `project-members`). */
  pluralKebab: string
  /** Every operation that targets this entity, in plan order. */
  operations: RouteOperation[]
}

export interface RoutePlan {
  /**
   * Flat list of every operation in plan order. Kept for backwards
   * compatibility and for consumers that want a single iterable.
   */
  operations: RouteOperation[]
  /**
   * Pre-grouped view of the same operations, one entry per entity. Preferred
   * by per-resource generators.
   */
  resources: ResourceGroup[]
  /** Pluralization + path-prefix decisions captured for the generators. */
  conventions: {
    pluralize: Record<string, string> // singular -> plural override
    pathPrefix: string // default: ''
  }
  /** Soft diagnostics surfaced during planning (skipped entities, etc.). */
  warnings: string[]
}

// ────────────────────────────────────────────────────────────────────
// Generator output — shared envelope for every generator's result
// ────────────────────────────────────────────────────────────────────

export interface GeneratedFile {
  /** Path relative to the user's project root (where the file will be written). */
  relativePath: string
  /** Full contents of the file, already prettier-formatted. */
  contents: string
  /** `true` if the file should overwrite an existing `.generated.ts` sibling. */
  generated: true
}

export interface GeneratorOutput {
  files: GeneratedFile[]
  /** Soft warnings (e.g. collision with hand-written code, missing escape hatch). */
  warnings: string[]
}
