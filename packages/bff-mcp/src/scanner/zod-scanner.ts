/**
 * Top-level scanner — orchestrates schema adapters against a ts-morph project.
 *
 * Two entrypoints:
 *   - `scanFeSchemas({ rootDir })`  for production: reads files from disk
 *   - `scanProject(project, rootDir)` for tests: works against an in-memory Project
 *
 * v0.1 only registers the Zod adapter. v0.2 adds Effect/Schema + TypeBox.
 *
 * Hardening notes:
 *   - `scanFeSchemas` is bounded by file count, byte budget, and wall-clock
 *     timeout. Hitting any bound returns a *partial* ContractModel with a
 *     warning rather than throwing.
 *   - A module-level `projectCache` reuses ts-morph Projects across calls
 *     keyed by canonical (rootDir, include, exclude) tuples with a TTL.
 *   - File enumeration uses a node:fs/promises walker that prunes excluded
 *     directories during the walk (so `node_modules`, `.git`, `dist`, etc.
 *     are never descended into). Globby is not in the workspace; a tiny
 *     custom walker keeps us dependency-free.
 */

import type { Dirent } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'

import type { Project } from 'ts-morph'
import { Project as TsMorphProject } from 'ts-morph'

import type { ContractModel, EntitySchemaRef } from '../types.js'

import type { SchemaAdapter } from './schema-adapter.js'
import { zodAdapter } from './zod-adapter.js'

export interface ScanOptions {
  /** Absolute or relative root directory to scan. */
  rootDir: string
  /** Glob patterns (relative to rootDir) to include. Defaults to **\/*.{ts,tsx}. */
  include?: string[]
  /** Glob patterns to exclude. Defaults below. */
  exclude?: string[]
  /** Override the active adapter list. Defaults to [zodAdapter]. */
  adapters?: SchemaAdapter[]
  /**
   * Workspace root the scan must stay within. Containment is enforced one
   * layer up (in the MCP tool); this field is informational here.
   */
  workspaceRoot?: string
  /** Maximum number of files to add to the project. Defaults to 5000. */
  maxFiles?: number
  /** Maximum cumulative byte budget across enumerated files. Defaults to 100 MB. */
  maxTotalBytes?: number
  /** Wall-clock timeout in ms for the entire scan. Defaults to 30 s. */
  timeoutMs?: number
  /**
   * Optional injection point for tests — supplying this factory bypasses
   * the module-level cache and lets a spy observe Project construction.
   */
  projectFactory?: () => Project
}

const DEFAULT_INCLUDE = ['**/*.ts', '**/*.tsx']

const DEFAULT_EXCLUDE = [
  '**/node_modules/**',
  '**/dist/**',
  '**/build/**',
  '**/out-tsc/**',
  '**/.next/**',
  '**/.turbo/**',
  '**/.git/**',
  '**/*.generated.ts',
  '**/*.generated.tsx',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.spec.ts',
  '**/*.spec.tsx',
]

const DEFAULT_MAX_FILES = 5000
const DEFAULT_MAX_TOTAL_BYTES = 100 * 1024 * 1024
const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Directory names we never descend into. Derived from `DEFAULT_EXCLUDE` plus
 * the user's exclude list — any segment ending in `/**` whose left side has
 * no glob meta is treated as a directory prune.
 */
const ALWAYS_PRUNED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'out-tsc',
  '.next',
  '.turbo',
])

// ────────────────────────────────────────────────────────────────────
// Project cache — keyed by (rootDir, include, exclude). TTL eviction.
// ────────────────────────────────────────────────────────────────────

interface CachedProject {
  project: Project
  createdAt: number
}

const projectCache = new Map<string, CachedProject>()

function getCacheTtlMs(): number {
  const raw = process.env['SCAN_CACHE_TTL_MS']
  if (!raw) return 60_000
  const parsed = Number(raw)
  if (!Number.isFinite(parsed) || parsed < 0) return 60_000
  return parsed
}

function cacheKey(rootDir: string, include: string[], exclude: string[]): string {
  return JSON.stringify({
    rootDir,
    include: [...include].sort(),
    exclude: [...exclude].sort(),
  })
}

/** Test hook — clear cached projects so consecutive tests don't bleed state. */
export function __resetProjectCacheForTests(): void {
  projectCache.clear()
}

