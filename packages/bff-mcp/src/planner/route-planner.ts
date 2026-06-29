/**
 * Route planner — takes a `ContractModel` from `scan-fe-schemas` and produces
 * a `RoutePlan` listing the routes that should be generated.
 *
 * v0.1 conventions:
 *   - Plural, kebab-case path bases (e.g. `User` → `/users`, `ProjectMember` → `/project-members`)
 *   - Standard CRUD: list / get / create / update / delete
 *   - Handlers named `<verb><Entity>` (singular): `getUser`, `createUser`
 *   - Operation ids: `<plural>.<verb>` (kebab plural for stable identifiers)
 *
 * Entities are only routed when:
 *   - `shape.kind === 'object'`
 *   - `shape.hasIdField === true`
 *
 * Everything else is skipped with a warning, so the agent / user sees exactly
 * what was excluded and why.
 *
 * Output shape note: alongside the flat `operations` list, the planner emits
 * a pre-grouped `resources: ResourceGroup[]` view. Per-resource generators
 * (Hono routes, hooks) should consume `resources` so they no longer have to
 * `groupBy(plan.operations, op => op.entity)` and re-derive `pluralKebab`
 * from `op.id`.
 */

import type {
  ContractModel,
  HttpMethod,
  ResourceGroup,
  RouteOperation,
  RoutePlan,
} from '../types.js'

import { kebabCase, pluralize } from './naming.js'

export interface PlanOptions {
  /** Override pluralization for specific entity names (singular → plural). */
  pluralize?: Record<string, string>
  /** Path prefix prepended to every generated route (e.g. `/api/v1`). */
  pathPrefix?: string
  /** Whether routes require authentication by default. Defaults to `true`. */
  defaultAuth?: boolean
}

type CrudKind = Extract<RouteOperation['kind'], 'list' | 'get' | 'create' | 'update' | 'delete'>

interface OperationTemplate {
  kind: CrudKind
  method: HttpMethod
  /** True if the route includes the `/:id` path param. */
  byId: boolean
}

const CRUD_TEMPLATES: OperationTemplate[] = [
  { kind: 'list', method: 'GET', byId: false },
  { kind: 'get', method: 'GET', byId: true },
  { kind: 'create', method: 'POST', byId: false },
  { kind: 'update', method: 'PATCH', byId: true },
  { kind: 'delete', method: 'DELETE', byId: true },
]

const HANDLER_VERBS: Record<CrudKind, string> = {
  list: 'list',
  get: 'get',
  create: 'create',
  update: 'update',
  delete: 'delete',
}

export function planBffRoutes(
  model: ContractModel,
  options: PlanOptions = {}
): RoutePlan {
  const pluralOverrides = options.pluralize ?? {}
  const pathPrefix = normalizePrefix(options.pathPrefix ?? '')
  const defaultAuth = options.defaultAuth ?? true

  const operations: RouteOperation[] = []
  const resources: ResourceGroup[] = []
  const warnings: string[] = []

  for (const entity of model.entities) {
    if (entity.shape.kind !== 'object') {
      warnings.push(
        `Schema "${entity.name}" is not an object schema; no routes generated. ` +
          `Only object schemas with an \`id\` field map to REST resources in v0.1.`
      )
      continue
    }
    if (!entity.shape.hasIdField) {
      warnings.push(
        `Schema "${entity.name}" is an object schema but has no \`id\` field; ` +
          `no CRUD routes generated. Add an \`id\` field to enable.`
      )
      continue
    }

    const pluralName = pluralOverrides[entity.name] ?? pluralize(entity.name)
    const pluralKebab = kebabCase(pluralName)
    const pathBase = `${pathPrefix}/${pluralKebab}`
    const resourceOps: RouteOperation[] = []

    for (const tmpl of CRUD_TEMPLATES) {
      const path = tmpl.byId ? `${pathBase}/:id` : pathBase
      const op: RouteOperation = {
        id: `${pluralKebab}.${tmpl.kind}`,
        method: tmpl.method,
        path,
        entity: entity.name,
        singularName: entity.name,
        pluralName,
        pluralKebab,
        kind: tmpl.kind,
        requiresAuth: defaultAuth,
        handlerName: buildHandlerName(tmpl.kind, entity.name, pluralName),
      }
      operations.push(op)
      resourceOps.push(op)
    }

    resources.push({
      entityName: entity.name,
      pluralName,
      pluralKebab,
      operations: resourceOps,
    })
  }

  return {
    operations,
    resources,
    conventions: {
      pluralize: pluralOverrides,
      pathPrefix,
    },
    warnings,
  }
}

/**
 * Build a handler name from a CRUD kind + entity name. `list` uses the plural
 * (`listUsers`), every other verb uses the singular (`getUser`).
 */
function buildHandlerName(kind: CrudKind, singular: string, plural: string): string {
  const verb = HANDLER_VERBS[kind]
  const target = kind === 'list' ? plural : singular
  return `${verb}${target}`
}

/**
 * Normalize a path prefix:
 *   ''         → ''
 *   'api'      → '/api'
 *   '/api'     → '/api'
 *   '/api/'    → '/api'
 *   '/api/v1/' → '/api/v1'
 */
function normalizePrefix(prefix: string): string {
  if (!prefix) return ''
  const withLeading = prefix.startsWith('/') ? prefix : `/${prefix}`
  return withLeading.replace(/\/+$/, '')
}
