# ForgeKit

> AI-powered MCP tools for Storybook, Figma design tokens, and design-system automation.

ForgeKit is an [Nx](https://nx.dev) monorepo: multiple **Model Context Protocol (MCP)** servers, a small **Figma plugin** library for design-system pages, and shared TypeScript libraries. Together they connect Figma, Storybook, and your component codebase for Claude, Cursor, and other MCP-capable assistants.

## Repository contents

| Package | npm / scope | Role |
|---------|----------------|------|
| [`packages/storybook-mcp`](packages/storybook-mcp/README.md) | [`forgekit-storybook-mcp`](https://www.npmjs.com/package/forgekit-storybook-mcp) | MCP server: Storybook stories, tests, docs, Code Connect, sync, health (15 tools). CLI: `forgekit-storybook-mcp`, `storybook-mcp`. |
| [`packages/context-mcp`](packages/context-mcp/README.md) | `forgekit-context` (publish target; **not on npm yet** — use this repo or link locally) | MCP orchestration: wires Figma developer MCP + Storybook MCP for gaps, drift, onboarding, Code to Canvas (7 tools). CLI: `forgekit-context`, `context-mcp`. |
| [`packages/figma-mcp`](packages/figma-mcp/) | [`forgekit-figma-mcp`](https://www.npmjs.com/package/forgekit-figma-mcp) | MCP server: sync Figma variables into Chakra UI theme files (`sync-theme`). CLI binary: `forgekit`. |
| [`packages/mcp-core`](packages/mcp-core/README.md) | `@forgekit/mcp-core` (internal) | Shared MCP transports: `createStdioMcpClient`, `createHttpMcpClient`, `callTool` — used by `forgekit-context`. |
| [`packages/figma-plugin`](packages/figma-plugin/) | `@forgekit/figma-plugin` | Reusable Figma plugin helpers: token sync, palette/spacing/typography builders, components/screens pages — `setupPlugin()` orchestration for custom plugins. |
| [`packages/utils`](packages/utils/) | `@forgekit/utils` (internal) | Shared utilities. |
| [`packages/strings`](packages/strings/) | `@forgekit/strings` | String helpers (workspace library). |
| [`packages/colors`](packages/colors/) | `@forgekit/colors` | Color helpers (workspace library). |
| [`packages/async`](packages/async/) | `@forgekit/async` | Async helpers (workspace library). |
| [`packages/storybook-mcp-temp`](packages/storybook-mcp-temp/) | — | Nx scaffold / experimental sibling of Storybook MCP (not the published package). |

## What the MCP servers do

### `forgekit-storybook-mcp`

- **Generate stories** — eight templates (interactive, MSW, router, form, page, variants, etc.)
- **Update stories** — regenerate while preserving custom exports (`update_story`)
- **Generate tests** — Playwright and Vitest from component analysis
- **Generate MDX docs** — documentation pages with examples
- **Figma Code Connect** — `.figma.tsx` mappings for Dev Mode
- **Sync** — all components or one component; optional startup sync
- **Health checks** — configuration and dependency diagnostics

Details and tool list: [`packages/storybook-mcp/README.md`](packages/storybook-mcp/README.md).

### `forgekit-context`

- **Gap analysis** — components in Figma without code, code without Figma, missing stories
- **Drift detection** — hardcoded colors/sizes vs design tokens
- **Code to Canvas** — push Storybook renders into Figma (with Figma desktop Dev Mode MCP when enabled)
- **Onboarding** — `.forgekit/rules.md` from Figma design rules

Details: [`packages/context-mcp/README.md`](packages/context-mcp/README.md).

### `forgekit-figma-mcp`

- **Token sync** — fetch variables from Figma and emit Chakra UI theme files (`sync-theme` tool); supports multi-output config via `forgekit.json` / env.

## Tooling (how we develop this repo)

This workspace is managed with **Nx** and **npm workspaces** (`packages/*`).

| Concern | How it works here |
|--------|-------------------|
| **Tasks** | Prefer `npx nx run <project>:<target>` or `npx nx run-many -t <target>`. Common targets are inferred or defined per package: `build`, `test`, `lint`, `typecheck` (see `@nx/js`, `@nx/vite`, `@nx/eslint`, `@nx/vitest` in [`nx.json`](nx.json)). |
| **Build** | Libraries use TypeScript (`tsconfig.lib.json`) and/or **tsup** where packages define it (e.g. MCP packages). |
| **Tests** | **Vitest** (`nx test <project>`). Tests depend on upstream `build` where configured (`targetDefaults` in `nx.json`). |
| **Lint** | **ESLint** flat config ([`eslint.config.mjs`](eslint.config.mjs)), Nx ESLint plugin for project boundaries. |
| **Formatting** | **Prettier** (repo-wide; Tailwind plugin available for Tailwind-aware formatting). |
| **Release** | `npm run release` → `nx release` with conventional commits; `preVersionCommand` runs `nx run-many -t build`. Some packages are excluded from versioning (see `release.projects` in `nx.json`). |
| **Local npm registry** | `npx nx run @forgekit/source:local-registry` — Verdaccio on port **4873** for testing publishes ([`package.json`](package.json) `nx.targets`). |
| **Figma plugin package** | [`packages/figma-plugin`](packages/figma-plugin/) — typings via `@figma/plugin-typings`; publish script at root: `npm run publish:figma-plugin`. |

**Requirements:** Node **20+** is recommended (several packages declare `>=20` or `>=18`; `forgekit-context` README specifies Node 20+).

## Quick start

```bash
# Install (use NODE_ENV=development where the workspace expects it)
export NODE_ENV=development   # PowerShell: $env:NODE_ENV="development"
npm install

# Build everything
npx nx run-many -t build --parallel=3

# Test everything
export NODE_ENV=development
npx nx run-many -t test --parallel=3

# Single packages
npx nx build forgekit-storybook-mcp
npx nx build forgekit-context
npx nx build forgekit-figma-mcp
```

Replace project names with those shown by `npx nx show projects` after install.

## MCP configuration

### Storybook MCP only

```json
{
  "mcpServers": {
    "storybook": {
      "command": "npx",
      "args": ["forgekit-storybook-mcp", "--skip-init"],
      "env": {
        "FORGEKIT_LICENSE": "your-license-key"
      }
    }
  }
}
```

### Full ForgeKit stack (Storybook + Figma orchestration)

Use after installing `forgekit-context` from this monorepo (`npx nx build forgekit-context`, then point MCP `command` / `args` at the built CLI) or when the package is published to npm.

```json
{
  "mcpServers": {
    "forgekit": {
      "command": "npx",
      "args": ["forgekit-context"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your-figma-token",
        "FIGMA_FILE_ID": "your-file-id",
        "FORGEKIT_LICENSE": "your-license-key"
      }
    }
  }
}
```

### Figma token sync MCP (`forgekit-figma-mcp`)

Runs stdio MCP with the `sync-theme` tool. Configure your assistant to launch the published CLI (package `forgekit-figma-mcp`, command `forgekit` — see that package’s README for env vars and `forgekit.json`).

## Project structure

```
forgekit/
├── packages/
│   ├── storybook-mcp/       # forgekit-storybook-mcp — Storybook MCP
│   ├── context-mcp/         # forgekit-context — Figma + Storybook orchestration
│   ├── figma-mcp/           # forgekit-figma-mcp — Figma → Chakra theme sync
│   ├── mcp-core/            # @forgekit/mcp-core — shared MCP clients (internal)
│   ├── figma-plugin/        # @forgekit/figma-plugin — Figma plugin library
│   ├── utils/, strings/, colors/, async/   # shared workspace libraries
│   └── storybook-mcp-temp/  # Nx scaffold / dev variant
├── nx.json
├── eslint.config.mjs
└── package.json
```

## Releases

Features are developed in this monorepo; published artifacts include:

- **Storybook MCP** — also tracked at [github.com/the-single-gentlemans-club/storybook-mcp](https://github.com/the-single-gentlemans-club/storybook-mcp) per package README
- **Docs** — [forgekit.cloud](https://forgekit.cloud)
- **npm** — [forgekit-storybook-mcp](https://www.npmjs.com/package/forgekit-storybook-mcp)

## License

Free tier available. Pro license at [forgekit.cloud](https://forgekit.cloud) — $29 launch price.
