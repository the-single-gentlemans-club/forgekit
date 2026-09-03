# CLAUDE.md

ForgeKit — an Nx monorepo of Model Context Protocol (MCP) servers, a Figma plugin library, and shared TypeScript libraries connecting Figma, Storybook, and component codebases.

Stack: TypeScript 5.9, React 19, Nx 22, Vitest 4, Storybook 10, Tailwind 4, `@modelcontextprotocol/sdk` ^1.26. Package manager is **npm** (`package-lock.json`).

## Project map

All code lives in `packages/` — there is no `apps/` directory.

Published MCP servers:

- `storybook-mcp` → `forgekit-storybook-mcp` — stories, tests, docs, Code Connect, sync, health (15 tools). Bins: `forgekit-storybook-mcp`, `storybook-mcp`
- `figma-mcp` → `forgekit-figma-mcp` — syncs Figma variables into Chakra theme files (`sync-theme`). Bin: `forgekit`
- `context-mcp` → `forgekit-context` — orchestrates Figma + Storybook MCP for gaps, drift, onboarding, Code to Canvas (7 tools). Not yet on npm. Bins: `forgekit-context`, `context-mcp`
- `bff-mcp` → `@forgekit/bff-mcp`

Libraries:

- `mcp-core` → `@forgekit/mcp-core` — shared MCP transports (`createStdioMcpClient`, `createHttpMcpClient`, `callTool`)
- `figma-plugin` → `@forgekit/figma-plugin` — token sync, palette/spacing/typography builders, `setupPlugin()` orchestration
- `design-system` → `@forgekit/design-system`
- `utils`, `strings`, `colors`, `async` → `@forgekit/*`

Each package has its own README with tool-level detail; the root README.md has the full package table.

<important if="you need to run a build, test, lint, typecheck, storybook, or release command">

Run from the repo root — Nx resolves the project.

| Command | What it does |
|---|---|
| `npm run build` | `nx run-many -t build` |
| `npm test` | `nx run-many -t test` |
| `npm run lint` | `nx run-many -t lint --fix` |
| `npm run typecheck` | `nx run-many -t typecheck` |
| `npm run storybook` | Storybook dev server on port 6006 |
| `npm run build-storybook` | Build Storybook |
| `npm run release` | `nx release` |
| `npm run release:version` | `nx release version` |
| `npm run release:changelog` | `nx release changelog` |
| `npm run publish:figma-plugin` | Publish `figma-plugin` |
| `nx run <project>:<target>` | Any single project target |

Prefer `nx affected -t lint,test,build` over `run-many` when iterating on a branch.
</important>

<important if="you are adding or changing an MCP tool, server, or transport">

- Servers are built on `@modelcontextprotocol/sdk` ^1.26 — check the installed version's API surface rather than assuming, the SDK moves fast.
- Share client/transport code through `@forgekit/mcp-core` instead of re-implementing stdio/HTTP clients per server.
- A tool that shells out to installs or long-running work must run **async** child processes, and callers must pass an explicit timeout — the MCP `callTool()` default (~60s) will otherwise kill multi-minute tools.
- Each server exposes CLI bins (see the project map); keep `package.json` `bin` entries in sync when renaming.
</important>

<important if="you are writing or fixing tests">

Vitest 4 across all packages. Vitest 4 dropped workspace files — use `defineProject` in per-package config, not a root workspace file.
</important>

<important if="you are cutting a release or publishing a package">

Releases go through `nx release` (`release:version` → `release:changelog` → publish targets), not manual `npm publish`. Note which packages are published vs internal — `@forgekit/*`-scoped libraries are internal; the `forgekit-*` unscoped names are the npm-published servers.

After a release, update the `What's New in {version}` section of README.md, leading with new features and notable fixes.
</important>

<important if="you are adding or updating documentation for a package">

Each package owns its README.md; the root README.md carries the package table and must stay consistent with it when packages are added, renamed, or published.
</important>

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
