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

# Package: @org/utils

Shared internal utilities used as the foundation layer for other packages. **Not published to npm.**

## Key facts

- **Nx project name**: `utils`
- **Package name**: `@org/utils`
- **Publishable**: no (`private: true`, excluded from `nx release`)
- **Tag**: `scope:shared`
- **Entry point**: `src/index.ts`
- **Runtime**: ESM, zero runtime dependencies

## Module boundaries

This is the base layer of the dependency graph.

- **Can be imported by**: all other packages (`scope:strings`, `scope:async`, `scope:colors`)
- **May import from**: nothing inside the workspace

Do not add imports from `@org/strings`, `@org/async`, or `@org/colors`. Doing so creates a cycle and will fail lint.

## Design rules

- Keep code generic. No domain-specific logic (strings / colors / async) belongs here.
- No runtime dependencies. Pure TypeScript/standard lib only.
- Changes here can ripple through every other package; prefer additive changes and cover new APIs with tests.

## Common commands

Always prefer Nx over running eslint/tsc directly.

```bash
nx build utils            # build library
nx lint utils             # lint
nx typecheck utils        # type check
nx show project utils     # inspect targets and config
nx graph                  # visualize dependents
```

## Notes for Claude

- Because this package is private, it is not part of `nx release`. Version bumps are not required.
- When adding APIs, export them from `src/index.ts` so consumers can reach them via `@org/utils`.
- See the workspace-level `CLAUDE.md` for agent-skill references (issue tracker, triage labels, domain docs).
