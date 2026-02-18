#!/usr/bin/env node
/**
 * ForgeKit Context MCP CLI
 *
 * Orchestrates Figma MCP + Storybook MCP to expose high-level design system tools.
 *
 * Usage:
 *   npx forgekit-context [options]
 *
 * Add to Claude Desktop / Claude Code mcp settings:
 *   {
 *     "forgekit-context": {
 *       "command": "npx",
 *       "args": ["forgekit-context", "--project-root=/path/to/project"],
 *       "env": {
 *         "FIGMA_ACCESS_TOKEN": "your-token",
 *         "FIGMA_FILE_ID": "your-file-id"
 *       }
 *     }
 *   }
 */

import { runContextServer } from './server.js'
import type { ForgeKitContextConfig } from './types.js'
import type { LibraryConfig } from 'forgekit-storybook-mcp'
import fs from 'node:fs'
import path from 'node:path'

interface ParsedArgs {
  figmaToken: string
  figmaFileId?: string
  figmaUseDesktop: boolean
  figmaRemoteUrl?: string
  projectRoot: string
  licenseKey?: string
  outputDir: string
  storybookUrl: string
  help: boolean
}

function parseArgs(): ParsedArgs {
  const argv = process.argv.slice(2)
  const get = (flag: string) => {
    const entry = argv.find(a => a.startsWith(`--${flag}=`))
    return entry ? entry.split('=').slice(1).join('=') : undefined
  }
  const has = (flag: string) => argv.includes(`--${flag}`)

  return {
    figmaToken: get('figma-token') ?? process.env['FIGMA_ACCESS_TOKEN'] ?? '',
    figmaFileId: get('figma-file') ?? process.env['FIGMA_FILE_ID'],
    figmaUseDesktop: !has('figma-remote'),
    figmaRemoteUrl: get('figma-remote-url'),
    projectRoot: get('project-root') ?? process.cwd(),
    licenseKey:
      get('license-key') ??
      process.env['FORGEKIT_LICENSE'] ??
      process.env['STORYBOOK_MCP_LICENSE'],
    outputDir: get('output-dir') ?? '.forgekit',
    storybookUrl: get('storybook-url') ?? 'http://localhost:6006',
    help: has('help') || has('h'),
  }
}

function showHelp(): void {
  process.stdout.write(`
forgekit-context — MCP orchestrator for Figma + Storybook

USAGE:
  npx forgekit-context [options]

OPTIONS:
  --figma-token=TOKEN       Figma Personal Access Token (or FIGMA_ACCESS_TOKEN env)
  --figma-file=FILE_ID      Figma file ID (or FIGMA_FILE_ID env)
  --figma-remote            Use remote Figma MCP instead of local npx
  --figma-remote-url=URL    Override remote Figma MCP URL
  --project-root=PATH       Root of the React project (default: cwd)
  --license-key=KEY         ForgeKit Pro license key (or FORGEKIT_LICENSE env)
  --output-dir=DIR          Output directory for generated files (default: .forgekit)
  --storybook-url=URL       Storybook base URL for sync_stories_to_figma (default: http://localhost:6006)
  -h, --help                Show this help

TOOLS EXPOSED:
  get_design_system_state    Figma tokens + Code Connect map + React component coverage
  get_gaps                   Figma/code mapping gaps + missing stories
  get_component              Merged design context + code analysis for one component
  get_drifted_components     Components with hardcoded values that should be tokens
  get_missing_components     Figma components with no code counterpart (suggestions)
  onboard                    Generate .forgekit/rules.md + preview story/test/docs generation
  sync_stories_to_figma      Push story renders to Figma as editable frames (requires Figma desktop)

ENVIRONMENT VARIABLES:
  FIGMA_ACCESS_TOKEN         Figma personal access token
  FIGMA_FILE_ID              Figma file ID to analyze
  FORGEKIT_LICENSE           ForgeKit Pro license key
`)
}

function detectLibraries(projectRoot: string): LibraryConfig[] {
  const candidates: Array<{ check: string; path: string; name: string; prefix: string }> = [
    { check: 'src/components', path: '.', name: 'components', prefix: 'Components' },
    { check: 'src/lib', path: '.', name: 'lib', prefix: 'Lib' },
    { check: 'packages/ui/src', path: 'packages/ui', name: 'ui', prefix: 'UI' },
    { check: 'packages/components/src', path: 'packages/components', name: 'components', prefix: 'Components' },
    { check: 'libs/ui/src', path: 'libs/ui', name: 'ui', prefix: 'UI' },
  ]

  const found: LibraryConfig[] = []
  for (const c of candidates) {
    if (fs.existsSync(path.join(projectRoot, c.check))) {
      found.push({ name: c.name, path: c.path, storyTitlePrefix: c.prefix })
    }
  }

  return found.length > 0
    ? found
    : [{ name: 'src', path: '.', storyTitlePrefix: 'Components' }]
}

async function main(): Promise<void> {
  const args = parseArgs()

  if (args.help) {
    showHelp()
    process.exit(0)
  }

  if (!args.figmaToken) {
    process.stderr.write(
      '[context-mcp] WARNING: No Figma access token. Set --figma-token or FIGMA_ACCESS_TOKEN.\n' +
      '[context-mcp] Figma tools will be unavailable until a token is provided.\n'
    )
  }

  const libraries: LibraryConfig[] = detectLibraries(args.projectRoot)
  process.stderr.write(
    `[context-mcp] Detected ${libraries.length} library(ies): ${libraries.map(l => l.name).join(', ')}\n`
  )

  const config: ForgeKitContextConfig = {
    figma: {
      accessToken: args.figmaToken,
      fileId: args.figmaFileId,
      useDesktop: args.figmaUseDesktop,
      ...(args.figmaRemoteUrl ? { remoteUrl: args.figmaRemoteUrl } : {}),
    },
    storybook: {
      projectRoot: args.projectRoot,
      libraries,
      licenseKey: args.licenseKey,
      storybookUrl: args.storybookUrl,
    },
    outputDir: args.outputDir,
  }

  await runContextServer(config)
}

main().catch(err => {
  process.stderr.write(`[context-mcp] Fatal error: ${err instanceof Error ? err.message : err}\n`)
  process.exit(1)
})
