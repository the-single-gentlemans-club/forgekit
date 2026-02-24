import { ThemeToken, ChakraMCPConfig } from '../types.js'
import { ChakraWriter } from '../writers/chakra.js'
import { TailwindWriter } from '../writers/tailwind.js'
import { DocsWriter } from '../writers/docs.js'

export async function writeThemeFile(theme: ThemeToken, outputDir: string, framework: 'chakra' | 'chakra-v3' = 'chakra', config?: ChakraMCPConfig): Promise<string[]> {
  const filesWritten: string[] = []

  // Legacy Mode (Backwards Compatibility)
  // If no 'outputs' array is defined, behave as before using outputDir and framework
  if (!config?.outputs || config.outputs.length === 0) {
      const chakraWriter = new ChakraWriter()
      const files = await chakraWriter.write(theme, outputDir, { version: framework === 'chakra-v3' ? 'v3' : 'v2' })
      filesWritten.push(...files)
      return filesWritten
  }

  // New Multi-Output Mode
  for (const output of config.outputs) {
    if (output.format === 'chakra' || output.format === 'chakra-v3') {
        const writer = new ChakraWriter()
        const files = await writer.write(theme, output.dir, { version: output.format === 'chakra-v3' ? 'v3' : 'v2' })
        filesWritten.push(...files)
    } else if (output.format === 'shadcn') {
        const writer = new TailwindWriter()
        const files = await writer.write(theme, output.dir, { cssPath: output.cssPath })
        filesWritten.push(...files)
    } else if (output.format === 'docs') {
        const writer = new DocsWriter()
        const files = await writer.write(theme, output.dir, { title: output.title })
        filesWritten.push(...files)
    }
  }

  return filesWritten
}
