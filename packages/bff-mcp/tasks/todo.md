# @forgekit/bff-mcp — v0.1 Implementation Plan

**Owner:** Rich Tillman
**Last updated:** 2026-05-17
**Status:** Draft for approval — no code written yet

This is the v0.1 build plan. Each step is discrete, mergeable as its own PR, and includes a Definition of Done. See `SCOPE.md` for product framing, architecture decisions, and the differentiation story.

---

## Locked decisions (from SCOPE.md)

- **Server framework:** Hono (no upstream RPC framework dependency)
- **Schema library:** Zod (v0.1) — `SchemaAdapter` interface for Effect/Schema + TypeBox in v0.2
- **Codegen approach:** AST-driven via `ts-morph`, output via `prettier`
- **Generation lifecycle:** Generated files checked in with `.generated.ts` suffix; hand-written siblings untouched
- **70/30 escape-hatch principle:** Generate CRUD + computed views (~70%); hand-write auth, multi-tenancy, business logic, side effects (~30%)
- **Default auth provider:** Better Auth (others available via scaffold-time config)
- **Transport:** HTTP-only from day one via `@forgekit/mcp-core`'s `createMcpHttpServer` — no stdio path
- **Internal package name:** `@forgekit/bff-mcp` (private until first publish)
- **Default port:** 3003 (figma-mcp = 3001, context-mcp = 3002)

---

## v0.1 Milestone Definition

> Given a directory containing exported Zod schemas, an MCP-callable tool generates a complete Hono BFF: typed routes, validated handlers, OpenAPI 3.1 spec, and TanStack Query client hooks — all checked in as `.generated.ts` files alongside hand-written escape hatches. Demoable end-to-end in under 2 minutes via Claude in an MCP-connected editor.

---

## Step 0 — Scaffold the package

**Definition of Done:** `pnpm nx build bff-mcp` and `pnpm nx test bff-mcp` both succeed against an empty MCP server.

**Files:**
- `packages/bff-mcp/package.json` (mirror `figma-mcp` shape, name `@forgekit/bff-mcp`, deps on `@forgekit/mcp-core`, `@modelcontextprotocol/sdk`, `hono`, `@hono/zod-openapi`, `zod`, `ts-morph`, `prettier`)
- `packages/bff-mcp/tsconfig.json` + `tsconfig.lib.json` + `tsconfig.spec.json` (mirror figma-mcp)
- `packages/bff-mcp/vite.config.ts` + `vitest.config.mts`
- `packages/bff-mcp/eslint.config.mjs`
- `packages/bff-mcp/src/index.ts` — re-exports
- `packages/bff-mcp/src/server.ts` — `createBffMcpServer()` factory + `runHttpServer()`
- `packages/bff-mcp/src/cli.ts` — `--http` CLI entrypoint, dispatches via `runHttpServer` from `@forgekit/mcp-core`
- `packages/bff-mcp/README.md` — bare-bones, says "in development"

**Tests:** none yet — just builds clean and the empty MCP server boots.

---

## Step 1 — `scan-fe-schemas` MCP tool

**Definition of Done:** Pointed at a fixture directory, the tool returns a JSON contract model listing every exported Zod schema with file path, export name, and inferred shape.

**Files:**
- `packages/bff-mcp/src/scanner/zod-scanner.ts` — `ts-morph`-based scanner. Walks a directory, finds exported variables typed as `z.ZodType`, returns `{ name, filePath, schema: z.ZodType }`.
- `packages/bff-mcp/src/scanner/schema-adapter.ts` — `SchemaAdapter` interface (placeholder for v0.2 Effect/Schema and TypeBox).
- `packages/bff-mcp/src/types.ts` — `ContractModel`, `Entity`, `Field` interfaces.
- `packages/bff-mcp/src/tools/scan-fe-schemas.ts` — MCP tool registration.

