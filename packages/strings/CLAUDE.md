<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->

# Package: @org/strings

String manipulation utilities. Published to npm.

## Key facts

- **Nx project name**: `strings`
- **Package name**: `@org/strings`
- **Publishable**: yes
- **Tag**: `scope:strings`
- **Entry point**: `src/index.ts`
- **Runtime**: ESM, pure functions, no runtime deps beyond `tslib`

## Module boundaries

Enforced by ESLint via Nx tags. This package may only import from:

- `@org/utils` (`scope:shared`)

Do not import from `@org/colors` or `@org/async`.

## Public surface

- `capitalize`
- `slugify`

Breaking changes must flow through `nx release` with a conventional commit.

## Custom targets

This package defines a custom `build-base` target that `build` depends on (see `package.json > nx.targets`). When modifying build behavior, update `build-base` rather than bypassing it.

## Common commands

Always prefer Nx over running vite/eslint/vitest directly.

```bash
nx build strings                 # build library (runs build-base first)
nx run strings:build-base        # run only the custom pre-build step
nx test strings                  # run tests
nx lint strings                  # lint
nx typecheck strings             # type check
nx show project strings          # inspect targets and config
```

## Notes for Claude

- Keep functions pure and Unicode-safe. Normalize input before operating on characters when adding helpers.
- If you add a new public API, export it from `src/index.ts` and add tests under `src/lib`.
- See the workspace-level `CLAUDE.md` for agent-skill references (issue tracker, triage labels, domain docs).
