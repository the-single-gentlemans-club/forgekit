import { createStorybookMCPServer } from './forgekit-storybook-mcp.js'

describe('forgekit-storybook-mcp-temp', () => {
  it('exports createStorybookMCPServer', () => {
    expect(typeof createStorybookMCPServer).toBe('function')
  })
})
