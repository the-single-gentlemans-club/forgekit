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

# Package: @org/async

Async utility functions with retry logic, timeouts, and error handling. Published to npm.

## Key facts

- **Nx project name**: `async`
- **Package name**: `@org/async`
- **Publishable**: yes
- **Tag**: `scope:async`
- **Entry point**: `src/index.ts` re-exports `src/lib/async-retry.ts`
- **Runtime**: ESM, Node/browser compatible, no runtime deps beyond `tslib`

## Module boundaries

Enforced by ESLint via Nx tags. This package may only import from:

- `@org/utils` (`scope:shared`)

Do not import from `@org/strings` or `@org/colors`.

## Public surface

Keep the surface stable since this is publishable:

- `retry`, `createRetry`, `withRetry`
- `retryAll`, `retryRace`, `retryAllSettled`
- `RetryOptions`, `RetryWithTimeoutOptions`
- `TimeoutError`

Breaking changes must flow through `nx release` with a conventional commit.

## Common commands

Always prefer Nx over running vite/eslint/vitest directly.

```bash
nx build async           # build library
nx test async            # run tests (contains an intentional failure for CI demo)
nx lint async            # lint
nx typecheck async       # type check
nx show project async    # inspect targets and config
```

## Notes for Claude

- This package contains an **intentionally failing test** in `async-retry.spec.ts` used to demonstrate `nx fix-ci`. Do not "fix" it unless the user explicitly asks.
- Prefer exponential-backoff semantics consistent with the existing `retry` implementation when adding new helpers.
- Do not introduce runtime dependencies; keep the package zero-dep beyond `tslib`.
- See the workspace-level `CLAUDE.md` for agent-skill references (issue tracker, triage labels, domain docs).
