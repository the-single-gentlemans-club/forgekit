/**
 * MCP tool: `generate-routes`
 *
 * Takes a ContractModel + RoutePlan and produces Hono `.generated.ts` route
 * files. By default writes them to disk under `outputDir`; pass `dryRun: true`
 * to get the files back without touching disk (useful for previews).
 *
 * Inputs are validated against the shared `contractModelSchema` /
 * `routePlanSchema` from `./_schemas.js`, which enforces strict per-field
 * regexes on identifiers, path specs, and kebab segments before any work
 * happens.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { generateHonoRoutes } from '../generators/hono-routes.js'
import { writeGeneratedFiles } from '../generators/write-files.js'
import type { ContractModel, RoutePlan } from '../types.js'

import { contractModelSchema, routePlanSchema } from './_schemas.js'

const inputSchema = {
  contractModel: contractModelSchema.describe(
    'A ContractModel object (the output of `scan-fe-schemas`).'
  ),
  routePlan: routePlanSchema.describe(
    'A RoutePlan object (the output of `plan-bff-routes`).'
  ),
  outputDir: z
    .string()
    .describe(
      'Absolute path to the directory where generated routes are rooted ' +
        '(e.g. "/Users/me/myapp/apps/api/src/routes").'
    ),
  dryRun: z
    .boolean()
    .optional()
    .describe(
      'If true, return the file contents without writing to disk. Defaults to false.'
    ),
}

export function registerGenerateRoutesTool(server: McpServer): void {
  server.tool(
    'generate-routes',
    inputSchema,
    async (args) => {
      try {
        const output = await generateHonoRoutes(
          args.contractModel as ContractModel,
          args.routePlan as RoutePlan,
          { outputDir: args.outputDir }
        )

        const writeResult = await writeGeneratedFiles(output.files, {
          baseDir: args.outputDir,
          dryRun: args.dryRun ?? false,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  generated: output.files.length,
                  written: writeResult.writtenPaths.length,
                  skipped: writeResult.skippedPaths.length,
                  warnings: [...output.warnings, ...writeResult.warnings],
                  files: output.files.map((f) => ({
                    relativePath: f.relativePath,
                    bytes: f.contents.length,
                    preview: args.dryRun ? f.contents : undefined,
                  })),
                },
                null,
                2
              ),
            },
          ],
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          content: [
            {
              type: 'text',
              text: `Error generating routes: ${message}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
