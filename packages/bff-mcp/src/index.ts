/**
 * Public entry point for `@forgekit/bff-mcp`.
 *
 * Two consumption modes:
 *
 *   1. MCP server. Use `createBffMcpServer` / `runHttpServer` from this file
 *      to spin up the tool registry and HTTP transport.
 *
 *   2. Library. Every scanner, planner, generator, and validator that the
 *      MCP tools call is also exported individually so the same package can
 *      be wired into a CLI, a code-mod, or an integration test without going
 *      through the MCP boundary.
 */

// ── Server / HTTP transport ────────────────────────────────────────────
export * from './server.js'

// ── Scanner ────────────────────────────────────────────────────────────
export {
  __resetProjectCacheForTests,
  scanFeSchemas,
  scanProject,
  type ScanOptions,
} from './scanner/zod-scanner.js'
export { zodAdapter } from './scanner/zod-adapter.js'
export type {
  SchemaAdapter,
  SchemaAdapterContext,
} from './scanner/schema-adapter.js'

// ── Planner ────────────────────────────────────────────────────────────
export { planBffRoutes, type PlanOptions } from './planner/route-planner.js'
export { kebabCase, pluralize } from './planner/naming.js'

// ── Generators ─────────────────────────────────────────────────────────
//
// Note: the `IDENTIFIER_RE` / `PATH_SPEC_RE` / `KEBAB_RE` regexes that back
// the `validate*` predicates are intentionally NOT re-exported. Consumers
// who need the predicate use the exported function; if they need the regex
// itself, the predicate can be composed with `.test`. Keeping the surface
// small lets the implementation tighten the regex later without a breaking
// change.
export {
  generateHonoRoutes,
  validateIdentifier,
  validateKebab,
  validatePathSpec,
  type GenerateRoutesOptions,
} from './generators/hono-routes.js'
export {
  writeGeneratedFiles,
  type WriteOptions,
  type WriteResult,
} from './generators/write-files.js'

// ── Public types ───────────────────────────────────────────────────────
export type * from './types.js'
