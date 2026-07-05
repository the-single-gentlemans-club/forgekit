# ForgeKit — Brand Brief

**Prepared for:** the branding agency partner
**Prepared by:** ForgeKit core team
**Date:** April 2026
**Status:** Draft for agency discovery — name is locked, everything else is open

---

## Executive Summary

ForgeKit is an AI-native developer toolchain for design systems. It ships open-source MCP (Model Context Protocol) servers that connect AI coding agents — Claude, Cursor, Copilot, and any MCP-compatible client — directly into the Storybook and Figma workflow, automating the busywork that has historically slowed component teams down.

This brief gives the agency the context needed to design a logo system, color palette, typography, voice, and positioning that match a tool built by senior engineers, for senior engineers, in a moment when AI is reshaping how software gets built.

The name **ForgeKit** is locked. Everything else — mark, palette, type, voice, motion — is open for the agency to shape.

---

## About ForgeKit

ForgeKit is a TypeScript monorepo of MCP servers and supporting libraries that let AI agents reason about, modify, and verify design system artifacts. The current product surface includes two complementary, open-source servers, both published on npm:

- **forgekit-storybook-mcp** — fifteen tools for story generation (interactive, MSW, router, form, page layouts), component analysis, MDX documentation, Playwright and Vitest test scaffolding, Figma Code Connect file generation, and health checks.
- **forgekit-context** — seven tools that orchestrate Figma and Storybook context together: gap analysis (components in Figma without code, and vice versa), drift detection (hardcoded values vs. design tokens), and Code-to-Canvas (Storybook renders pushed back into Figma as editable frames).

Both packages run locally on a developer's machine and integrate with any AI agent that speaks MCP. The roadmap extends into deeper agentic workflows: automated component intake, token migrations, and multi-repo design system governance.

---

## Mission

To give every design system team an AI-native forge — a place where Figma intent, Storybook reality, and shipped code stay in lockstep, automatically.

## Vision

A future where the design system is the source of truth and AI agents do the reconciliation work, closing the gaps between design and code in seconds rather than sprints. ForgeKit aims to be the standard MCP layer that powers that loop — the way a forge sits at the center of a workshop: hot, precise, and indispensable.

## Brand Promise

ForgeKit hands developers and design system teams an AI-grade workshop for their components — opinionated, fast, and built by people who have shipped design systems for a living.

## Positioning Statement

For frontend engineers and design system teams who are tired of reconciling Figma and Storybook by hand, **ForgeKit** is an open-source MCP toolchain that lets AI agents do it for them — closing drift, generating stories and tests, and keeping design and code in sync. Unlike point plugins or closed-source SaaS, ForgeKit is composable, local-first, and built on the open Model Context Protocol standard, so it plugs into any agent the team already uses.

---

## Target Audiences

ForgeKit serves four overlapping audiences. The brand should land cleanly with each without watering down the technical edge that earns the first three's respect.

### 1. Frontend and design system engineers

Senior individual contributors who own Storybook, tokens, and the component library. They write the code that everyone else's UI is built on.

- **Pain:** every new component means a round-trip of stories, MDX, tests, and Figma updates that nobody enjoys writing.
- **Win:** ForgeKit hands those rounds to an agent and gives the engineer time back for real architecture work.

### 2. Design system teams and ops

Cross-functional leads bridging design and engineering — the people responsible for adoption, governance, and reducing drift.

- **Pain:** hardcoded values creep in, components drift from Figma, and the team spends meetings doing diff archaeology.
- **Win:** ForgeKit surfaces drift continuously and turns governance into an automated check rather than a quarterly audit.

### 3. AI-forward product teams

Engineers and PMs already using Claude, Cursor, or Copilot for serious work. They believe agents should do more than autocomplete.

- **Pain:** the agent is brilliant in a chat window but blind to the design system.
- **Win:** ForgeKit gives the agent eyes and hands inside both Figma and Storybook through MCP.

### 4. Open source and dev-tool buyers

OSS maintainers and dev-tool decision-makers evaluating where to invest in the MCP ecosystem.

- **Pain:** the MCP space is full of toy servers; few are production-grade.
- **Win:** ForgeKit ships strict TypeScript, scope-enforced module boundaries, real test coverage, and a credible technical foundation to build on.

