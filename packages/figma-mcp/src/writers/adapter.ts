import { ThemeToken } from '../types.js'

export interface WriterAdapter {
  write(theme: ThemeToken, outputDir: string, options?: any): Promise<string[]>
}
