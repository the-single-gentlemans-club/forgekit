/**
 * types.ts — Public API contract for @forgekit/figma-plugin.
 *
 * Implement `PluginTokens` in your project's `tokens.ts` to adapt your
 * design tokens to this shape. The builders accept this interface directly
 * so swapping token sources requires only changing your `tokens.ts`.
 */

export interface ColorPalette {
  [shade: string]: string
}

export interface PluginTokens {
  /** Raw color palettes. Each key becomes a Variable group. */
  palettes: Record<string, ColorPalette>
  /** Absolute colors (white, black, transparent). */
  absolutes: Record<string, string>
  /**
   * Semantic alias map: { "background/primary": "#fafaf9" }
   * Used to create Variable aliases pointing back to primitives.
   */
  semantic: Record<string, string>
  /** Spacing scale: { "0": 0, "1": 4, ... } (px values) */
  spacing: Record<string, number>
  /** Border radius: { "none": 0, "sm": 4, ... } (px values) */
  borderRadius: Record<string, number>
  /** Typography token groups */
  typography: {
    fontSize: Record<string, number>
    fontWeight: Record<string, number>
    lineHeight: Record<string, number>
  }
  /** Gradient definitions used for component frames */
  gradients: Record<string, string[]>
}
