# @forgekit/design-system

A shared design system library built on [shadCN UI](https://ui.shadcn.com), [Tailwind CSS v4](https://tailwindcss.com), and [Radix UI](https://www.radix-ui.com) primitives.

## What's New in 0.0.1

- shadCN New York theme (Neutral base) with full light/dark support via CSS variables (oklch)
- Tailwind v4 `@theme inline` integration
- Core component set: **Button, Input, Label, Badge, Card, Switch**, and an accessible composed **Field**
- Accessibility built in: Radix primitives for interactive components, and a `Field` that wires
  `label`/`aria-invalid`/`aria-describedby` and a live error region automatically
- Design system power integration for component specs, theme generation, and Storybook workflows

## Architecture

```
CSS Variables (theming) → Tailwind CSS v4 (utilities) → Radix UI (a11y primitives) → shadCN (styled components)
```

## Usage

```tsx
import { Button } from '@forgekit/design-system'
import '@forgekit/design-system/globals.css'

export function App() {
  return (
    <Button variant="default" size="default">
      Click me
    </Button>
  )
}
```

## Theme

The default theme is **New York** (Neutral base). Theme tokens are defined in `src/globals.css` and documented in `themes/default.md`.

To create a custom theme, ask the agent: "generate a new theme called [name]".

## Adding Components

```bash
npx shadcn@latest add [component] --path=packages/design-system
```

## Available Components

- **Button** — 6 variants, 4 sizes, `asChild` support
- **Input** — text input with invalid-state styling (`aria-invalid`)
- **Label** — Radix Label, associates with controls via `htmlFor`
- **Badge** — 4 variants, `asChild` support
- **Card** — `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- **Switch** — Radix Switch (`role="switch"`, keyboard + focus-visible)
- **Field** — composes Label + control + description/error with full ARIA wiring

## Development

```bash
# Lint
pnpm nx lint @forgekit/design-system

# Test (Vitest + React Testing Library, jsdom)
pnpm nx test @forgekit/design-system

# Storybook (with a11y + light/dark theme addons)
pnpm nx storybook @forgekit/design-system
```
