/**
 * Prettier wrapper used by every generator. Centralizing it lets us tweak
 * formatting options in one place + makes it easy to swap engines later.
 *
 * Note: prettier's `format` is async in v3+, so this is async too. Generators
 * await it once per file.
 */

import prettier from 'prettier'

export interface FormatOptions {
  parser?: prettier.BuiltInParserName
}

const DEFAULTS = {
  parser: 'typescript' as const,
  semi: false,
  singleQuote: true,
  trailingComma: 'all' as const,
  printWidth: 100,
  arrowParens: 'always' as const,
}

export async function format(code: string, options: FormatOptions = {}): Promise<string> {
  return prettier.format(code, {
    ...DEFAULTS,
    parser: options.parser ?? DEFAULTS.parser,
  })
}
