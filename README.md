# ForgeKit

ForgeKit is a collection of small, focused TypeScript utility libraries for everyday tasks — string formatting, async retry patterns, and color manipulation. Each package is independently publishable to npm and designed to be pulled in à la carte.

The repo doubles as a reference implementation for an Nx monorepo with module boundaries, conventional-commit releases, and self-healing CI.

## Packages

| Package | What it does | Key exports |
|---------|--------------|-------------|
| [`@org/strings`](packages/strings) | Text formatting for display and URLs | `capitalize`, `slugify` |
| [`@org/async`](packages/async) | Retry failed promises with backoff | `retry`, `createRetry`, `withRetry`, `retryAll`, `retryRace` |
| [`@org/colors`](packages/colors) | Parse, convert, and adjust colors | `hexToRgb`, `rgbToHex`, `lighten`, `darken`, `getContrastRatio`, `rgbToHsl` |
| [`@org/utils`](packages/utils) | Shared internal helpers (private) | `validateType` |

## Dependency graph

```
strings ─┐
async   ─┼─▶ utils (scope:shared)
colors  ─┘
```

No cross-imports between the published packages. Enforced at lint time via Nx module boundaries.

## Quick start

```bash
npm install
npx nx run-many -t build        # build everything
npx nx run-many -t test         # test everything
npx nx run-many -t lint         # lint everything
npx nx graph                    # visualize dependencies
```

## Useful commands

```bash
npx nx build <project>                        # build one package
npx nx test <project>                         # test one package
npx nx lint <project> --fix                   # lint + autofix
npx nx affected -t test                       # test only what changed
npx nx run-many -t lint test build --parallel=3
npx nx release --dry-run                      # preview version bumps
npx nx release                                # version + changelog + publish
```

## CI notes

- Uses `nx affected` for incremental builds.
- Includes `nx fix-ci` for automated failure triage.
- `@org/async` ships an intentionally failing test to demo self-healing CI — don't "fix" it unless you mean to.

## Links

- [Nx docs](https://nx.dev)
- [Module boundaries](https://nx.dev/features/enforce-module-boundaries)
- [Nx Release](https://nx.dev/features/manage-releases)
- [Nx Cloud](https://nx.dev/ci/intro/why-nx-cloud)
