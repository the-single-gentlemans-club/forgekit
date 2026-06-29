# @forgekit/bff-mcp

> MCP server: **FE schemas → BFF endpoints** (Hono + Zod + OpenAPI + TanStack Query). FE-led, MCP-native.

**Status:** Pre-v0.1 — under active development. Not yet published to npm.

## What it does

`@forgekit/bff-mcp` is an MCP server that reads your frontend's exported Zod schemas and generates the matching backend-for-frontend:

- Typed **Hono** route handlers (CRUD + computed views)
- **OpenAPI 3.1** spec
- **TanStack Query** client hooks with cache keys and types
- Hand-written **escape hatches** for auth, multi-tenancy, business logic (`.generated.ts` files never overwrite hand-written siblings)

All callable directly from Claude / Cursor / any MCP-compatible agent.

## Why FE-led + MCP-native

| | tRPC | ts-rest | oRPC | Hono+Zod | Encore.ts | **@forgekit/bff-mcp** |
|---|---|---|---|---|---|---|
| Schema as contract | ✅ | ✅ | ✅ | ✅ | ⚪ | ✅ |
| OpenAPI 3.1 | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **FE-led design** | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| **MCP-native** | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |
| **AI-agent-callable** | ❌ | ❌ | ❌ | ❌ | ❌ | **✅** |

## Local dev

```bash
# from forgekit-v2 root
pnpm nx build bff-mcp
pnpm nx test bff-mcp

# run the MCP server (HTTP-only, defaults to localhost:3003)
node packages/bff-mcp/dist/cli.js
```

Connect from Claude Desktop:

```json
{
  "mcpServers": {
    "forgekit-bff": {
      "url": "http://127.0.0.1:3003/mcp"
    }
  }
}
```

## Reference

- [`SCOPE.md`](./SCOPE.md) — product framing, architecture decisions, differentiation
- [`tasks/todo.md`](./tasks/todo.md) — v0.1 implementation plan, step-by-step

## License

MIT © Rich Tillman
