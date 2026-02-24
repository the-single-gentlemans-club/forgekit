import type { ForgeKitOrchestrator } from '../orchestrator.js'
import type { OnboardResult, ForgeKitContextConfig } from '../types.js'
import fs from 'node:fs'
import path from 'node:path'

export async function onboard(
  orchestrator: ForgeKitOrchestrator,
  config: ForgeKitContextConfig
): Promise<OnboardResult> {
  const outputDir = config.outputDir ?? '.forgekit'
  const rulesPath = path.join(config.storybook.projectRoot, outputDir, 'rules.md')

  // Step 1: Generate design system rules via Figma MCP
  let rulesFile = '(skipped — Figma unavailable)'
  try {
    const rulesResult = await orchestrator.callFigma('create_design_system_rules', {
      ...(config.figma.fileId ? { fileId: config.figma.fileId } : {}),
    })
    const rulesContent = typeof rulesResult === 'string'
      ? rulesResult
      : JSON.stringify(rulesResult, null, 2)

    fs.mkdirSync(path.dirname(rulesPath), { recursive: true })
    fs.writeFileSync(rulesPath, rulesContent, 'utf-8')
    rulesFile = rulesPath
  } catch (err) {
    process.stderr.write(`[context-mcp] Could not create rules from Figma: ${err}\n`)
  }

  // Step 2: Dry-run sync_all to preview what would be generated
  let syncPreview: unknown = null
  try {
    syncPreview = await orchestrator.callStorybook('sync_all', {
      dryRun: true,
      generateStories: true,
      generateTests: true,
      generateDocs: true,
    })
  } catch (err) {
    process.stderr.write(`[context-mcp] sync_all dry run failed: ${err}\n`)
    syncPreview = { error: String(err) }
  }

  const instructions = [
    `Onboarding complete.`,
    rulesFile !== '(skipped — Figma unavailable)'
      ? `Design system rules written to: ${rulesFile}`
      : `Figma rules skipped. Set FIGMA_ACCESS_TOKEN and re-run onboard.`,
    `Review the sync preview, then run get_design_system_state to see your full design system picture.`,
    `To generate all stories, tests, and docs: call forgekit-storybook-mcp sync_all without dryRun.`,
  ].join('\n')

  return { rulesFile, syncPreview, instructions }
}
