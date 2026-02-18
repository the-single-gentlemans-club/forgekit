# ForgeKit

> AI-powered MCP tools for Storybook story generation, Figma integration, and design-system automation.

ForgeKit is an Nx monorepo containing two MCP servers and a shared transport library. Together they bridge the gap between your Figma design system and your React component library through Claude, Cursor, and other MCP-compatible AI assistants.

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| [`packages/storybook-mcp`](packages/storybook-mcp/README.md) | [forgekit-storybook-mcp](https://npmjs.com/package/forgekit-storybook-mcp) | Story generation, component analysis, Figma Code Connect (15 tools) |
| [`packages/context-mcp`](packages/context-mcp/README.md) | `forgekit-context` (coming soon) | Orchestration layer: gap analysis, drift detection, Code to Canvas |
| [`packages/mcp-core`](packages/mcp-core/README.md) | internal | Shared MCP client factories (`createStdioMcpClient`, `createHttpMcpClient`, `callTool`) |

## What you can do

### With `forgekit-storybook-mcp`

- **Generate stories** for any React component — 8 templates including interactive, MSW, router, form, and page layouts
- **Update stories** without losing your custom exports (`update_story` merges preserved user blocks)
- **Generate tests** — Playwright and Vitest test files from component analysis
- **Generate MDX docs** — component documentation pages with usage examples
- **Generate Figma Code Connect** — `.figma.tsx` files that link components to Figma Dev Mode
- **Sync everything** — auto-sync all components on startup, or on demand
- **Health checks** — diagnose missing packages, outdated configs, version mismatches

### With `forgekit-context`

- **Gap analysis** — find components in Figma without code, code without Figma, or components without stories
- **Drift detection** — surface hardcoded hex values and pixel sizes that should use design tokens
- **Code to Canvas** — push Storybook story renders into Figma as editable frames (via Figma desktop Dev Mode MCP)
- **Onboarding** — generate `.forgekit/rules.md` from Figma design rules and preview sync output

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
│   ├── storybook-mcp/     # MCP server — story generation + Figma Code Connect
│   │   └── src/
│   │       ├── tools.ts           # All 15 tool implementations
│   │       ├── index.ts           # Server wiring
│   │       └── utils/             # scanner, generator, merger, history, etc.
│   ├── context-mcp/       # MCP server — Figma + Storybook orchestration
│   │   └── src/
│   │       ├── orchestrator.ts    # ForgeKitOrchestrator class
│   │       ├── server.ts          # MCP server with 7 tools
│   │       ├── cli.ts             # CLI entry point
│   │       └── tools/             # Individual tool implementations
│   └── mcp-core/          # Internal — shared MCP client factories
│       └── src/lib/
│           └── mcp-core.ts        # createStdioMcpClient, createHttpMcpClient, callTool
├── nx.json
└── package.json
```

## Releases

New features are developed here and released via the standalone repo:

- **Storybook MCP** → [github.com/the-single-gentlemans-club/storybook-mcp](https://github.com/the-single-gentlemans-club/storybook-mcp)
- **Docs** → [forgekit.cloud](https://forgekit.cloud)
- **npm** → [forgekit-storybook-mcp](https://npmjs.com/package/forgekit-storybook-mcp)

## License

Free tier available. Pro license at [forgekit.cloud](https://forgekit.cloud) — $29 launch price.
