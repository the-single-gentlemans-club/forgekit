/**
 * Shared Zod input validators for the MCP tools.
 *
 * Every tool that accepts a previously-emitted artefact (ContractModel from
 * `scan-fe-schemas`, RoutePlan from `plan-bff-routes`) validates it against
 * one of the schemas in this file rather than redefining its own permissive
 * envelope inline.
 *
 * Two design choices worth calling out:
 *
 *   1. Strict-by-default. Unknown keys at validated boundaries are rejected
 *      (`z.object(...).strict()`), so a renamed-or-typo'd field fails
 *      immediately instead of being silently dropped. Outer envelopes that
 *      may legitimately carry forward-compat extras keep a `.passthrough()`
 *      where noted.
 *
 *   2. Identifier validation is shared with the generator. The regexes that
 *      decide whether a name / path / kebab segment can be safely
 *      interpolated into emitted TypeScript live in `generators/hono-routes.ts`.
 *      We import them here so the tool boundary rejects the same values the
 *      generator would refuse, before any work happens.
 *
 * The inferred TS types are exported for documentation; the canonical types
 * live in `../types.ts`. We keep this file as the *parser*, `types.ts` as the
 * *interface*, and verify the two stay in sync via the test suite.
 */

import { z } from 'zod'

import {
  validateIdentifier,
  validateKebab,
  validatePathSpec,
} from '../generators/hono-routes.js'

// ────────────────────────────────────────────────────────────────────
// Primitive validators reused across schemas
// ────────────────────────────────────────────────────────────────────
//
// Single source of truth for these character classes lives in
// `generators/hono-routes.ts` — those are the same predicates the renderer
// uses to refuse hostile interpolations. We wrap each one in a Zod refinement
// here so the tool input boundary fails fast with the same rule.

/** TS identifier — `[A-Za-z_$][A-Za-z0-9_$]*`. */
export const identifierSchema = z
  .string()
  .min(1)
  .refine(validateIdentifier, 'must be a valid TypeScript identifier')

/** Hono path spec — `/segment/:param` style. */
export const pathSpecSchema = z
  .string()
  .min(1)
  .refine(validatePathSpec, 'must be a Hono-style /path/:spec')

/** kebab-case segment — `[a-z][a-z0-9-]*`. */
export const kebabSchema = z
  .string()
  .min(1)
  .refine(validateKebab, 'must be kebab-case')

/** Non-empty string — used for file paths / import paths. */
const nonEmptyString = z.string().min(1)

// ────────────────────────────────────────────────────────────────────
// EntitySchemaRef
// ────────────────────────────────────────────────────────────────────

const fieldDescriptorSchema = z
  .object({
    name: nonEmptyString,
    optional: z.boolean(),
    typeHint: z.enum([
      'string',
      'number',
      'boolean',
      'date',
      'array',
      'object',
      'unknown',
    ]),
  })
  .strict()

const schemaShapeSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('object'),
      fields: z.array(fieldDescriptorSchema),
      hasIdField: z.boolean(),
    })
    .strict(),
  z.object({ kind: z.literal('scalar') }).strict(),
  z.object({ kind: z.literal('union') }).strict(),
  z.object({ kind: z.literal('enum') }).strict(),
  z.object({ kind: z.literal('opaque') }).strict(),
])

export const entityRefSchema = z
  .object({
    name: identifierSchema,
    filePath: nonEmptyString,
    importPath: nonEmptyString,
    shape: schemaShapeSchema,
    description: z.string().optional(),
  })
  .strict()

// ────────────────────────────────────────────────────────────────────
// ContractModel
// ────────────────────────────────────────────────────────────────────

export const contractModelSchema = z
  .object({
    entities: z.array(entityRefSchema),
    rootDir: nonEmptyString,
    scannedAt: nonEmptyString,
    warnings: z.array(z.string()).default([]),
  })
  // Outer envelope stays open: agents may carry forward-compat keys (e.g. a
  // future `version` marker) that we'd rather not break on.
  .passthrough()

// ────────────────────────────────────────────────────────────────────
// RouteOperation / ResourceGroup / RoutePlan
// ────────────────────────────────────────────────────────────────────

export const routeOperationSchema = z
  .object({
    id: nonEmptyString,
    method: z.enum(['GET', 'POST', 'PATCH', 'PUT', 'DELETE']),
    path: pathSpecSchema,
    entity: identifierSchema,
    singularName: identifierSchema,
    pluralName: identifierSchema,
    pluralKebab: kebabSchema,
    kind: z.enum(['list', 'get', 'create', 'update', 'delete', 'custom']),
    requiresAuth: z.boolean(),
    handlerName: identifierSchema,
  })
  .strict()

export const resourceGroupSchema = z
  .object({
    entityName: identifierSchema,
    pluralName: identifierSchema,
    pluralKebab: kebabSchema,
    operations: z.array(routeOperationSchema),
  })
  .strict()

export const routePlanSchema = z
  .object({
    operations: z.array(routeOperationSchema),
    resources: z.array(resourceGroupSchema).default([]),
    conventions: z
      .object({
        pluralize: z.record(z.string(), z.string()).default({}),
        pathPrefix: z.string().default(''),
      })
      .strict(),
    warnings: z.array(z.string()).default([]),
  })
  // See the note on `contractModelSchema` — outer envelope intentionally open.
  .passthrough()

// ────────────────────────────────────────────────────────────────────
// Inferred TypeScript types — kept aligned with `../types.ts` by hand.
// ────────────────────────────────────────────────────────────────────

export type EntityRefInput = z.infer<typeof entityRefSchema>
export type ContractModelInput = z.infer<typeof contractModelSchema>
export type RouteOperationInput = z.infer<typeof routeOperationSchema>
export type ResourceGroupInput = z.infer<typeof resourceGroupSchema>
export type RoutePlanInput = z.infer<typeof routePlanSchema>