**Tests:**
- `__tests__/scanner.test.ts` — fixture schemas (User, Project, Task with various Zod shapes), assert scanner returns expected model.
- `__tests__/scanner.fixtures/` — sample Zod schema files.

**Risks:** ts-morph performance on large codebases. Mitigation: walk only the directory the caller passes, no full-project traversal.

---

## Step 2 — `plan-bff-routes` MCP tool

**Definition of Done:** Given a contract model from Step 1, returns a route plan: paths, methods, request/response schemas, suggested handler names.

**Files:**
- `packages/bff-mcp/src/planner/route-planner.ts` — pure function: `ContractModel → RoutePlan`. Hardcoded conventions for v0.1: `/{plural}`, `/{plural}/:id`, methods `GET / POST / PATCH / DELETE`.
- `packages/bff-mcp/src/planner/naming.ts` — pluralization, kebab-case helpers.
- `packages/bff-mcp/src/tools/plan-bff-routes.ts` — MCP tool registration.

**Tests:**
- Unit tests for naming helpers (singular/plural edge cases, multi-word entities).
- Snapshot tests for route plans against the Step 1 fixtures.

---

## Step 3 — `generate-routes` MCP tool (Hono)

**Definition of Done:** Given a route plan, writes `.generated.ts` Hono route files to disk. Output compiles, lints, and passes a smoke test against a real Hono app.

**Files:**
- `packages/bff-mcp/src/generators/hono-routes.ts` — emits Hono route handler files with Zod validation.
- `packages/bff-mcp/src/generators/templates/` — string templates for route files, middleware imports, persistence imports.
- `packages/bff-mcp/src/generators/format.ts` — prettier wrapper.
- `packages/bff-mcp/src/tools/generate-routes.ts` — MCP tool registration.

