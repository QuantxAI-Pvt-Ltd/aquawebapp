/**
 * Oceanic Theme Design Tokens
 * Curated color palette inspired by deep marine waters, vibrant aquaculture cyan, and coral alert states.
 */

export const oceanicTokens = {
  colors: {
    // Deep Ocean Backgrounds
    abyss: '#070c14',
    deepNavy: '#0c1527',
    oceanSurface: '#14223d',

    // Primary Aquatic Accents
    cyanGlow: '#06b6d4',
    deepCyan: '#0891b2',
    tealWave: '#0d9488',
    seafoam: '#14b8a6',

    // Status / Health Indicators
    emeraldHealthy: '#10b981', // Good water / normal shrimp health
    amberWarning: '#f59e0b',   // Parameter borderline
    coralDanger: '#f43f5e',    // Water parameter alert / disease detected

    // Neutrals & Glass
    glassBg: 'rgba(12, 21, 39, 0.75)',
    glassBorder: 'rgba(6, 182, 212, 0.2)',
    glassBorderHover: 'rgba(6, 182, 212, 0.45)',
  },
  gradients: {
    oceanGlow: 'linear-gradient(135deg, rgba(8, 145, 178, 0.15) 0%, rgba(6, 182, 212, 0.05) 100%)',
    abyssGlow: 'linear-gradient(180deg, #0c1527 0%, #070c14 100%)',
    cyanAccent: 'linear-gradient(90deg, #0891b2 0%, #06b6d4 100%)',
  },
  blur: {
    glass: 'backdrop-blur-md',
  },
} as const;

export type OceanicTokens = typeof oceanicTokens;
