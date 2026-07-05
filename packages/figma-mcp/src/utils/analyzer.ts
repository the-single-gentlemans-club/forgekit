import { FigmaToken } from '../types.js'

export type DetectedFramework = 'shadcn' | 'chakra' | 'unknown'

export function detectFramework(tokens: FigmaToken[]): DetectedFramework {
  const names = new Set(tokens.map((t) => t.name.toLowerCase()))

  // Shadcn uses specific semantic names
  // We check for a critical mass of them
  const shadcnKeywords = [
    'background',
    'foreground',
    'primary',
    'secondary',
    'destructive',
    'muted',
    'accent',
    'popover',
    'card',
    'input',
    'ring',
  ]

  const shadcnMatches = shadcnKeywords.filter((k) => Array.from(names).some((n) => n.includes(k)))

  // If we match > 50% of shadcn keywords, it's likely Shadcn
  if (shadcnMatches.length >= shadcnKeywords.length / 2) {
    return 'shadcn'
  }

  // Chakra usually relies on primitive scales (blue.500, etc) or specific semantic tokens in v3
  // But since Chakra is the "default" for many generic systems, we might default to it if it looks like a standard design system
  // For now, let's return unknown if not clearly Shadcn, or maybe 'chakra' if we see standard color scales?

  const hasColorScales = Array.from(names).some((n) => n.match(/[a-z]+\.(50|100|500|900)/))
  if (hasColorScales) {
    return 'chakra'
  }

  return 'unknown'
}