// ────────────────────────────────────────────────────────────────────
// Production entrypoint
// ────────────────────────────────────────────────────────────────────

export async function scanFeSchemas(options: ScanOptions): Promise<ContractModel> {
  const rootDir = path.resolve(options.rootDir)
  const include = options.include ?? DEFAULT_INCLUDE
  const exclude = options.exclude ?? DEFAULT_EXCLUDE
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES
  const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS

  const warnings: string[] = []
  const deadline = Date.now() + timeoutMs

  // Resolve (or build) the Project for this (rootDir, include, exclude).
  const project = acquireProject(rootDir, include, exclude, options.projectFactory)

  // Enumerate candidate files, pruning excluded directories during the walk.
  const enumeration = await enumerateFiles({
    rootDir,
    include,
    exclude,
    maxFiles,
    maxTotalBytes,
    deadline,
  })
  warnings.push(...enumeration.warnings)

  // Add only files not yet present in the cached Project.
  for (const file of enumeration.files) {
    if (Date.now() > deadline) {
      warnings.push(`Scan timeout (${timeoutMs} ms) reached while loading source files; results are partial.`)
      break
    }
    if (!project.getSourceFile(file)) {
      try {
        project.addSourceFileAtPath(file)
      } catch {
        // Skip unreadable file; don't surface raw error to caller.
      }
    }
  }

  const result = scanProject(project, rootDir, options.adapters)
  result.warnings = [...warnings, ...result.warnings]
  return result
}

// ────────────────────────────────────────────────────────────────────
// scanProject — test-friendly entrypoint
// ────────────────────────────────────────────────────────────────────

export function scanProject(
  project: Project,
  rootDir: string,
  adapters: SchemaAdapter[] = [zodAdapter]
): ContractModel {
  const entities: EntitySchemaRef[] = []
  const warnings: string[] = []
  const seenNames = new Map<string, string>() // name -> filePath of first occurrence

  for (const sourceFile of project.getSourceFiles()) {
    const fileAdapters = adapters.filter((a) => a.matchesFile(sourceFile))
    if (fileAdapters.length === 0) continue

    // Each matching adapter contributes its discovered entities. Duplicates
    // across adapters (or files) are caught by the seenNames map below.
    for (const adapter of fileAdapters) {
      for (const entity of adapter.extractEntities(sourceFile, { rootDir })) {
        const prevFile = seenNames.get(entity.name)
        if (prevFile && prevFile !== entity.filePath) {
          warnings.push(
            `Duplicate schema name "${entity.name}" found in ${entity.filePath}; ` +
              `first occurrence in ${prevFile} kept. Rename one to avoid ambiguity.`
          )
          continue
        }
        if (prevFile) continue // same file, already counted (multi-adapter overlap)
        seenNames.set(entity.name, entity.filePath)
        entities.push(entity)
      }
    }
  }

  // Stable ordering: by file path, then by source position.
  entities.sort((a, b) => {
    if (a.filePath !== b.filePath) return a.filePath.localeCompare(b.filePath)
    return a.name.localeCompare(b.name)
  })

  return {
    entities,
    rootDir,
    scannedAt: new Date().toISOString(),
    warnings,
  }
}

// ────────────────────────────────────────────────────────────────────
// Internals
// ────────────────────────────────────────────────────────────────────

function acquireProject(
  rootDir: string,
  include: string[],
  exclude: string[],
  factory?: () => Project
): Project {
  if (factory) return factory()

  const ttl = getCacheTtlMs()
  const key = cacheKey(rootDir, include, exclude)
  const existing = projectCache.get(key)
  if (existing && ttl > 0 && Date.now() - existing.createdAt < ttl) {
    return existing.project
  }

  const project = new TsMorphProject({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: { allowJs: false, noEmit: true },
  })

  projectCache.set(key, { project, createdAt: Date.now() })
  return project
}

interface EnumerateOptions {
  rootDir: string
  include: string[]
  exclude: string[]
  maxFiles: number
  maxTotalBytes: number
  deadline: number
}

interface EnumerationResult {
  files: string[]
  warnings: string[]
}

/**
 * Recursively walks `rootDir`, returning files that match `include` patterns
 * and aren't excluded. Directory-level pruning happens during the walk so
 * we never descend into `node_modules`, `.git`, etc.
 */
