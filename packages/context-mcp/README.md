# forgekit-context

> **MCP orchestration layer** — bridges Figma and Storybook into a unified AI-powered design-system workflow.

`forgekit-context` is a Model Context Protocol server that connects two downstream MCP clients — Figma's official developer MCP and `forgekit-storybook-mcp` — and exposes seven high-level tools for design-system gap analysis, drift detection, and Figma-to-code synchronization.

## Architecture

```
Claude / Cursor
    └── forgekit-context (this package)
            ├── figma-developer-mcp  (npx subprocess — Figma REST API)
            └── forgekit-storybook-mcp  (node subprocess — Storybook analysis)
```

The Figma connection also optionally bridges to the **Figma desktop Dev Mode MCP server** (`127.0.0.1:3845/sse`) for Code to Canvas support.

## Tools

| Tool | Description |
|------|-------------|
| `get_design_system_state` | Snapshot of Figma tokens, Code Connect map, and component list |
| `get_gaps` | Components in Figma without code, code without Figma, components without stories |
| `get_component` | Design context + Storybook analysis merged for a single component |
| `get_drifted_components` | Components using hardcoded colors/spacing instead of design tokens |
| `get_missing_components` | Figma components not yet linked via Code Connect (with confidence scores) |
| `onboard` | Generate `.forgekit/rules.md` from Figma design rules and preview auto-sync |
| `sync_stories_to_figma` | Push Storybook story renders to Figma as editable frames (Code to Canvas) |

## Requirements

- Node.js 20+
- A Figma access token: **Figma → Account settings → Personal access tokens**
- `forgekit-storybook-mcp` installed (peer dependency)
- For `sync_stories_to_figma`: Figma desktop app with Dev Mode MCP server enabled

## Installation

This package is part of the [ForgeKit monorepo](../../README.md). To use it as a standalone MCP server:

```bash
npm install forgekit-context
```

## Configuration

### With Claude Desktop or Cursor

```json
{
  "mcpServers": {
    "forgekit-context": {
      "command": "npx",
      "args": ["forgekit-context"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "your-token-here",
        "FIGMA_FILE_ID": "abc123",
        "FORGEKIT_LICENSE": "your-license-key"
      }
    }
  }
}
```

### CLI flags

```bash
npx forgekit-context \
  --figma-token=your-token \
  --figma-file=abc123 \
  --project-root=/path/to/project \
  --license-key=your-license \
  --storybook-url=http://localhost:6006
```

All flags can also be set as environment variables: `FIGMA_ACCESS_TOKEN`, `FIGMA_FILE_ID`, `FORGEKIT_LICENSE`.

## Key workflows

### Design-system gap analysis

Ask Claude: "What components exist in Figma but don't have stories yet?"

The `get_gaps` tool cross-references:
- Figma components (via Code Connect map)
- Code components (via `forgekit-storybook-mcp`)
- Storybook stories

### Drift detection

"Which components have hardcoded colors instead of using design tokens?"

`get_drifted_components` scans component source files for raw hex values and pixel sizes, then maps them to the nearest Figma variable.

### Code to Canvas

Push every component's Default story render into Figma as an editable frame:

```json
{
  "storybookUrl": "http://localhost:6006",
  "dryRun": true
}
```

Requires Figma desktop with Dev Mode MCP server enabled:
**Figma menu → Preferences → Enable Dev Mode MCP Server**

## Development

```bash
# Build
npx nx build forgekit-context

# Test
NODE_ENV=development npx nx test forgekit-context

# Run locally
node packages/context-mcp/dist/cli.js --figma-token=xxx --project-root=.
```

## Package info

- **npm**: `forgekit-context` (coming soon)
- **Source**: `packages/context-mcp/src/`
- **Entry**: `src/cli.ts` → `dist/cli.js`
- **Peer dependencies**: `forgekit-storybook-mcp`, `figma-developer-mcp` (via npx at runtime)
