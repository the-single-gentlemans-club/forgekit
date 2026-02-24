import fs from 'fs/promises'
import path from 'path'
import { ChakraMCPConfig } from './types.js'

export async function loadConfig(): Promise<ChakraMCPConfig | null> {
  try {
    const configPath = path.resolve(process.cwd(), 'forgekit.json')
    const content = await fs.readFile(configPath, 'utf-8')
    return JSON.parse(content) as ChakraMCPConfig
  } catch (error) {
    return null
  }
}
