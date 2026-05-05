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

# Package: @org/colors

Color conversion and manipulation utilities. Published to npm.

## Key facts

- **Nx project name**: `colors`
- **Package name**: `@org/colors`
- **Publishable**: yes
- **Tag**: `scope:colors`
- **Entry point**: `src/index.ts` re-exports `src/lib/colors.ts`
- **Runtime**: ESM, pure functions, no runtime deps beyond `tslib`

## Module boundaries

Enforced by ESLint via Nx tags. This package may only import from:

- `@org/utils` (`scope:shared`)

Do not import from `@org/strings` or `@org/async`.

## Public surface

- `hexToRgb`, `rgbToHex`
- `lighten`, `darken`

Inputs should be validated; keep error behavior consistent across helpers. Breaking changes must flow through `nx release` with a conventional commit.

## Common commands

Always prefer Nx over running vite/eslint/vitest directly.

```bash
nx build colors           # build library
nx test colors            # run tests
nx lint colors            # lint
nx typecheck colors       # type check
nx show project colors    # inspect targets and config
```

## Notes for agents

- Functions are pure: no I/O, no globals, no mutation of inputs.
- Prefer supporting both `#RGB` and `#RRGGBB` forms consistently when extending hex parsing.
- Clamp channel values to `0-255` and percentages to `0-100` rather than throwing, unless the existing helpers throw.
