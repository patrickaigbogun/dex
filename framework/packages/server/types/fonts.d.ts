export type DexFontSpec = {
    family: string;
    variable?: string;
    weights?: string;
    ital?: boolean;
    display?: 'swap' | 'auto' | 'block' | 'fallback' | 'optional';
    provider?: 'google' | 'none';
};
export type DexFontsConfig = Record<string, string | DexFontSpec>;
/**
 * Build a Google Fonts CSS2 stylesheet URL from a Dex fonts config.
 * Returns null when no Google-hosted fonts are configured.
 */
export declare function buildGoogleFontsUrl(fonts: DexFontsConfig): string | null;
/**
 * Inject Google Fonts links and CSS variable/utility definitions before </head>.
 */
export declare function injectGoogleFonts(html: string, fonts?: DexFontsConfig): string;
/**
 * Generate a Tailwind v4 @theme CSS block mapping font theme variables.
 */
export declare function generateFontThemeCss(fonts: DexFontsConfig): string;