**Tests:**
- Snapshot tests for generated files (Vitest's inline snapshots).
- Integration test: generate routes, mount in a real Hono app, hit endpoints with `fetch`.

**Risks:** `.generated.ts` collision with hand-written files. Mitigation: never overwrite non-`.generated.ts` files; surface a structured warning if collision detected.

---

## Step 4 — `generate-openapi` MCP tool

**Definition of Done:** Given a contract model + route plan, emits a valid OpenAPI 3.1 YAML that passes `@redocly/cli lint`.

**Files:**
- `packages/bff-mcp/src/generators/openapi.ts` — uses `zod-to-openapi` (or `@asteasolutions/zod-to-openapi`) to convert schemas to OpenAPI components, plus path generation from route plan.
- `packages/bff-mcp/src/tools/generate-openapi.ts` — MCP tool registration.

**Tests:**
- Snapshot test for the generated YAML.
- Schema validity check via the openapi linter.

---

## Step 5 — `generate-client-hooks` MCP tool (TanStack Query)

**Definition of Done:** Given a route plan, generates `.generated.ts` files with: typed `useX` / `useCreateX` / `useUpdateX` / `useDeleteX` hooks, query keys, and request/response types. Output compiles in a React app and the hooks work against the generated Hono server.

**Files:**
- `packages/bff-mcp/src/generators/tanstack-hooks.ts` — emits hook files.
- `packages/bff-mcp/src/generators/keys.ts` — emits structured query-key factories.
- `packages/bff-mcp/src/tools/generate-client-hooks.ts` — MCP tool registration.

**Tests:**
- Snapshot tests for generated files.
- Integration test: render a component with the generated hooks against the generated Hono server (jsdom + msw or actual Hono).

---

## Step 6 — Auth scaffold (Better Auth integration)

**Definition of Done:** Generated routes consume `requireUser` / `requireRole` from `apps/api/src/middleware.ts`. The scaffold can populate `middleware.ts` with a Better Auth implementation given a `forgekit-bff.config.ts`.

**Files:**
- `packages/bff-mcp/src/auth/contract.ts` — typed middleware contract (`requireUser`, `requireRole`, `getCurrentUser`).
- `packages/bff-mcp/src/auth/providers/better-auth.ts` — Better Auth integration template.
- `packages/bff-mcp/src/auth/providers/clerk.ts`, `supabase.ts`, `workos.ts`, `email.ts` — stubs (full implementations land in v0.2).
- Route generator integrates the contract: every protected route gets `requireUser` middleware.

**Tests:**
- Generated middleware compiles and exports the expected contract.
- Integration test against a minimal Better Auth setup.

---

## Step 7 — End-to-end integration test

**Definition of Done:** A single test scans a fixture FE codebase, runs all four generators, builds the resulting BFF, and hits the routes via `fetch` — all generated code compiles and works.

**Files:**
- `packages/bff-mcp/__tests__/e2e.test.ts`
- `packages/bff-mcp/__tests__/e2e.fixtures/` — sample FE codebase

**Tests:** the e2e test is the test.

---

## Step 8 — Dogfood: run `bff-mcp` against an existing ForgeKit-scaffolded app

**Definition of Done:** One existing ForgeKit-scaffolded sample app has had its hand-written CRUD routes replaced by `bff-mcp`-generated equivalents. Diff committed, README updated with the before/after.

**Files:**
- Sample app (location TBD — probably `examples/dogfood-app/` in this repo)
- Updated README showing the diff

**This is the YC "cool hack" beat** — the recursive proof that mirrors "ForgeKit was scaffolded by ForgeKit."

---

## Step 9 — README + launch demo

**Definition of Done:** README has a 2-minute demo video (Loom or asciinema) showing an MCP agent (Claude) running through scan → plan → generate end-to-end. Quickstart works copy-pasted. Common-troubleshoot section.

**Files:**
- `packages/bff-mcp/README.md` (full rewrite from the Step 0 stub)
- `packages/bff-mcp/docs/quickstart.md`
- `packages/bff-mcp/docs/architecture.md` (cheap snapshot of SCOPE.md highlights)

---

## Step 10 — Publish v0.1.0

**Definition of Done:** `@forgekit/bff-mcp@0.1.0` is published to npm. `npm install @forgekit/bff-mcp` + the quickstart steps work end-to-end for a new user.

**Files:**
- `packages/bff-mcp/package.json` — version bump, `publishConfig`, `files`
- semantic-release config aligned with the rest of the forgekit-v2 release pipeline
- `CHANGELOG.md` generated

**Blocker:** confirm `@forgekit` npm scope ownership before publishing.

---

## Risk register (rolling)

| Risk | Likelihood | Mitigation |
|---|---|---|
| ts-morph perf on large repos | Medium | Scope scanning to a passed directory; benchmark on real codebase at Step 1 close |
| `.generated.ts` collision with hand-written code | Medium | Never overwrite non-`.generated.ts`; emit structured warning on conflict |
| Better Auth adapter doesn't fit edge runtimes cleanly | Low | Test against Cloudflare Workers in Step 6 |
| Generated hooks fight with consumer's existing TanStack Query setup | Low | Generate query-key factories that are namespaced; document opt-out |
| OpenAPI generation drifts from actual Hono routes | Medium | Treat OpenAPI as a *projection* of the contract model, not a separate source of truth — both regenerated from the same model |

---

## Out of scope for v0.1 (deferred to v0.2+)

- Effect/Schema and TypeBox adapters
- Fastify generator
- `regenerate-route` with diff preservation
- OpenAPI import (reverse direction)
- Multi-language BE targets (Python, Go)
- VS Code extension hooks
- Cloudflare Workers deploy adapter
- Server-action variant (Next.js / TanStack Start)

---

## How approval works

1. Rich reads this plan, edits / asks questions / pushes back.
2. Once approved, Step 0 (scaffold) lands as the first PR.
3. Each subsequent step lands as its own small PR with passing tests.
4. Steps 1–6 can be done in parallel branches once the contract model types are stable; Steps 7+ are sequential.

Estimated calendar time: **4–6 weeks part-time** to v0.1.0 published, with most of the lift in Steps 3–5 (the actual generators).
