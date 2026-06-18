/**
 * End-to-end integration test: scanner → planner → generator.
 *
 * H-012 (the highest-leverage gap in the audit): every prior test exercises
 * exactly one layer in isolation. This file walks data all the way through
 * the public API surface and asserts on *observable* behavior:
 *
 *   1. scanProject produces a ContractModel with the entities we expect.
 *   2. planBffRoutes turns that into a RoutePlan with the expected operations.
 *   3. generateHonoRoutes turns that into a tree of files.
 *   4. Every generated `.ts` file parses as syntactically valid TypeScript.
 *
 * (4) is the most important assertion in the entire test suite. It proves the
 * identifier-validation regexes (CR-001) keep malformed output from ever
 * reaching disk — any future refactor that introduces a syntax-emitting bug
 * trips here long before downstream tsc would.
 */

import type { Diagnostic } from 'ts-morph'
import { Project } from 'ts-morph'
import { describe, expect, it } from 'vitest'

import { generateHonoRoutes } from '../generators/hono-routes.js'
import { planBffRoutes } from '../planner/route-planner.js'
import { scanProject } from '../scanner/zod-scanner.js'

import { entityFieldNames, FIXED_TS } from './_fixtures.js'

const ROOT = '/virtual'
const OUTPUT_DIR = '/virtual/api/routes'

function makeProject(files: Record<string, string>): Project {
  const project = new Project({ useInMemoryFileSystem: true })
  for (const [filePath, contents] of Object.entries(files)) {
    project.createSourceFile(filePath, contents, { overwrite: true })
  }
  return project
}

/**
 * Parse a string of TypeScript via ts-morph (a direct dep of this package) and
 * return any pre-emit *syntactic* diagnostics.
 *
 * We intentionally avoid the type-checker — we don't have node_modules in the
 * virtual FS, so module-resolution and type-checking would all fail. The pure
 * parser only reports unbalanced braces, illegal tokens, unterminated strings,
 * and other syntax errors — exactly what we care about for the H-012
 * "generated TS is at least parseable" assertion.
 */
function syntacticDiagnostics(filename: string, contents: string): string[] {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { allowJs: false, noEmit: true },
  })
  const sf = project.createSourceFile(filename, contents, { overwrite: true })
  // `getPreEmitDiagnostics` returns syntax + semantic. Semantic diagnostics
  // in an in-memory FS without node_modules are all "cannot find module"
  // (code 2307 and friends) — those are noise here, we only want real syntax
  // errors. The TS compiler uses codes 1000–1999 for syntax errors.
  const all = sf.getPreEmitDiagnostics()
  return all
    .filter(isSyntaxLike)
    .map((d) => {
      const msg = d.getMessageText()
      const text = typeof msg === 'string' ? msg : String(msg)
      return `${filename} [TS${d.getCode()}]: ${text}`
    })
}

function isSyntaxLike(d: Diagnostic): boolean {
  const code = d.getCode()
  return code >= 1000 && code < 2000
}

