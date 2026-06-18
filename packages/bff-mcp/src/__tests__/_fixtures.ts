/**
 * Shared fixture builders for the bff-mcp test suite.
 *
 * Keeping these in one place lets the integration / tools / server tests all
 * agree on a representative ContractModel / RoutePlan shape without each test
 * duplicating the same handcrafted JSON. Tests should prefer producing the
 * shape via the real public API (`scanProject`, `planBffRoutes`) so we lock
 * the *observable* contract rather than freezing internal type names.
 *
 * NOTE: these fixtures reflect the post-Agent-D shape where `EntitySchemaRef`
 * carries a discriminated `shape` union (replacing the previous
 * `isObjectSchema` / `hasIdField` / `fieldNames` booleans), and `RouteOperation`
 * carries explicit `singularName` / `pluralName` / `pluralKebab` fields.
 */

import type {
  ContractModel,
  EntitySchemaRef,
  FieldDescriptor,
  RouteOperation,
  RoutePlan,
  SchemaShape,
} from '../types.js'

export const FIXED_TS = 'FIXED-TS-2026-01-01'

/**
 * Build an EntitySchemaRef. Defaults to an `object`-shaped schema with id+name
 * fields; pass `shape` to override or `objectFields` for the common case where
 * the test only cares about field names.
 */
export function makeEntity(
  name: string,
  overrides: Partial<EntitySchemaRef> & { objectFields?: string[] } = {}
): EntitySchemaRef {
  const lower = name.toLowerCase()
  const { objectFields, ...rest } = overrides
  const defaultShape: SchemaShape =
    rest.shape ??
    {
      kind: 'object',
      fields: (objectFields ?? ['id', 'name']).map(
        (n): FieldDescriptor => ({
          name: n,
          optional: false,
          typeHint: 'string',
        })
      ),
      hasIdField: (objectFields ?? ['id']).includes('id'),
    }
  return {
    name,
    filePath: `/virtual/schemas/${lower}.ts`,
    importPath: `./schemas/${lower}`,
    shape: defaultShape,
    ...rest,
  }
}

export function makeContract(entities: EntitySchemaRef[]): ContractModel {
  return {
    entities,
    rootDir: '/virtual',
    scannedAt: '2026-01-01T00:00:00.000Z',
    warnings: [],
  }
}

export function makeOperation(
  entity: string,
  kind: RouteOperation['kind'],
  pluralKebab: string,
  pluralName?: string
): RouteOperation {
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
  const plural = pluralName ?? `${entity}s`
  const target = kind === 'list' ? plural : entity
  return {
    id: `${pluralKebab}.${kind}`,
    method: methodMap[kind],
    path,
    entity,
    singularName: entity,
    pluralName: plural,
    pluralKebab,
    kind,
    requiresAuth: true,
    handlerName: `${kind}${target}`,
  }
}

export function makeCrudPlan(
  entity: string,
  pluralKebab: string,
  pluralName?: string
): RoutePlan {
  const kinds: RouteOperation['kind'][] = [
    'list',
    'get',
    'create',
    'update',
    'delete',
  ]
  const operations = kinds.map((k) => makeOperation(entity, k, pluralKebab, pluralName))
  const plural = pluralName ?? `${entity}s`
  return {
    operations,
    resources: [
      {
        entityName: entity,
        pluralName: plural,
        pluralKebab,
        operations,
      },
    ],
    conventions: { pluralize: {}, pathPrefix: '' },
    warnings: [],
  }
}

/** Convenience: get an entity's field names regardless of shape. */
export function entityFieldNames(entity: EntitySchemaRef): string[] {
  return entity.shape.kind === 'object'
    ? entity.shape.fields.map((f) => f.name)
    : []
}