async function enumerateFiles(opts: EnumerateOptions): Promise<EnumerationResult> {
  const files: string[] = []
  const warnings: string[] = []
  const includeMatchers = opts.include.map(compileGlob)
  const excludeMatchers = opts.exclude.map(compileGlob)
  const prunedDirs = computePrunedDirs(opts.exclude)

  let totalBytes = 0
  let limitHit: 'files' | 'bytes' | 'time' | null = null

  async function walk(dir: string): Promise<void> {
    if (limitHit) return
    if (Date.now() > opts.deadline) {
      limitHit = 'time'
      return
    }

    let entries: Dirent[]
    try {
      entries = await fs.readdir(dir, { withFileTypes: true, encoding: 'utf8' })
    } catch {
      // Unreadable directory — silently skip; the catch in scan-fe-schemas
      // already sanitizes higher-level errors.
      return
    }

    for (const entry of entries) {
      if (limitHit) return
      const full = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        if (prunedDirs.has(entry.name)) continue
        await walk(full)
        continue
      }

      if (!entry.isFile()) continue

      const rel = path.relative(opts.rootDir, full).split(path.sep).join('/')
      if (!includeMatchers.some((m) => m(rel))) continue
      if (excludeMatchers.some((m) => m(rel))) continue

      if (files.length >= opts.maxFiles) {
        limitHit = 'files'
        return
      }

      // Cheap stat for byte accounting. Skipping stat errors quietly.
      try {
        const stat = await fs.stat(full)
        totalBytes += stat.size
        if (totalBytes > opts.maxTotalBytes) {
          limitHit = 'bytes'
          return
        }
      } catch {
        continue
      }

      files.push(full)
    }
  }

  await walk(opts.rootDir)

  if (limitHit === 'files') {
    warnings.push(
      `Max file count reached (${opts.maxFiles}); scan returned a partial result. ` +
        `Increase 'maxFiles' or narrow the include pattern to scan everything.`
    )
  } else if (limitHit === 'bytes') {
    warnings.push(
      `Max total bytes reached (${opts.maxTotalBytes}); scan returned a partial result. ` +
        `Increase 'maxTotalBytes' or narrow the include pattern.`
    )
  } else if (limitHit === 'time') {
    warnings.push(
      `Scan timeout reached while enumerating files; results are partial. ` +
        `Increase 'timeoutMs' or narrow the include pattern.`
    )
  }

  return { files, warnings }
}

/**
 * Returns the set of directory names we'll prune unconditionally during the
 * walk. Combines `ALWAYS_PRUNED_DIRS` with any single-segment directory the
 * user listed (e.g. `**\/foo/**` or `foo/**`).
 */
function computePrunedDirs(exclude: string[]): Set<string> {
  const out = new Set(ALWAYS_PRUNED_DIRS)
  for (const pattern of exclude) {
    // Match `**/<dir>/**` or `<dir>/**`
    const match = pattern.match(/^(?:\*\*\/)?([^*?[\]/]+)\/\*\*$/)
    if (match && match[1]) out.add(match[1])
  }
  return out
}

/**
 * Tiny glob → regex compiler. Supports `**`, `*`, and `?` only — sufficient
 * for the patterns the scanner uses. Returns a predicate that matches the
 * pattern against a POSIX-style relative path.
 */
function compileGlob(pattern: string): (rel: string) => boolean {
  // Normalize backslashes in pattern (Windows users sometimes pass them).
  const normalized = pattern.split('\\').join('/')

  // Build a regex. Process two-char tokens (`**`) before single chars.
  let re = '^'
  for (let i = 0; i < normalized.length; i += 1) {
    const ch = normalized[i]
    const next = normalized[i + 1]
    if (ch === '*' && next === '*') {
      // `**/` matches zero-or-more path segments.
      const after = normalized[i + 2]
      if (after === '/') {
        re += '(?:.*/)?'
        i += 2
      } else {
        re += '.*'
        i += 1
      }
      continue
    }
    if (ch === '*') {
      re += '[^/]*'
      continue
    }
    if (ch === '?') {
      re += '[^/]'
      continue
    }
    if (ch && /[.+^${}()|[\]\\]/.test(ch)) {
      re += `\\${ch}`
      continue
    }
    re += ch
  }
  re += '$'

  const compiled = new RegExp(re)
  return (rel: string) => compiled.test(rel)
}