---

## Brand Personality

**Industrial. Crafted. Confident. Made by makers.**

ForgeKit leans hard into the forge metaphor — the anvil, the hammer, the spark, the controlled heat that turns raw material into something useful. This is not a glow-and-gradient AI brand. It is a **tool brand**. Heavy when it needs to be, fast when it has to be, and unapologetically built for the people who actually do the work.

### Personality dimensions

- **Senior, not snobby.** ForgeKit talks to engineers as peers — direct, technical, no fluff, no hand-holding. It assumes competence.
- **Crafted, not corporate.** Every detail is considered: type, weight, micro-interactions, error messages. The brand should feel like a well-made tool, not a marketing surface.
- **Hot, not loud.** Energy comes from the work, not the volume. Confident restraint over hype.
- **Open, not walled.** Open source by default. Standards-first. The brand should signal that ForgeKit composes with the rest of the developer's stack rather than trying to replace it.

---

## Voice and Tone

**Voice:** A senior engineer with a workshop in their garage. Knowledgeable, precise, low ego. Will tell you exactly what a tool does, what it doesn't do, and why.

### Tone shifts by surface

- **Marketing site:** confident, plainspoken, technical without being jargon-heavy.
- **Documentation:** dense, accurate, example-first. Show, don't sell.
- **Error messages and CLI output:** terse, helpful, never cute. No emoji.
- **Social and community:** conversational, generous, willing to engage with the technical weeds.

### Words and phrases that fit

forge, anvil, temper, weld, shape, hammered out, struck, alloy, set, cooled, cast, build, ship, compose, wire up, scaffold.

### Words and phrases to avoid

revolutionize, magical, effortless, AI-powered (ForgeKit is, but the brand should not lean on that as a feature), transform your workflow, supercharge, unleash.

---

## Key Messaging Pillars

Four pillars carry the story. Weight them in this order on the marketing site and ancillary surfaces.

1. **AI agents that understand your design system.** ForgeKit gives Claude, Cursor, and any MCP-compatible agent eyes and hands inside Figma and Storybook. The agent stops guessing.
2. **Drift dies here.** Continuous drift detection between design tokens and shipped code. The first toolchain built to keep Figma and Storybook honest with each other.
3. **Open standards, local-first.** Built on MCP, open-sourced on npm, runs on the developer's machine. No SaaS lock-in, no cloud dependency, no data leaves the box.
4. **Built by people who have shipped design systems.** TypeScript strict mode, scope-boundary enforced, unit-tested, semantic-released. The kind of foundation a team can actually build on.

---

## Differentiators

- **Composable, not monolithic.** Two complementary MCP servers — pick one or use both. Each is useful standalone.
- **MCP-native.** Designed from day one for agentic workflows, not retrofitted from a chat plugin.
- **Bidirectional Figma and Storybook.** Code-to-Canvas pushes Storybook renders back into Figma as editable frames — a loop competitors do not close.
- **Quality bar.** Strict TypeScript, Nx scope boundaries, unit-tested, semantic-released. The codebase shows the work.
- **Open source first.** Published on npm with a permissive license, contributable, inspectable.

---

## Tagline Directions

The agency should explore taglines in three directions and propose a primary line plus a secondary "what it actually does" line.

### Forge metaphor

- Where design systems are forged.
- Strike while the system is hot.
- An AI forge for your component library.

### Drift and honesty

- Keep your design system honest.
- Where Figma and code finally agree.
- Drift dies here.

### Agentic toolchain

- An AI-native toolchain for design systems.
- MCP for the design system.
- Hand it to the agent.

---

## Naming Conventions

- **Wordmark:** `ForgeKit` (one word, capital F and K, no space, no hyphen).
- **Products:** lowercase, hyphenated. Example: `forgekit-storybook-mcp`, `forgekit-context`.
- **Never:** Forge Kit, forge-kit, FORGEKIT, Forge-Kit, ForgKit.

---

## Visual Direction

The agency has full creative latitude on logo, mark, palette, and type. The notes below are direction, not constraint.

### Logomark

