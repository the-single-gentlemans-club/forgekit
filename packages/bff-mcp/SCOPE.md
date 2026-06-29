# @forgekit/bff-mcp — Scope

**Status:** Draft for review · v0.0 (pre-scaffold)
**Owner:** Rich Tillman
**Last updated:** May 15, 2026

---

## One-Liner

> An MCP server that reads your frontend's exported schemas (Zod, Effect/Schema, TypeBox) and generates the matching backend-for-frontend (BFF): typed Hono endpoints, validated handlers, OpenAPI 3.1 specs, and TanStack Query client hooks — all callable directly from AI coding agents.

---

## The Problem

Every team's FE/BE contract drifts. The FE author defines what the UI needs in TypeScript schemas; the BE author defines the API in a different vocabulary (or worse, no vocabulary). The two drift through every iteration. Three flavors of existing fix all fall short:

- **tRPC** treats TS types as the contract — but server-author-led, no OpenAPI, TS-only on both sides.
- **OpenAPI codegen** is BE-first and tedious; FE types become a derivative artifact maintained by hand.
- **Manual sync** is where most teams actually live. Badly.

The frontend is almost always where the data shape is most *precisely* required — because the UI can't lie about what it renders. Inverting the direction so FE schemas are the source of truth is the right move. No production tool today lets AI agents perform that bridge.

---

## The Solution

`@forgekit/bff-mcp` is an MCP server that:

1. **Scans** the FE codebase for exported schemas (Zod first, Effect/Schema + TypeBox in v0.2).
2. **Builds a unified contract model** from them.
3. **Generates**:
   - BFF endpoint scaffolds (Hono first; Fastify v0.2)
   - Zod-validated route handlers
   - OpenAPI 3.1 spec
   - TanStack Query client hooks with cache keys + types
   - Integration test scaffolds
4. **Exposes the above as MCP tools** so Claude / Cursor / Copilot agents can drive the generate → regenerate → refactor flow directly inside the user's editor or terminal.

---

## Architecture Decisions

| Decision | Choice | Reason |
|---|---|---|
| **Server framework** | Hono (v0.1) | Modern, Cloudflare Workers ready, native Zod-OpenAPI integration, fastest-growing 2026 |
| **Schema library** | Zod (v0.1) | Largest ecosystem, most stable, real `@hono/zod-openapi` integration exists |
| **Upstream RPC framework dependency** | None | Build direct on Hono+Zod rather than oRPC / tRPC / ts-rest. Keeps full control of generated code shape. Users aren't downstream of another framework's roadmap or opinions. |
| **Default auth provider** | Better Auth | TypeScript-native, framework-agnostic, plays well with TanStack stack. See **Auth Strategy** for the full provider matrix. |
| **Codegen approach** | AST-driven via `ts-morph`, output via `prettier` | Generated code reads like hand-written code; diffable, auditable, no runtime overhead |
| **Generation lifecycle** | Checked in, not regenerated at runtime | Files end in `.generated.ts`. Hand-written escape hatches sit alongside as `.ts`. Generator never touches hand-written files. |
| **Escape hatch principle** | 70/30 | Generate the CRUD + computed-views layer (~70% of typical routes). Hand-write auth, multi-tenancy, complex business logic, query optimization (~30%). |
| **MCP tool surface** | 6 tools | Scan, plan, generate, regenerate, validate, doc. |

---

## MCP Tools (v0.1)

| Tool | Purpose |
|---|---|
| `scan-fe-schemas` | Walk an FE codebase, find exported Zod schemas, return a contract model |
| `plan-bff-routes` | Take a contract model + naming conventions, return a proposed route map (paths, methods, request/response shapes) |
| `generate-routes` | Generate Hono route files, handlers, validation, and types from the plan |
| `generate-client-hooks` | Emit TanStack Query hooks + cache keys + types for the FE |
| `generate-openapi` | Emit an OpenAPI 3.1 spec from the contract model |
| `regenerate-route` | Re-run generation for a single route after a schema change, preserving hand-written siblings |

---

## Generation Targets (v0.1)

For each FE schema named `User`, `Project`, `Task`, etc., the server scaffolds:

```
apps/api/src/routes/users/
  list.generated.ts          GET    /users
  get.generated.ts           GET    /users/:id
  create.generated.ts        POST   /users
  update.generated.ts        PATCH  /users/:id
  delete.generated.ts        DELETE /users/:id
  middleware.ts              (hand-written: auth, tenancy)
  persistence.ts             (hand-written: db, query optimization)

apps/web/src/api/users/
  hooks.generated.ts         (useUsers, useUser, useCreateUser, …)
  types.generated.ts
  keys.generated.ts          (TanStack Query cache keys)

openapi.generated.yaml
```

---

## The 70/30 Escape-Hatch Principle

What the generator **does**:

- ✅ Standard CRUD (list, get, create, update, delete)
- ✅ Computed views (filtered lists, aggregations defined as schemas)
- ✅ Validation, types, OpenAPI docs
- ✅ Client hooks with cache keys + optimistic update boilerplate

