/**
 * MCP tool: `plan-bff-routes`
 *
 * Given a `ContractModel` produced by `scan-fe-schemas`, returns a `RoutePlan`
 * with one CRUD-shaped resource group per id-bearing object schema.
 *
 * The input ContractModel is validated against the shared `contractModelSchema`
 * from `./_schemas.js`, which enforces the new discriminated `shape` union
 * (rejecting the legacy `isObjectSchema` / `hasIdField` / `fieldNames` keys).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'

import { planBffRoutes } from '../planner/route-planner.js'
import type { ContractModel } from '../types.js'

import { contractModelSchema } from './_schemas.js'

const inputSchema = {
  contractModel: contractModelSchema.describe(
    'A ContractModel object (the output of `scan-fe-schemas`).'
  ),
  pluralize: z
    .record(z.string(), z.string())
    .optional()
    .describe('Override pluralization for specific entity names (singular → plural).'),
  pathPrefix: z
    .string()
    .optional()
    .describe('Path prefix prepended to every generated route (e.g. "/api/v1").'),
  defaultAuth: z
    .boolean()
    .optional()
    .describe('Whether routes require authentication by default. Defaults to true.'),
}

export function registerPlanBffRoutesTool(server: McpServer): void {
  server.tool(
    'plan-bff-routes',
    inputSchema,
    async (args) => {
      try {
        const plan = planBffRoutes(args.contractModel as ContractModel, {
          pluralize: args.pluralize,
          pathPrefix: args.pathPrefix,
          defaultAuth: args.defaultAuth,
        })

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(plan, null, 2),
            },
          ],
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        return {
          content: [
            {
              type: 'text',
              text: `Error planning routes: ${message}`,
            },
          ],
          isError: true,
        }
      }
    }
  )
}
