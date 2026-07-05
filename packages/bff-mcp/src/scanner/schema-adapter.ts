/**
 * SchemaAdapter — the boundary between the schema library a project uses
 * (Zod v0.1; Effect/Schema + TypeBox planned for v0.2) and the rest of
 * @forgekit/bff-mcp's generators.
 *
 * For v0.1 only the Zod adapter exists. v0.2 will register additional
 * adapters and the scanner will pick one based on the source file's imports.
 *
 * v0.1 carries two extraction surfaces:
 *
 *   - `extractEntity(decl, ctx)` — the per-declaration entry point the
 *     current scanner loop calls. Suitable for adapters whose schemas are
 *     always declared as a single `export const X = library.call(...)`.
 *
 *   - `extractEntities(sourceFile, ctx)` — the whole-file entry point.
 *     Returns every entity discovered in a single source file. Adapters that
 *     need module-eval inspection (Effect/Schema's
 *     `Schema.Struct({...}).pipe(Schema.brand(...))`, where the brand call
 *     wraps the struct), or that want to share a parse pass across multiple
 *     declarations, implement this instead of (or in addition to) the
 *     per-decl variant.
 *
 * The Zod adapter implements both: `extractEntities` walks the source file's
 * exported variable declarations and delegates each to `extractEntity`.
 */

import type { SourceFile, VariableDeclaration } from 'ts-morph'

import type { EntitySchemaRef } from '../types.js'

export interface SchemaAdapterContext {
  /** Absolute path of the root directory being scanned. */
  rootDir: string
}

export interface SchemaAdapter {
  /** Human-readable name for diagnostics (e.g. "zod", "effect-schema"). */
  readonly name: string

  /**
   * Does this source file appear to use this schema library?
   * Checked once per source file so we don't re-parse imports for every
   * variable declaration.
   */
  matchesFile(sourceFile: SourceFile): boolean

  /**
   * Given an exported variable declaration whose source file matched, decide
   * whether it's a schema this adapter recognizes and, if so, return the
   * structured reference.
   *
   * Returns `null` if the declaration isn't a recognized schema — the scanner
   * will move on without error.
   *
   * Adapters whose recognition is whole-file (Effect/Schema, TypeBox) may
   * leave this as `() => null` and implement `extractEntities` instead.
   */
  extractEntity(
    decl: VariableDeclaration,
    ctx: SchemaAdapterContext
  ): EntitySchemaRef | null

  /**
   * Extract every entity declared in `sourceFile`. The default behaviour for
   * adapters that only implement `extractEntity` is to iterate exported const
   * declarations and call it for each — adapters can override this when they
   * need a wider view (e.g. resolving a `pipe(brand(...))` wrapping a struct
   * declared on a sibling const).
   */
  extractEntities(
    sourceFile: SourceFile,
    ctx: SchemaAdapterContext
  ): EntitySchemaRef[]
}