Explore symbols rooted in the forge: the anvil silhouette, a struck spark, a hammer mark, a geometric flame, a glowing iron bar. The strongest direction is likely abstract and geometric — a mark that reads as a tool first and a flourish second. Avoid literal flames or cartoon hammers. The mark must hold up at 16px (favicon, MCP server icon in agent UIs) and at large scale (conference banner, t-shirt).

### Wordmark

Bold, slightly condensed, mechanical. Custom letterforms preferred over a stock typeface. The "F" and "K" should be distinctive enough to work as a monogram. Look at the precision of Vercel's wordmark and the warmth of Linear's — but with more weight and a hint of tool-shop grit.

### Color

Direction: a primary that reads as hot metal — deep amber, ember orange, or molten copper — anchored by a near-black and a warm off-white. Avoid the dev-tool-default purple gradient. One restrained accent for state and emphasis. The palette must hold up in both light and dark IDE themes, since the brand will live next to code.

### Typography

A geometric or industrial sans for display (something with mechanical character, not generic). A neutral, highly legible sans for body. A monospace for code samples — opinionated, with good ligatures. The system should feel engineered, not editorial.

### Iconography

Stroke-based, geometric, drawn on a strict grid. Slight industrial weight. Should sit naturally next to the logomark.

### Photography and illustration

Macro shots of metal, sparks, tooling, workshops — used sparingly. Avoid stock developer-at-laptop imagery. Where illustration is needed, prefer technical line art over flat character work.

### Motion

Mechanical and decisive. Things snap, click, spark. Avoid gentle fades and gradients-in-motion.

---

## Brand Do's and Don'ts

### Do

- Show the work. Use real code, real output, real screenshots.
- Talk like an engineer talks: direct, technical, low ceremony.
- Lean on the forge metaphor in copy and visuals when it earns its place.
- Treat AI as table stakes, not the headline.

### Don't

- Use generic AI iconography (sparkles, brains, robots).
- Lean on stock photography or character illustration.
- Soften the language. ForgeKit is a tool, not a platform-as-a-service.
- Ship anything that wouldn't look at home next to a Vercel, Linear, or Anthropic surface.

---

## Competitive Landscape

ForgeKit sits at the intersection of three categories. The brand should make ForgeKit's place in this map immediately legible.

- **Design system tooling:** Storybook, Chromatic, Knapsack, Backlight. Mostly UI-first, agent-blind.
- **Figma plugins:** Tokens Studio, Code Connect, Anima. Useful but narrow; not built for agents.
- **MCP servers:** a growing field, mostly experimental. ForgeKit aims to be one of the production-grade reference implementations.

ForgeKit is **not a plugin, not a cloud platform, and not an experiment**. It is a toolchain. The visual and verbal identity should make that obvious within three seconds of landing on any surface.

---

## What the Agency Will Deliver

Phasing and pricing to be discussed in the SOW.

1. Logomark, wordmark, monogram, and lockup variants in light, dark, and monochrome.
2. A complete color system with semantic tokens (background, surface, text, brand, accent, success, warning, error) usable across web, IDE, and CLI.
3. A type system with display, body, and mono pairings, including web-licensed weights.
4. An iconography starter set of approximately twenty icons on a defined grid.
5. Brand guidelines document (PDF and Figma) covering logo usage, color, type, voice, and motion principles.
6. A tagline system: one primary line and one supporting line.
7. Marketing site visual direction: one hero, one feature page, one docs page.
8. README and npm card visual treatment, including a 16px favicon-grade mark.
9. Conference and swag direction: sticker pack, t-shirt, booth backdrop.

---

## Glossary

- **MCP (Model Context Protocol).** An open standard for connecting AI agents to external tools and data sources.
- **Storybook.** Open-source workshop for building UI components and pages in isolation.
- **Figma Code Connect.** A Figma feature that links design components to their code implementations.
- **Design tokens.** Named, technology-agnostic values for color, spacing, type, and other primitives.
- **Drift.** Divergence between design intent (Figma) and shipped code (Storybook and the component library).
- **Code-to-Canvas.** A ForgeKit feature that pushes rendered Storybook output back into Figma as editable frames.

---

*End of brief — questions: ForgeKit core team.*