What the user **hand-writes**:

- 🛠 Auth context resolution (which user, what role)
- 🛠 Multi-tenancy boundaries (which org, workspace)
- 🛠 Query optimization (joins, indexes, projection)
- 🛠 Complex business logic (workflows, state machines)
- 🛠 Side effects (emails, webhooks, audit logs)

Generated files use a `.generated.ts` suffix. Hand-written siblings live next to them. The generator never overwrites hand-written code. Re-generation only touches `.generated.ts`.

This is the most important design call in the project. **Every "no-code backend" tool that's failed has failed by trying to generate auth and business logic.** We explicitly don't.

---

## Auth Strategy

Auth is the canonical example of "human-judgment-heavy, not schema-driven." The generator does *not* try to scaffold auth from schemas. Instead, `@forgekit/bff-mcp` ships a small set of **selectable auth integrations**, chosen at scaffold time, each exposing the same typed middleware contract.

### Selectable providers (v0.1)

| Provider | When to pick | Notes |
|---|---|---|
| **Better Auth** | Default | TypeScript-native, framework-agnostic, self-hosted. Strongest fit with the FE-led + Hono + Cloudflare stack. |
| **Clerk** | "Auth solved this afternoon" | Drop-in paid SaaS, best DX of the hosted options |
| **Supabase Auth** | Already on Supabase | Bundles cleanly with your existing DB |
| **WorkOS AuthKit** | B2B / enterprise SSO | SAML, OIDC, directory sync |
| **First-party email + password** | No third party | Boilerplate, you maintain. (Lucia is deprecated; we don't recommend it.) |

OAuth providers (Google, GitHub, Apple, Microsoft, etc.) are configured **inside** the chosen integration — they aren't a separate dimension. Better Auth, Clerk, Supabase, and WorkOS all handle the OAuth dance internally.

### Middleware contract

Every auth integration drops the same typed shape into `middleware.ts`, so generated routes stay provider-agnostic:

```typescript
// apps/api/src/middleware.ts  (populated by the scaffold from your picked provider)
export const requireUser = (c: Context) => { /* … */ };
export const requireRole = (c: Context, role: Role) => { /* … */ };
export const getCurrentUser = (c: Context) => { /* … */ };
```

Generated routes consume that contract without caring which provider is wired underneath:

```typescript
// apps/api/src/routes/users/update.generated.ts
app.patch('/users/:id', requireUser, async (c) => {
  // generated CRUD body
});
```

### Selection mechanism

At scaffold time, the user picks via CLI prompt or `forgekit-bff.config.ts`:

```typescript
// forgekit-bff.config.ts
export default {
  auth: {
    provider: 'better-auth', // 'better-auth' | 'clerk' | 'supabase' | 'workos' | 'email'
    oauth: ['google', 'github'], // provider-dependent
  },
};
```

The generator wires:

- The chosen provider's middleware into `middleware.ts`
- Env-var template into `.env.example`
- Provider setup instructions into the package README
- Typed `User` and `Role` into `apps/api/src/types/auth.ts` that the rest of the codebase consumes

### Escape hatch

You can rip and replace any provider. `middleware.ts` is hand-written from day one — just *populated* by the scaffold. Swap Better Auth for a custom JWT setup three months in by editing `middleware.ts`. Generated routes don't change.

---

## Differentiation

| | tRPC | ts-rest | oRPC | Hono+Zod+OpenAPI | Encore.ts | **@forgekit/bff-mcp** |
|---|---|---|---|---|---|---|
| Schema as contract | ✅ | ✅ | ✅ | ✅ | ⚪ partial | ✅ |
| OpenAPI 3.1 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **FE-led design** | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| **MCP-native** | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| **AI-agent-callable** | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| Framework-agnostic FE | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Generated code checked in | ⚪ | ⚪ | ⚪ | ⚪ | ✅ | ✅ |

**oRPC** is the closest existing tool to where we're heading — type-safe RPC + REST, schema-as-contract, OpenAPI as a first-class output, framework-agnostic on both sides. The key difference: oRPC is still **server-author-led** (the contract author writes the server first), and it doesn't expose anything to AI agents. That's exactly the gap `@forgekit/bff-mcp` fills.

The defensible position is the bottom three rows: **FE-led + MCP-native + AI-agent-callable.** oRPC stacks the rest; nothing today stacks those three.

---

## Dogfood Demo (the YC "Cool Hack" Beat)

The proof point — same shape as "ForgeKit was scaffolded by ForgeKit" — is to dogfood `bff-mcp` on an existing ForgeKit-scaffolded app:

1. Pick an existing ForgeKit-scaffolded app with a hand-written backend.
2. Replace the hand-written CRUD routes with generated ones via the MCP server, driven by Claude.
3. Show the diff: ~500 LOC of boilerplate eliminated, types in lockstep, FE/BE drift mathematically impossible.
4. Record a <2 minute demo: agent introspects FE schemas → generates BFF → runs integration tests → green.

This becomes the readme hero video and the launch tweet.

---

## Open Questions

1. **Zod-first or Effect/Schema-first?** Zod has the larger market today. Effect/Schema is technically more powerful and accelerating. **Decision:** Zod for v0.1 with a `SchemaAdapter` interface so Effect/Schema and TypeBox can land in v0.2 without rewriting the generator.
2. **REST-only first?** Yes — v0.1 is REST. GraphQL and server-action variants come as separate adapter packages in v0.3+.
3. **Multi-language BE?** v0.1 TypeScript only (Hono). v0.4+ adapters for Python (FastAPI) and Go (echo). The contract model is language-agnostic; only the generator is language-specific.
4. **Conflict resolution on regenerate?** If a schema changes in a way that would break a hand-written file, surface a structured warning via the MCP tool response — don't silently regenerate.
5. **Naming + path conventions?** v0.1 picks one (`/users` plural, `/:id` for entity lookup, kebab-case multi-word). v0.2 makes it configurable via a `forgekit-bff.config.ts`.

(Auth strategy resolved — see the **Auth Strategy** section above.)

---

## v0.1 Milestone (Shippable)

The MVP that proves the concept on npm:

- [ ] Scan a directory for exported Zod schemas (`ts-morph`)
- [ ] Build a contract model (paths, methods, request/response schemas)
- [ ] Generate Hono route files for full CRUD per schema
- [ ] Generate Zod-validated handlers
- [ ] Generate OpenAPI 3.1 spec
- [ ] Generate TanStack Query hooks (`useX`, `useCreateX`, `useUpdateX`, `useDeleteX`) with cache keys + types
- [ ] MCP server exposing `scan-fe-schemas`, `plan-bff-routes`, `generate-routes`
- [ ] 80%+ unit test coverage (Vitest)
- [ ] One end-to-end integration test against a sample app
- [ ] README with the dogfood demo embedded
- [ ] Semantic-release pipeline + npm publish

**Target effort:** 4–6 weeks of focused part-time work.

---

## v0.2+ Roadmap

- Effect/Schema adapter
- TypeBox + ArkType adapters
- Fastify adapter (`@fastify/swagger`-based)
- `regenerate-route` with diff preservation
- OpenAPI import (generate FE schemas *from* an existing API — the inverse direction)
- VS Code extension hooks
- Cloudflare Workers deploy adapter
- Server-action variant (Next.js / TanStack Start)

---

## How This Slots Into ForgeKit

The ForgeKit suite becomes a five-package stack covering the full design-to-deployment loop:

| Package | What it does | Stage of the loop |
|---|---|---|
| `@forgekit/cli` | Scaffolds Nx monorepos with React + Storybook + CI | **Setup** |
| `@forgekit/figma-mcp` | Figma tokens → React types & themes | **Design → Tokens** |
| `@forgekit/storybook-mcp` | Components → stories + docs | **Components → Docs** |
| `@forgekit/context-mcp` | Codebase context for AI agents | **Codebase → Agent** |
| **`@forgekit/bff-mcp`** | **FE schemas → BFF endpoints** | **FE → Backend** |

That's the entire vertical: **Figma → Components → Stories → Schemas → Backend**, every step AI-agent-callable via MCP, every step verifiable via dogfood.

This is the closing pillar of the ForgeKit thesis. The recursive scaffold story extends from "ForgeKit was scaffolded by ForgeKit" to "ForgeKit's backend was generated from ForgeKit's frontend by ForgeKit." That's not a feature list — that's a product manifesto.

---

## Next Steps

Once this scope is approved:

1. **Scaffold the package** under `packages/bff-mcp/` using Nx (matches the existing `figma-mcp`, `storybook-mcp`, `context-mcp` conventions).
2. **Draft `tasks/todo.md`** for v0.1 implementation per your CLAUDE.md workflow — discrete, testable, mergeable steps.
3. **Build v0.1 incrementally** — start with `scan-fe-schemas` (read-only, testable in isolation), then `plan-bff-routes`, then `generate-routes`.
4. **Dogfood checkpoint at week 3** — run the scanner on the existing `forgekit-v2` monorepo and confirm the contract model holds water before writing generators.

---

## Decisions Needed From Rich

**Locked:**

- ✅ Hono + Zod direct for v0.1 (no upstream RPC framework dependency)
- ✅ Better Auth as the default auth provider
- ✅ FE-led + MCP-native as the defensible position; oRPC is comparable, not a dependency

**Still open:**

1. **v0.1 scope creep guardrails.** Anything in the v0.1 list above you want to *cut* to ship sooner? My instinct is OpenAPI generation is the optional one — every other tool already does it — but it's also the cheapest signal of legitimacy.
2. **Package name.** `@forgekit/bff-mcp` is the working name. `forgekit-api-mcp` would be broader and could play better with non-BFF use cases. Sticking with `bff-mcp` if the BFF framing is the differentiated position.

Once those land, I'll scaffold the package skeleton (package.json, tsconfig, Nx project config, empty MCP server boot) and draft `tasks/todo.md` for v0.1.
