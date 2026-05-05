# ForgeKit

> AI-powered MCP tools for Storybook story generation, Figma integration, and design-system automation.

ForgeKit is an Nx monorepo that provides MCP (Model Context Protocol) servers to bridge Figma design systems and React/Storybook component libraries. It's designed to work with Claude, Cursor, and other MCP-compatible AI assistants.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`packages/storybook-mcp`](packages/storybook-mcp/README.md) | [forgekit-storybook-mcp](https://npmjs.com/package/forgekit-storybook-mcp) | Story generation, component analysis, Figma Code Connect (15 tools) |
| [`packages/context-mcp`](packages/context-mcp/README.md) | `forgekit-context` (coming soon) | Orchestration layer: gap analysis, drift detection, Code to Canvas |
| [`packages/figma-mcp`](packages/figma-mcp/README.md) | internal | Figma MCP integration |
| [`packages/figma-plugin`](packages/figma-plugin/README.md) | internal | Figma plugin |
| [`packages/mcp-core`](packages/mcp-core/README.md) | internal | Shared MCP client factories (`createStdioMcpClient`, `createHttpMcpClient`, `callTool`) |
| [`packages/async`](packages/async/README.md) | internal | Async utility helpers |
| [`packages/colors`](packages/colors/README.md) | internal | Color utility helpers |
| [`packages/strings`](packages/strings/README.md) | internal | String utility helpers |
| [`packages/utils`](packages/utils/README.md) | internal | Shared general utilities |

## Tech stack

| Technology | Role |
|------------|------|
| **Nx** | Monorepo build system — tasks, caching, release management |
| **TypeScript 5.9 (strict)** | All packages |
| **`@modelcontextprotocol/sdk`** | MCP server/client wiring |
| **Vitest** | Testing framework across all packages |
| **tsup + vite-plugin-dts** | Library bundling |
| **ESLint (flat config, v9) + Prettier** | Linting & formatting |
| **Verdaccio** | Local npm registry for testing publishes |
| **Husky + lint-staged** | Git hooks |

## What you can do

### With `forgekit-storybook-mcp`

| Tool | Description |
|------|-------------|
| `list_components` | Scan project for React components |
| `analyze_component` | Extract props, deps, suggestions from a component |
| `generate_story` | Create a Storybook story (8 templates: basic, form, MSW, router, page, interactive, etc.) |
| `update_story` | Regenerate template sections while preserving user-written exports |
| `validate_story` | Check story for best-practice violations |
| `get_story_template` / `list_templates` | Retrieve raw templates |
| `get_component_coverage` | Coverage stats across the project |
| `suggest_stories` | Prioritized list of components needing stories |
| `sync_all` / `sync_component` | Batch-create/update stories + tests + docs |
| `generate_test` | Playwright/Vitest test file from component analysis |
| `generate_docs` | MDX documentation page |
| `generate_code_connect` | Figma Code Connect `.figma.tsx` files (Pro tier) |
| `check_health` | Diagnose Storybook installation issues |

Also exposes 3 MCP resources: `storybook://libraries`, `storybook://patterns`, `storybook://config`.

### With `forgekit-context`

| Tool | Description |
|------|-------------|
| `get_design_system_state` | Full snapshot: Figma tokens + Code Connect + component coverage |
| `get_gaps` | Components in Figma without code (and vice versa), code without stories |
| `get_component` | Merged Figma + React analysis for a specific component |
| `get_drifted_components` | Find hardcoded hex/px values that should be design tokens |
| `get_missing_components` | Figma components with no Code Connect mapping |
| `onboard` | Bootstrap `.forgekit/rules.md` from Figma design rules |
| `sync_stories_to_figma` | Push Storybook renders into Figma as editable frames |

## Architecture

```
AI Assistant (Claude / Cursor)
        │
        │  MCP Protocol (stdio)
        ▼
┌─────────────────────────────┐
│   forgekit-context-mcp      │  ← orchestration layer
│   (ForgeKitOrchestrator)    │
└─────┬──────────┬────────────┘
      │          │ uses @forgekit/mcp-core
      ▼          ▼
 Figma MCP    Storybook MCP      Figma Dev Mode
 (stdio)      (stdio)            (HTTP :3845)
```

The `ForgeKitOrchestrator` class manages three simultaneous MCP client connections:

- **Figma MCP** — stdio subprocess (the official Figma MCP server)
- **Storybook MCP** — stdio subprocess (`forgekit-storybook-mcp`)
- **Figma Dev Mode MCP** — HTTP at `localhost:3845` (Figma desktop app)

## Quick start

```bash
# Install dependencies
NODE_ENV=development npm install

# Build all packages
npx nx run-many -t build --parallel=3

# Test all packages
NODE_ENV=development npx nx run-many -t test --parallel=3

# Build a specific package
npx nx build forgekit-storybook-mcp
npx nx build forgekit-context
```

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

### Full ForgeKit stack (Storybook + Figma)

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

## Project structure

```
forgekit/
├── packages/
│   ├── storybook-mcp/       # MCP server — story generation + Figma Code Connect
│   │   └── src/
│   │       ├── tools.ts             # All 15 tool implementations
│   │       ├── index.ts             # Server wiring
│   │       └── utils/               # scanner, generator, merger, history, etc.
│   ├── context-mcp/         # MCP server — Figma + Storybook orchestration
│   │   └── src/
│   │       ├── orchestrator.ts      # ForgeKitOrchestrator class
│   │       ├── server.ts            # MCP server with 7 tools
│   │       ├── cli.ts               # CLI entry point
│   │       └── tools/               # Individual tool implementations
│   ├── figma-mcp/           # Figma MCP integration
│   ├── figma-plugin/        # Figma plugin
│   ├── mcp-core/            # Internal — shared MCP client factories
│   │   └── src/lib/
│   │       └── mcp-core.ts          # createStdioMcpClient, createHttpMcpClient, callTool
│   ├── async/               # Async utility helpers
│   ├── colors/              # Color utility helpers
│   ├── strings/             # String utility helpers
│   └── utils/               # Shared general utilities
├── nx.json
├── tsconfig.base.json
├── vitest.workspace.ts
├── eslint.config.mjs
└── package.json
```

## Licensing

| Tier | Features |
|------|----------|
| **Free** | `list_components`, `analyze_component`, `generate_story`, `validate_story`, `get_component_coverage`, `suggest_stories`, `check_health` |
| **Pro** | `update_story`, `generate_code_connect`, full `sync_all` / `sync_component`, all `context-mcp` tools |

Pro license enforced via `utils/license.ts` and `requireFeature()` calls throughout the codebase.

## Releases

New features are developed here and released via the standalone repo:

- **Storybook MCP** → [github.com/the-single-gentlemans-club/storybook-mcp](https://github.com/the-single-gentlemans-club/storybook-mcp)
- **Docs** → [forgekit.cloud](https://forgekit.cloud)
- **npm** → [forgekit-storybook-mcp](https://npmjs.com/package/forgekit-storybook-mcp)

## License

Free tier available. Pro license at [forgekit.cloud](https://forgekit.cloud) — $29 launch price.
