/**
 * Unit tests for the Step 2 route planner.
 *
 * Pure function tests — no I/O, no AST. Inputs are hand-built `ContractModel`
 * fixtures so we can isolate planning logic from the scanner.
 */

import { describe, expect, it } from 'vitest'

import { planBffRoutes } from '../planner/route-planner.js'
import type { ContractModel, EntitySchemaRef, RouteOperation } from '../types.js'

function entity(overrides: Partial<EntitySchemaRef> & { name: string }): EntitySchemaRef {
  return {
    filePath: `/virtual/${overrides.name.toLowerCase()}.ts`,
    importPath: `./${overrides.name.toLowerCase()}`,
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

function model(entities: EntitySchemaRef[]): ContractModel {
  return {
    entities,
    rootDir: '/virtual',
    scannedAt: '2026-05-18T00:00:00.000Z',
    warnings: [],
  }
}

function findOp(ops: RouteOperation[], id: string): RouteOperation {
  const op = ops.find((o) => o.id === id)
  if (!op) throw new Error(`Expected operation "${id}" — found: ${ops.map((o) => o.id).join(', ')}`)
  return op
}

describe('planBffRoutes', () => {
  it('emits 5 CRUD operations for one id-bearing object entity', () => {
    const plan = planBffRoutes(model([entity({ name: 'User' })]))

    expect(plan.operations).toHaveLength(5)
    expect(plan.operations.map((o) => o.id).sort()).toEqual([
      'users.create',
      'users.delete',
      'users.get',
      'users.list',
      'users.update',
    ])
    expect(plan.warnings).toEqual([])
  })

  it('uses correct HTTP method + path + handler name per CRUD kind', () => {
    const plan = planBffRoutes(model([entity({ name: 'User' })]))

    expect(findOp(plan.operations, 'users.list')).toMatchObject({
      method: 'GET',
      path: '/users',
      kind: 'list',
      handlerName: 'listUsers',
    })
    expect(findOp(plan.operations, 'users.get')).toMatchObject({
      method: 'GET',
      path: '/users/:id',
      kind: 'get',
      handlerName: 'getUser',
    })
    expect(findOp(plan.operations, 'users.create')).toMatchObject({
      method: 'POST',
      path: '/users',
      kind: 'create',
      handlerName: 'createUser',
    })
    expect(findOp(plan.operations, 'users.update')).toMatchObject({
      method: 'PATCH',
      path: '/users/:id',
      kind: 'update',
      handlerName: 'updateUser',
    })
    expect(findOp(plan.operations, 'users.delete')).toMatchObject({
      method: 'DELETE',
      path: '/users/:id',
      kind: 'delete',
      handlerName: 'deleteUser',
    })
  })

  it('produces 10 ops for two entities, preserving input order', () => {
    const plan = planBffRoutes(model([entity({ name: 'User' }), entity({ name: 'Project' })]))

    expect(plan.operations).toHaveLength(10)
    expect(plan.operations.slice(0, 5).every((o) => o.entity === 'User')).toBe(true)
    expect(plan.operations.slice(5, 10).every((o) => o.entity === 'Project')).toBe(true)
  })

  it('skips non-object schemas with a warning', () => {
    const plan = planBffRoutes(
      model([
        entity({ name: 'User' }),
        entity({ name: 'Email', shape: { kind: 'scalar' } }),
      ])
    )

    expect(plan.operations).toHaveLength(5)
    expect(plan.warnings).toHaveLength(1)
    expect(plan.warnings[0]).toContain('Schema "Email" is not an object schema')
  })

  it('skips object schemas without an id field with a warning', () => {
    const plan = planBffRoutes(
      model([
        entity({ name: 'User' }),
        entity({
          name: 'Address',
          shape: {
            kind: 'object',
            hasIdField: false,
            fields: [
              { name: 'street', optional: false, typeHint: 'string' },
              { name: 'city', optional: false, typeHint: 'string' },
              { name: 'zip', optional: false, typeHint: 'string' },
            ],
          },
        }),
      ])
    )

    expect(plan.operations).toHaveLength(5)
    expect(plan.operations.every((o) => o.entity === 'User')).toBe(true)
    expect(plan.warnings).toHaveLength(1)
    expect(plan.warnings[0]).toContain('Schema "Address"')
    expect(plan.warnings[0]).toContain('no `id` field')
  })

  it('respects pluralization overrides', () => {
    const plan = planBffRoutes(
      model([entity({ name: 'Goose' }), entity({ name: 'Quiz' })]),
      { pluralize: { Goose: 'Geese', Quiz: 'Quizzes' } }
    )

    expect(plan.operations.map((o) => o.path)).toContain('/geese')
    expect(plan.operations.map((o) => o.path)).toContain('/quizzes')
  })

  it('pluralizes multi-word PascalCase to kebab-case paths', () => {
    const plan = planBffRoutes(model([entity({ name: 'ProjectMember' })]))

    expect(plan.operations.map((o) => o.path).sort()).toEqual([
      '/project-members',
      '/project-members',
      '/project-members/:id',
      '/project-members/:id',
      '/project-members/:id',
    ])
    expect(findOp(plan.operations, 'project-members.list').handlerName).toBe(
      'listProjectMembers'
    )
    expect(findOp(plan.operations, 'project-members.get').handlerName).toBe('getProjectMember')
  })

  it('applies a path prefix to every route', () => {
    const plan = planBffRoutes(model([entity({ name: 'User' })]), {
      pathPrefix: '/api/v1',
    })

    for (const op of plan.operations) {
      expect(op.path.startsWith('/api/v1/users')).toBe(true)
    }
    expect(plan.conventions.pathPrefix).toBe('/api/v1')
  })

  it('normalizes path prefixes (no leading slash, trailing slashes)', () => {
    const a = planBffRoutes(model([entity({ name: 'User' })]), { pathPrefix: 'api' })
    expect(a.conventions.pathPrefix).toBe('/api')

    const b = planBffRoutes(model([entity({ name: 'User' })]), { pathPrefix: '/api/v1/' })
    expect(b.conventions.pathPrefix).toBe('/api/v1')
  })

  it('defaults requiresAuth=true', () => {
    const plan = planBffRoutes(model([entity({ name: 'User' })]))
    expect(plan.operations.every((o) => o.requiresAuth)).toBe(true)
  })

  it('honors defaultAuth=false', () => {
    const plan = planBffRoutes(model([entity({ name: 'User' })]), { defaultAuth: false })
    expect(plan.operations.every((o) => o.requiresAuth === false)).toBe(true)
  })

  it('handles an empty model cleanly', () => {
    const plan = planBffRoutes(model([]))
    expect(plan.operations).toEqual([])
    expect(plan.resources).toEqual([])
    expect(plan.warnings).toEqual([])
    expect(plan.conventions).toMatchObject({ pluralize: {}, pathPrefix: '' })
  })

  it('handles irregular plurals correctly via the built-in table', () => {
    const plan = planBffRoutes(model([entity({ name: 'Person' })]))
    const paths = new Set(plan.operations.map((o) => o.path))
    expect(paths).toContain('/people')
    expect(paths).toContain('/people/:id')
    expect(findOp(plan.operations, 'people.get').handlerName).toBe('getPerson')
  })

  it('produces a stable plan snapshot for a representative model', () => {
    const plan = planBffRoutes(
      model([
        entity({
          name: 'User',
          shape: {
            kind: 'object',
            hasIdField: true,
            fields: [
              { name: 'id', optional: false, typeHint: 'string' },
              { name: 'email', optional: false, typeHint: 'string' },
              { name: 'name', optional: false, typeHint: 'string' },
            ],
          },
        }),
        entity({
          name: 'Project',
          shape: {
            kind: 'object',
            hasIdField: true,
            fields: [
              { name: 'id', optional: false, typeHint: 'string' },
              { name: 'title', optional: false, typeHint: 'string' },
              { name: 'ownerId', optional: false, typeHint: 'string' },
            ],
          },
        }),
      ]),
      { pathPrefix: '/api/v1' }
    )

    // Spot-check the structurally interesting bits — the snapshot below
    // covers byte-for-byte agreement.
    expect(plan.operations).toHaveLength(10)
    expect(plan.resources.map((r) => r.entityName)).toEqual(['User', 'Project'])
    expect(plan.resources[0]!.pluralKebab).toBe('users')

    expect(plan).toMatchInlineSnapshot(`
      {
        "conventions": {
          "pathPrefix": "/api/v1",
          "pluralize": {},
        },
        "operations": [
          {
            "entity": "User",
            "handlerName": "listUsers",
            "id": "users.list",
            "kind": "list",
            "method": "GET",
            "path": "/api/v1/users",
            "pluralKebab": "users",
            "pluralName": "Users",
            "requiresAuth": true,
            "singularName": "User",
          },
          {
            "entity": "User",
            "handlerName": "getUser",
            "id": "users.get",
            "kind": "get",
            "method": "GET",
            "path": "/api/v1/users/:id",
            "pluralKebab": "users",
            "pluralName": "Users",
            "requiresAuth": true,
            "singularName": "User",
          },
          {
            "entity": "User",
            "handlerName": "createUser",
            "id": "users.create",
            "kind": "create",
            "method": "POST",
            "path": "/api/v1/users",
            "pluralKebab": "users",
            "pluralName": "Users",
            "requiresAuth": true,
            "singularName": "User",
          },
          {
            "entity": "User",
            "handlerName": "updateUser",
            "id": "users.update",
            "kind": "update",
            "method": "PATCH",
            "path": "/api/v1/users/:id",
            "pluralKebab": "users",
            "pluralName": "Users",
            "requiresAuth": true,
            "singularName": "User",
          },
          {
            "entity": "User",
            "handlerName": "deleteUser",
            "id": "users.delete",
            "kind": "delete",
            "method": "DELETE",
            "path": "/api/v1/users/:id",
            "pluralKebab": "users",
            "pluralName": "Users",
            "requiresAuth": true,
            "singularName": "User",
          },
          {
            "entity": "Project",
            "handlerName": "listProjects",
            "id": "projects.list",
            "kind": "list",
            "method": "GET",
            "path": "/api/v1/projects",
            "pluralKebab": "projects",
            "pluralName": "Projects",
            "requiresAuth": true,
            "singularName": "Project",
          },
          {
            "entity": "Project",
            "handlerName": "getProject",
            "id": "projects.get",
            "kind": "get",
            "method": "GET",
            "path": "/api/v1/projects/:id",
            "pluralKebab": "projects",
            "pluralName": "Projects",
            "requiresAuth": true,
            "singularName": "Project",
          },
          {
            "entity": "Project",
            "handlerName": "createProject",
            "id": "projects.create",
            "kind": "create",
            "method": "POST",
            "path": "/api/v1/projects",
            "pluralKebab": "projects",
            "pluralName": "Projects",
            "requiresAuth": true,
            "singularName": "Project",
          },
          {
            "entity": "Project",
            "handlerName": "updateProject",
            "id": "projects.update",
            "kind": "update",
            "method": "PATCH",
            "path": "/api/v1/projects/:id",
            "pluralKebab": "projects",
            "pluralName": "Projects",
            "requiresAuth": true,
            "singularName": "Project",
          },
          {
            "entity": "Project",
            "handlerName": "deleteProject",
            "id": "projects.delete",
            "kind": "delete",
            "method": "DELETE",
            "path": "/api/v1/projects/:id",
            "pluralKebab": "projects",
            "pluralName": "Projects",
            "requiresAuth": true,
            "singularName": "Project",
          },
        ],
        "resources": [
          {
            "entityName": "User",
            "operations": [
              {
                "entity": "User",
                "handlerName": "listUsers",
                "id": "users.list",
                "kind": "list",
                "method": "GET",
                "path": "/api/v1/users",
                "pluralKebab": "users",
                "pluralName": "Users",
                "requiresAuth": true,
                "singularName": "User",
              },
              {
                "entity": "User",
                "handlerName": "getUser",
                "id": "users.get",
                "kind": "get",
                "method": "GET",
                "path": "/api/v1/users/:id",
                "pluralKebab": "users",
                "pluralName": "Users",
                "requiresAuth": true,
                "singularName": "User",
              },
              {
                "entity": "User",
                "handlerName": "createUser",
                "id": "users.create",
                "kind": "create",
                "method": "POST",
                "path": "/api/v1/users",
                "pluralKebab": "users",
                "pluralName": "Users",
                "requiresAuth": true,
                "singularName": "User",
              },
              {
                "entity": "User",
                "handlerName": "updateUser",
                "id": "users.update",
                "kind": "update",
                "method": "PATCH",
                "path": "/api/v1/users/:id",
                "pluralKebab": "users",
                "pluralName": "Users",
                "requiresAuth": true,
                "singularName": "User",
              },
              {
                "entity": "User",
                "handlerName": "deleteUser",
                "id": "users.delete",
                "kind": "delete",
                "method": "DELETE",
                "path": "/api/v1/users/:id",
                "pluralKebab": "users",
                "pluralName": "Users",
                "requiresAuth": true,
                "singularName": "User",
              },
            ],
            "pluralKebab": "users",
            "pluralName": "Users",
          },
          {
            "entityName": "Project",
            "operations": [
              {
                "entity": "Project",
                "handlerName": "listProjects",
                "id": "projects.list",
                "kind": "list",
                "method": "GET",
                "path": "/api/v1/projects",
                "pluralKebab": "projects",
                "pluralName": "Projects",
                "requiresAuth": true,
                "singularName": "Project",
              },
              {
                "entity": "Project",
                "handlerName": "getProject",
                "id": "projects.get",
                "kind": "get",
                "method": "GET",
                "path": "/api/v1/projects/:id",
                "pluralKebab": "projects",
                "pluralName": "Projects",
                "requiresAuth": true,
                "singularName": "Project",
              },
              {
                "entity": "Project",
                "handlerName": "createProject",
                "id": "projects.create",
                "kind": "create",
                "method": "POST",
                "path": "/api/v1/projects",
                "pluralKebab": "projects",
                "pluralName": "Projects",
                "requiresAuth": true,
                "singularName": "Project",
              },
              {
                "entity": "Project",
                "handlerName": "updateProject",
                "id": "projects.update",
                "kind": "update",
                "method": "PATCH",
                "path": "/api/v1/projects/:id",
                "pluralKebab": "projects",
                "pluralName": "Projects",
                "requiresAuth": true,
                "singularName": "Project",
              },
              {
                "entity": "Project",
                "handlerName": "deleteProject",
                "id": "projects.delete",
                "kind": "delete",
                "method": "DELETE",
                "path": "/api/v1/projects/:id",
                "pluralKebab": "projects",
                "pluralName": "Projects",
                "requiresAuth": true,
                "singularName": "Project",
              },
            ],
            "pluralKebab": "projects",
            "pluralName": "Projects",
          },
        ],
        "warnings": [],
      }
    `)
  })
})
