/**
 * Tests for the disk-write companion: writeGeneratedFiles().
 *
 * Uses a real tmp directory per-test to exercise the file system without
 * polluting the workspace. Each test cleans up its own tmpdir on exit.
 */

import {
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { writeGeneratedFiles } from '../generators/write-files.js'
import type { GeneratedFile } from '../types.js'

let tmp: string

beforeEach(async () => {
  // realpath the tmpdir — macOS returns /var/folders/... which is itself a
  // symlink to /private/var/folders/.... Resolving up front means our
  // containment checks compare apples-to-apples.
  tmp = await realpath(await mkdtemp(path.join(os.tmpdir(), 'forgekit-bff-write-')))
})

afterEach(async () => {
  if (tmp) await rm(tmp, { recursive: true, force: true })
})

function gen(relativePath: string, contents: string): GeneratedFile {
  return { relativePath, contents, generated: true }
}

describe('writeGeneratedFiles', () => {
  it('writes generated files under the base directory', async () => {
    const result = await writeGeneratedFiles(
      [
        gen('index.generated.ts', '// top\n'),
        gen('users/list.generated.ts', '// list\n'),
      ],
      { baseDir: tmp }
    )

    expect(result.writtenPaths).toHaveLength(2)
    expect(result.skippedPaths).toEqual([])
    expect(result.warnings).toEqual([])

    expect(await readFile(path.join(tmp, 'index.generated.ts'), 'utf8')).toBe('// top\n')
    expect(await readFile(path.join(tmp, 'users/list.generated.ts'), 'utf8')).toBe('// list\n')
  })

  it('overwrites existing .generated.ts files without warning', async () => {
    await writeFile(path.join(tmp, 'old.generated.ts'), 'stale contents')

    const result = await writeGeneratedFiles(
      [gen('old.generated.ts', 'fresh contents')],
      { baseDir: tmp }
    )

    expect(result.writtenPaths).toHaveLength(1)
    expect(result.warnings).toEqual([])
    expect(await readFile(path.join(tmp, 'old.generated.ts'), 'utf8')).toBe('fresh contents')
  })

  it('respects dryRun and writes nothing to disk', async () => {
    const result = await writeGeneratedFiles(
      [gen('preview.generated.ts', '// preview\n')],
      { baseDir: tmp, dryRun: true }
    )

    expect(result.writtenPaths).toHaveLength(1) // logically planned
    await expect(
      readFile(path.join(tmp, 'preview.generated.ts'), 'utf8')
    ).rejects.toThrow()
  })

  it('refuses to overwrite a hand-written (non-.generated.ts) file', async () => {
    const hand = path.join(tmp, 'users/middleware.ts')
    await mkdir(path.dirname(hand), { recursive: true })
    await writeFile(hand, 'export const requireUser = () => {}\n')

    const result = await writeGeneratedFiles(
      [gen('users/middleware.ts', 'OVERWRITE_ATTEMPT')],
      { baseDir: tmp }
    )

    expect(result.writtenPaths).toEqual([])
    expect(result.skippedPaths).toHaveLength(1)
    expect(result.warnings[0]).toContain('Refusing to overwrite hand-written file')
    expect(await readFile(hand, 'utf8')).toBe('export const requireUser = () => {}\n')
  })

  it('creates nested directories as needed', async () => {
    const result = await writeGeneratedFiles(
      [gen('a/b/c/d/deep.generated.ts', '// nested\n')],
      { baseDir: tmp }
    )

    expect(result.writtenPaths).toHaveLength(1)
    expect(await readFile(path.join(tmp, 'a/b/c/d/deep.generated.ts'), 'utf8')).toBe(
      '// nested\n'
    )
  })

  it('handles an empty files array', async () => {
    const result = await writeGeneratedFiles([], { baseDir: tmp })
    expect(result).toEqual({ writtenPaths: [], skippedPaths: [], warnings: [] })
  })

  // ──────────────────────────────────────────────────────────────────
  // [H-001] Path containment — reject anything that escapes baseDir
  // ──────────────────────────────────────────────────────────────────

  describe('path traversal (H-001)', () => {
    it('refuses a relativePath that uses .. to escape baseDir', async () => {
      const result = await writeGeneratedFiles(
        [gen('../escape.generated.ts', 'evil')],
        { baseDir: tmp }
      )

      expect(result.writtenPaths).toEqual([])
      expect(result.skippedPaths).toHaveLength(1)
      expect(result.warnings.some((w) => /Refusing to write outside baseDir/.test(w))).toBe(
        true
      )

      // Also assert nothing was actually written to the escaped location.
      const escaped = path.resolve(tmp, '..', 'escape.generated.ts')
      await expect(readFile(escaped, 'utf8')).rejects.toThrow()
    })

    it('refuses deep traversal even if it ends in .generated.ts', async () => {
      const result = await writeGeneratedFiles(
        [gen('../../../etc/sneaky.generated.ts', 'evil')],
        { baseDir: tmp }
      )

      expect(result.writtenPaths).toEqual([])
      expect(result.warnings.some((w) => /Refusing to write outside baseDir/.test(w))).toBe(
        true
      )
    })

    it('refuses an absolute path that points outside baseDir', async () => {
      const result = await writeGeneratedFiles(
        [gen('/tmp/forgekit-pwned.generated.ts', 'evil')],
        { baseDir: tmp }
      )

      expect(result.writtenPaths).toEqual([])
      expect(result.warnings.some((w) => /Refusing to write outside baseDir/.test(w))).toBe(
        true
      )
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // [H-003] Symlink containment — reject if realpath escapes baseDir
  // ──────────────────────────────────────────────────────────────────

  describe('symlink traversal (H-003)', () => {
    it('refuses to write through a symlink that points outside baseDir', async () => {
      // Create another tmp dir outside baseDir — that's the escape target.
      const outside = await realpath(
        await mkdtemp(path.join(os.tmpdir(), 'forgekit-bff-escape-'))
      )

      try {
        // Inside baseDir, create a symlink "exit" → outside.
        const link = path.join(tmp, 'exit')
        await symlink(outside, link, 'dir')

        const result = await writeGeneratedFiles(
          [gen('exit/owned.generated.ts', 'evil')],
          { baseDir: tmp }
        )

        expect(result.writtenPaths).toEqual([])
        expect(result.skippedPaths).toHaveLength(1)
        expect(
          result.warnings.some((w) =>
            /Refusing to follow symlink/.test(w)
          )
        ).toBe(true)

        // Confirm nothing landed in the outside dir.
        await expect(
          readFile(path.join(outside, 'owned.generated.ts'), 'utf8')
        ).rejects.toThrow()
      } finally {
        await rm(outside, { recursive: true, force: true })
      }
    })

    it('allows a symlink that points to a directory still inside baseDir', async () => {
      // baseDir/real/ + baseDir/link → baseDir/real
      const realDir = path.join(tmp, 'real')
      await mkdir(realDir, { recursive: true })
      await symlink(realDir, path.join(tmp, 'link'), 'dir')

      const result = await writeGeneratedFiles(
        [gen('link/inside.generated.ts', '// ok\n')],
        { baseDir: tmp }
      )

      expect(result.writtenPaths).toHaveLength(1)
      expect(result.warnings).toEqual([])
      expect(await readFile(path.join(tmp, 'real', 'inside.generated.ts'), 'utf8')).toBe(
        '// ok\n'
      )
    })
  })

  // ──────────────────────────────────────────────────────────────────
  // [M-022] Parallel writes — many files at once still land correctly
  // ──────────────────────────────────────────────────────────────────

  it('writes many files in parallel without losing content', async () => {
    const files = Array.from({ length: 50 }, (_, i) =>
      gen(`bulk/file${i}.generated.ts`, `// file-${i}\n`)
    )

    const result = await writeGeneratedFiles(files, { baseDir: tmp })

    expect(result.writtenPaths).toHaveLength(50)
    for (let i = 0; i < 50; i++) {
      expect(
        await readFile(path.join(tmp, 'bulk', `file${i}.generated.ts`), 'utf8')
      ).toBe(`// file-${i}\n`)
    }
  })
})
