/**
 * plugin.ts — Generic Figma plugin orchestrator.
 *
 * Call `setupPlugin(tokens, builders, options)` from your project's plugin
 * entry point. It wires up the Figma UI message handler and routes the
 * three standard commands: syncTokens, buildComponents, and fullSync.
 *
 * @example
 * ```ts
 * // plugin.ts (in your project)
 * import { setupPlugin } from 'forgekit-figma-plugin'
 * import { tokens } from './tokens'
 * import { buildComponentsPage } from './builders/components'
 * import { buildScreensPage } from './builders/screens'
 *
 * figma.showUI(__html__, { width: 320, height: 600, title: 'My Design System' })
 * setupPlugin(tokens, { buildComponentsPage, buildScreensPage })
 * ```
 */
import { buildPalettePage } from './builders/palette.js'
import { buildSpacingPage } from './builders/spacing.js'
import { buildTypographyPage } from './builders/typography.js'
import { syncVariables } from './builders/variables.js'
import type { PluginTokens } from './types.js'
import { uiLog, uiProgress } from './utils.js'

export interface PluginBuilders {
  /** Builds the 🧱 Components page. Optional — omit if you have no components page. */
  buildComponentsPage?: (tokens: PluginTokens) => Promise<void>
  /** Builds the 📱 Screens page. Optional — omit if you have no screens page. */
  buildScreensPage?: (tokens: PluginTokens) => Promise<void>
}

/**
 * Wire up Figma's `ui.onmessage` handler for the standard plugin commands.
 * Must be called after `figma.showUI(...)` in your plugin entry point.
 */
export function setupPlugin(tokens: PluginTokens, builders: PluginBuilders = {}): void {
  figma.ui.onmessage = async (msg: { type: string }) => {
    try {
      switch (msg.type) {
        case 'syncTokens':
          await runSyncTokens(tokens)
          break
        case 'buildComponents':
          await runBuildComponents(tokens, builders)
          break
        case 'fullSync':
          await runSyncTokens(tokens)
          await runBuildComponents(tokens, builders)
          break
        default:
          uiLog(`Unknown command: ${msg.type}`, 'warn')
          return
      }
      figma.ui.postMessage({ type: 'done' })
    } catch (err) {
      console.error(err)
      figma.ui.postMessage({ type: 'error', message: String(err) })
    }
  }
}

async function runSyncTokens(tokens: PluginTokens): Promise<void> {
  uiLog('Syncing design tokens → Figma Variables…')
  uiProgress(5)

  const total = await syncVariables(tokens)

  uiProgress(100)
  uiLog(`✓ ${total} variables synced across 3 collections`, 'success')

  figma.ui.postMessage({
    type: 'stats',
    colors:
      Object.values(tokens.palettes).reduce((n, p) => n + Object.keys(p).length, 0) +
      Object.keys(tokens.absolutes).length,
    semantic: Object.keys(tokens.semantic).length,
    spacing: Object.keys(tokens.spacing).length,
    radius: Object.keys(tokens.borderRadius).length,
    typo:
      Object.keys(tokens.typography.fontSize).length +
      Object.keys(tokens.typography.fontWeight).length +
      Object.keys(tokens.typography.lineHeight).length,
  })
}

async function runBuildComponents(tokens: PluginTokens, builders: PluginBuilders): Promise<void> {
  uiLog('Building design system pages…')

  uiProgress(10)
  uiLog('Building color palette page…')
  await buildPalettePage(tokens)
  uiLog('  ✓ Color palette', 'success')

  uiProgress(35)
  uiLog('Building typography page…')
  await buildTypographyPage(tokens)
  uiLog('  ✓ Typography', 'success')

  uiProgress(55)
  uiLog('Building spacing & radius page…')
  await buildSpacingPage(tokens)
  uiLog('  ✓ Spacing & Radius', 'success')

  if (builders.buildComponentsPage) {
    uiProgress(70)
    uiLog('Building components page…')
    await builders.buildComponentsPage(tokens)
    uiLog('  ✓ Components', 'success')
  }

  if (builders.buildScreensPage) {
    uiProgress(85)
    uiLog('Building screens page…')
    await builders.buildScreensPage(tokens)
    uiLog('  ✓ Screens', 'success')
  }

  uiProgress(100)
  uiLog('All pages built.', 'success')
}