describe('integration: scanner → planner → generator', () => {
  it('walks a representative project end-to-end and emits valid TS', async () => {
    const project = makeProject({
      '/virtual/src/schemas/user.ts': `
        import { z } from 'zod'
        export const User = z.object({
          id: z.string().uuid(),
          name: z.string(),
          email: z.string().email(),
        })
      `,
      '/virtual/src/schemas/project.ts': `
        import { z } from 'zod'
        export const Project = z.object({
          id: z.string(),
          title: z.string(),
          ownerId: z.string(),
        })
      `,
      '/virtual/src/schemas/task.ts': `
        import { z } from 'zod'
        export const Task = z.object({
          id: z.string(),
          label: z.string(),
          done: z.boolean(),
        })
      `,
      // A non-object (scalar) schema — the planner should skip it with a warning.
      '/virtual/src/schemas/email.ts': `
        import { z } from 'zod'
        export const Email = z.string().email()
      `,
      // An object schema with no id field — also skipped.
      '/virtual/src/schemas/address.ts': `
        import { z } from 'zod'
        export const Address = z.object({
          street: z.string(),
          city: z.string(),
          zip: z.string(),
        })
      `,
    })

    // ── Step 1: scan ──
    const contract = scanProject(project, ROOT)

    const byName = new Map(contract.entities.map((e) => [e.name, e]))
    expect(byName.has('User')).toBe(true)
    expect(byName.has('Project')).toBe(true)
    expect(byName.has('Task')).toBe(true)
    expect(byName.has('Email')).toBe(true)
    expect(byName.has('Address')).toBe(true)

    // Use the discriminated shape union for assertions.
    const user = byName.get('User')!
    expect(user.shape.kind).toBe('object')
    if (user.shape.kind === 'object') {
      expect(user.shape.hasIdField).toBe(true)
    }

    const email = byName.get('Email')!
    expect(email.shape.kind).not.toBe('object')

    const address = byName.get('Address')!
    expect(address.shape.kind).toBe('object')
    if (address.shape.kind === 'object') {
      expect(address.shape.hasIdField).toBe(false)
    }

    // ── Step 2: plan ──
    const plan = planBffRoutes(contract)

    // 3 CRUD-eligible entities × 5 ops each = 15 operations.
    expect(plan.operations).toHaveLength(15)

    // The plan must reference exactly the eligible entities.
    const entitiesInPlan = new Set(plan.operations.map((o) => o.entity))
    expect(entitiesInPlan).toEqual(new Set(['User', 'Project', 'Task']))

    // The skipped ones must show up in warnings (Email = not-object,
    // Address = no-id). We assert on observable substrings rather than the
    // exact warning text, which may shift.
    const allWarnings = plan.warnings.join('\n')
    expect(allWarnings).toContain('Email')
    expect(allWarnings).toContain('Address')

    // ── Step 3: generate ──
    const output = await generateHonoRoutes(contract, plan, {
      outputDir: OUTPUT_DIR,
      clock: () => FIXED_TS,
    })

    // 3 entities × (5 route files + 1 entity index) + 1 top index = 19.
    expect(output.files).toHaveLength(19)
    expect(output.warnings).toEqual([])

    // ── Step 4: every emitted file parses as valid TypeScript ──
    // THIS is the headline assertion. If a future refactor injects a stray
    // bracket / unterminated string / reserved-word identifier into any
    // template, this fails immediately.
    for (const file of output.files) {
      const diags = syntacticDiagnostics(file.relativePath, file.contents)
      expect(diags, diags.join('\n')).toEqual([])
    }

    // Every route file's schema import path must resolve to a real entity
    // file. We don't run the module resolver, but we can assert the import
    // string ends with one of the entities' lowercase filenames.
    const routeFiles = output.files.filter(
      (f) => f.relativePath.includes('/') && !f.relativePath.endsWith('index.generated.ts')
    )
    expect(routeFiles.length).toBeGreaterThan(0)
    for (const file of routeFiles) {
      // Match: import { X } from '../../foo/bar'
      const match = file.contents.match(/import\s*\{\s*(\w+)\s*\}\s*from\s*'([^']+)'/)
      expect(match, `route file ${file.relativePath} missing schema import`).not.toBeNull()
      const importedName = match![1]!
      // The imported name should be an entity we put in the contract.
      expect(byName.has(importedName)).toBe(true)
      // And the path should end with the matching file basename.
      const expectedBase = byName.get(importedName)!.filePath
        .split('/')
        .pop()!
        .replace(/\.tsx?$/, '')
      expect(match![2]!.endsWith(expectedBase)).toBe(true)
    }
  })

  it('locks behavior for spread-element fields (M-014)', () => {
    // ts-morph extracts the literal property assignments only — spread
    // elements are not enumerated as fields. This test locks the current
    // observable behavior (outer entity exposes only its own non-spread
    // properties).
    const project = makeProject({
      '/virtual/src/spread.ts': `
        import { z } from 'zod'
        const Base = z.object({ createdAt: z.string() })
        export const User = z.object({
          ...Base.shape,
          id: z.string(),
          name: z.string(),
        })
      `,
    })

    const contract = scanProject(project, ROOT)
    const user = contract.entities.find((e) => e.name === 'User')
    expect(user).toBeDefined()
    expect(user!.shape.kind).toBe('object')

    const names = entityFieldNames(user!)
    // Spread is not flattened — only the literal properties are seen.
    expect(names).not.toContain('createdAt')
    expect(names).toContain('id')
    expect(names).toContain('name')
  })

  it('locks behavior for nested z.object — outer keys only, no descent (M-014)', () => {
    const project = makeProject({
      '/virtual/src/nested.ts': `
        import { z } from 'zod'
        export const User = z.object({
          id: z.string(),
          profile: z.object({
            firstName: z.string(),
            lastName: z.string(),
          }),
        })
      `,
    })

    const contract = scanProject(project, ROOT)
    const user = contract.entities.find((e) => e.name === 'User')
    expect(user).toBeDefined()

    const names = entityFieldNames(user!)
    expect(names).toContain('id')
    expect(names).toContain('profile')
    // The scanner does NOT descend — inner keys must not leak to the outer
    // entity's fieldNames.
    expect(names).not.toContain('firstName')
    expect(names).not.toContain('lastName')
  })

  it('produces an empty contract when given a project with no schemas', async () => {
    const project = makeProject({
      '/virtual/empty.ts': `
        export const notASchema = 42
      `,
    })

    const contract = scanProject(project, ROOT)
    expect(contract.entities).toEqual([])

    const plan = planBffRoutes(contract)
    expect(plan.operations).toEqual([])

    const output = await generateHonoRoutes(contract, plan, {
      outputDir: OUTPUT_DIR,
      clock: () => FIXED_TS,
    })

    // Even with zero entities we still emit the (empty) top-level index file.
    expect(output.files.map((f) => f.relativePath)).toEqual(['index.generated.ts'])

    // And it must parse.
    const diags = syntacticDiagnostics(
      output.files[0]!.relativePath,
      output.files[0]!.contents
    )
    expect(diags, diags.join('\n')).toEqual([])
  })

  it('produces byte-identical output across two end-to-end runs with a fixed clock', async () => {
    const buildProject = (): Project =>
      makeProject({
        '/virtual/src/user.ts': `
          import { z } from 'zod'
          export const User = z.object({ id: z.string(), name: z.string() })
        `,
      })

    async function runOnce(): Promise<string[]> {
      const contract = scanProject(buildProject(), ROOT)
      const plan = planBffRoutes(contract)
      const output = await generateHonoRoutes(contract, plan, {
        outputDir: OUTPUT_DIR,
        clock: () => FIXED_TS,
      })
      return output.files.map((f) => f.contents)
    }

    const [first, second] = await Promise.all([runOnce(), runOnce()])
    expect(first).toEqual(second)
  })
})
