# Domain Documentation

ForgeKit is a multi-context monorepo. Each package has its own domain, constraints, and decisions.

## Structure

```
forgekit/
├── CONTEXT-MAP.md (this file points to per-package contexts)
├── packages/
│   ├── async/CONTEXT.md
│   ├── colors/CONTEXT.md
│   ├── strings/CONTEXT.md
│   └── utils/CONTEXT.md
├── docs/
│   └── adr/ (shared architecture decisions)
```

## Reading Context

1. **For package-specific questions:** Read `packages/{package}/CONTEXT.md`
2. **For shared decisions:** Read `docs/adr/`
3. **Unknown context:** Check `CONTEXT-MAP.md` for pointer

## CONTEXT.md Template

Each `packages/{name}/CONTEXT.md` should include:
- What the package does
- Key constraints (e.g., browser only, Node only, size budget)
- Major dependencies
- How it fits in the system
- Common gotchas

## ADR Template

Shared decisions go in `docs/adr/NNNN-decision-name.md`:
- **Status:** Accepted/Superseded
- **Context:** Why the decision was needed
- **Decision:** What was chosen
- **Consequences:** Trade-offs and implications
