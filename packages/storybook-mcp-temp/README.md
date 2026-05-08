# forgekit-storybook-mcp (monorepo)

> Development home of [forgekit-storybook-mcp](https://npmjs.com/package/forgekit-storybook-mcp) — the MCP server for Storybook story generation, component analysis, and Figma Code Connect.

The published npm package lives at [`d:/documents-from-c/GitHub/storybook-mcp-v2`](https://github.com/the-single-gentlemans-club/storybook-mcp). New features are developed here in the Nx monorepo and then ported to the standalone repo for release.

## What this package does

`forgekit-storybook-mcp` is a Model Context Protocol server that integrates with Claude, Cursor, and other MCP-compatible AI assistants to automate your Storybook workflow.

### Tools (15 total)

| Tool                     | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| `list_components`        | List and filter components across configured libraries |
| `analyze_component`      | Extract props, dependencies, framework detection       |
| `generate_story`         | Generate stories with 8 template options               |
| `update_story`           | Regenerate a story while preserving custom exports     |
| `generate_test`          | Generate Playwright or Vitest tests                    |
| `generate_docs`          | Generate MDX documentation pages                       |
| `generate_code_connect`  | Generate Figma Code Connect `.figma.tsx` files         |
| `validate_story`         | Validate story syntax and imports                      |
| `sync_all`               | Sync stories/tests/docs for all components             |
| `sync_component`         | Sync a single component                                |
| `get_story_template`     | Retrieve a raw story template                          |
| `list_templates`         | List all available templates                           |
| `get_component_coverage` | Coverage report for stories/tests/docs                 |
| `suggest_stories`        | AI suggestions for story improvements                  |
| `check_health`           | Diagnose Storybook configuration issues                |

### Story templates

`basic`, `with-controls`, `with-variants`, `with-msw`, `with-router`, `page`, `interactive`, `form`

### Framework detection

Auto-detects at component level: Chakra UI, shadcn/ui, Tamagui, Gluestack UI, React Native

## Development

```bash
# Build
npx nx build forgekit-storybook-mcp

# Test (all 169 tests)
NODE_ENV=development npx nx test forgekit-storybook-mcp

# Lint
npx nx lint forgekit-storybook-mcp
```

## Key source files

| File                                  | Purpose                                            |
| ------------------------------------- | -------------------------------------------------- |
| `src/tools.ts`                        | All 15 MCP tool implementations                    |
| `src/index.ts`                        | MCP server wiring (tool registration + dispatch)   |
| `src/utils/scanner.ts`                | Component analysis and framework detection         |
| `src/utils/generator.ts`              | Story generation with template rendering           |
| `src/utils/test-generator.ts`         | Playwright/Vitest test generation                  |
| `src/utils/docs-generator.ts`         | MDX documentation generation                       |
| `src/utils/story-merger.ts`           | Merge logic for `update_story`                     |
| `src/utils/story-history.ts`          | Version tracking in `.forgekit/story-history.json` |
| `src/utils/code-connect-generator.ts` | Figma Code Connect file generation                 |
| `src/utils/license.ts`                | Feature access (open source — all enabled)         |
| `src/utils/constants.ts`              | All centralized constants                          |

## Porting releases

After testing changes here:

1. Copy modified files to `storybook-mcp-v2/src/`
2. Run `NODE_ENV=development npm test` in `storybook-mcp-v2`
3. Build: `npm run build`
4. Follow the [release checklist](https://github.com/the-single-gentlemans-club/storybook-mcp#release-checklist)

## Related packages

- [`forgekit-context`](../context-mcp/README.md) — orchestration layer that calls this server
- [`@forgekit/mcp-core`](../mcp-core/README.md) — shared MCP client factories

## Published package

- **npm**: [forgekit-storybook-mcp](https://npmjs.com/package/forgekit-storybook-mcp)
- **Docs**: [forgekit.cloud](https://forgekit.cloud)
- **Current version**: 0.11.0
