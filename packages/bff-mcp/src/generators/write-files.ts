/**
 * Disk-side companion to the generators.
 *
 * Generators produce `GeneratedFile[]` (path + contents). This module writes
 * them to disk under a base directory, honoring the 70/30 escape-hatch rule:
 *
 *   - Files ending in `.generated.ts` are always overwritten.
 *   - Any file path that doesn't end in `.generated.ts` would only be written
 *     by an explicit hand-written-scaffold path (not used by Step 3); if a
 *     generator ever emits one, we refuse to overwrite a pre-existing file at
 *     that path and surface a warning.
 *
 * Security hardening (H-001 / H-003):
 *   - The resolved absolute path for every file must be contained within
 *     `baseDir`. Path traversal attempts (e.g. `../../etc/passwd`) are
 *     skipped with a warning. This check runs BEFORE the `.generated.ts`
 *     extension gate so the gate cannot be bypassed.
 *   - Symlinks anywhere along the resolved path are detected by walking up
 *     to the nearest existing ancestor and calling `fs.realpath`; if the
 *     realpath escapes `baseDir`, the file is skipped.
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import type { GeneratedFile } from '../types.js'

export interface WriteOptions {
  /** Absolute directory the GeneratedFile.relativePath values resolve against. */
  baseDir: string
  /** If true, files are only computed, never written. */
  dryRun?: boolean
}

export interface WriteResult {
  /** Absolute paths of files actually written. */
  writtenPaths: string[]
  /** Absolute paths skipped because a hand-written file already existed. */
  skippedPaths: string[]
  /** Soft warnings (collisions, etc.). */
  warnings: string[]
}

export async function writeGeneratedFiles(
  files: GeneratedFile[],
  options: WriteOptions
): Promise<WriteResult> {
  const baseDir = path.resolve(options.baseDir)
  const written: string[] = []
  const skipped: string[] = []
  const warnings: string[] = []

  // The set of files cleared for writing after all safety checks pass.
  type Approved = { absPath: string; contents: string }
  const approved: Approved[] = []

  // Safety checks are sequential — correctness over throughput. They are
  // pure metadata reads and not the hot path.
  for (const file of files) {
    const absPath = path.resolve(baseDir, file.relativePath)

    // [H-001] Containment check. Run BEFORE the .generated.ts gate so the
    // gate cannot be bypassed by a traversal that happens to end in
    // `.generated.ts`.
    const rel = path.relative(baseDir, absPath)
    if (rel === '' || rel.startsWith('..') || path.isAbsolute(rel)) {
      skipped.push(absPath)
      warnings.push(
        `Refusing to write outside baseDir: ${file.relativePath} resolves to ${absPath}.`
      )
      continue
    }

    // [H-003] Symlink check — walk up to the nearest existing ancestor and
    // realpath it. If it escapes baseDir, skip.
    const ancestor = await closestExistingAncestor(absPath)
    if (ancestor) {
      let realAncestor: string
      try {
        realAncestor = await fs.realpath(ancestor)
      } catch {
        // If realpath fails (e.g. permissions), be conservative — skip.
        skipped.push(absPath)
        warnings.push(
          `Refusing to write ${file.relativePath}: could not resolve real path of ancestor ${ancestor}.`
        )
        continue
      }
      const relReal = path.relative(baseDir, realAncestor)
      if (relReal.startsWith('..') || path.isAbsolute(relReal)) {
        skipped.push(absPath)
        warnings.push(
          `Refusing to follow symlink: ${file.relativePath} resolves outside baseDir via ${realAncestor}.`
        )
        continue
      }
    }

    const isGenerated =
      absPath.endsWith('.generated.ts') || absPath.endsWith('.generated.tsx')

    if (!isGenerated) {
      // We only ever overwrite *.generated.ts. Anything else must not exist.
      if (await exists(absPath)) {
        skipped.push(absPath)
        warnings.push(
          `Refusing to overwrite hand-written file at ${absPath}. ` +
            'Rename the existing file or move it aside to regenerate.'
        )
        continue
      }
    }

    approved.push({ absPath, contents: file.contents })
    written.push(absPath)
  }

  if (!options.dryRun && approved.length > 0) {
    // [M-022] Parallelize the actual I/O. Dedupe parent dirs first so we
    // don't fire 50 mkdirs against the same path.
    const dirs = Array.from(new Set(approved.map((a) => path.dirname(a.absPath))))
    await Promise.all(dirs.map((d) => fs.mkdir(d, { recursive: true })))
    await Promise.all(
      approved.map((a) => fs.writeFile(a.absPath, a.contents, 'utf8'))
    )
  }

  return { writtenPaths: written, skippedPaths: skipped, warnings }
}

/**
 * Walk up from `absPath` until we find an ancestor that exists, and return
 * its path. Returns `null` if we walk all the way to the root without
 * finding one (shouldn't happen on a real FS, but defensive).
 */
async function closestExistingAncestor(absPath: string): Promise<string | null> {
  let current = path.dirname(absPath)
  // Also check absPath itself in case it already exists (overwrite case).
  if (await exists(absPath)) return absPath
  for (let i = 0; i < 64; i++) {
    if (await exists(current)) return current
    const parent = path.dirname(current)
    if (parent === current) return null
    current = parent
  }
  return null
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
