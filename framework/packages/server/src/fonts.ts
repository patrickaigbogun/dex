export type DexFontSpec = {
	family: string
	variable?: string // e.g. '--font-sans'
	weights?: string // e.g. '100..900' or '400;700'
	ital?: boolean
	display?: 'swap' | 'auto' | 'block' | 'fallback' | 'optional'
	provider?: 'google' | 'none'
}

export type DexFontsConfig = Record<string, string | DexFontSpec>

type NormalizedFontSpec = {
	key: string
	family: string
	variable: string
	weights: string
	ital: boolean
	display: 'swap' | 'auto' | 'block' | 'fallback' | 'optional'
	provider: 'google' | 'none'
}

function sanitizeKey(key: string): string {
	return key.replace(/[^a-zA-Z0-9_-]/g, '')
}

function escapeCssString(val: string): string {
	return val
		.replace(/[\r\n\f\0]+/g, '')
		.replace(/\\/g, '\\\\')
		.replace(/'/g, "\\'")
		.replace(/"/g, '\\"')
		.replace(/</g, '\\3C ')
		.replace(/>/g, '\\3E ')
		.replace(/&/g, '\\26 ')
		.replace(/\//g, '\\2F ')
}

function escapeHtmlAttr(val: string): string {
	return val
		.replace(/&/g, '&amp;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
}

const VALID_DISPLAYS = new Set(['swap', 'auto', 'block', 'fallback', 'optional'])

function normalizeFonts(fonts?: DexFontsConfig): NormalizedFontSpec[] {
	if (!fonts || typeof fonts !== 'object') return []

	const result: NormalizedFontSpec[] = []
	for (const [rawKey, spec] of Object.entries(fonts)) {
		const key = sanitizeKey(rawKey)
		if (!key) continue

		if (typeof spec === 'string') {
			const family = spec.trim()
			if (!family) continue
			result.push({
				key,
				family,
				variable: `--font-${key}`,
				weights: '100..900',
				ital: false,
				display: 'swap',
				provider: 'google',
			})
		} else if (spec && typeof spec === 'object') {
			const family = (spec.family ?? '').trim()
			if (!family) continue
			const rawVar = spec.variable?.trim()
			const candidateVar = rawVar ? (rawVar.startsWith('--') ? rawVar : `--${rawVar}`) : `--font-${key}`
			const variable = /^--[a-zA-Z0-9_-]+$/.test(candidateVar) ? candidateVar : `--font-${key}`
			const rawWeights = spec.weights !== undefined ? spec.weights.trim() : '100..900'
			const weights = /^[0-9.;]+$/.test(rawWeights) ? rawWeights : '100..900'
			const display = (spec.display && VALID_DISPLAYS.has(spec.display) ? spec.display : 'swap') as NormalizedFontSpec['display']
			result.push({
				key,
				family,
				variable,
				weights,
				ital: Boolean(spec.ital),
				display,
				provider: spec.provider ?? 'google',
			})
		}
	}

	return result
}

/**
 * Build a Google Fonts CSS2 stylesheet URL from a Dex fonts config.
 * Returns null when no Google-hosted fonts are configured.
 */
export function buildGoogleFontsUrl(fonts: DexFontsConfig): string | null {
	const entries = normalizeFonts(fonts).filter((f) => f.provider !== 'none')
	if (entries.length === 0) return null

	const familyParams: string[] = []
	for (const entry of entries) {
		const encodedFamily = encodeURIComponent(entry.family).replace(/%20/g, '+')
		if (entry.ital) {
			if (entry.weights.includes('..')) {
				familyParams.push(`family=${encodedFamily}:ital,wght@0,${entry.weights};1,${entry.weights}`)
			} else if (entry.weights) {
				const weights = entry.weights
					.split(';')
					.map((w) => w.trim())
					.filter(Boolean)
				const tuples = [
					...weights.map((w) => `0,${w}`),
					...weights.map((w) => `1,${w}`),
				]
				familyParams.push(`family=${encodedFamily}:ital,wght@${tuples.join(';')}`)
			} else {
				familyParams.push(`family=${encodedFamily}:ital@0;1`)
			}
		} else if (entry.weights) {
			familyParams.push(`family=${encodedFamily}:wght@${entry.weights}`)
		} else {
			familyParams.push(`family=${encodedFamily}`)
		}
	}

	const display = entries[0]?.display ?? 'swap'
	return `https://fonts.googleapis.com/css2?${familyParams.join('&')}&display=${display}`
}

/**
 * Inject Google Fonts links and CSS variable/utility definitions before </head>.
 */
export function injectGoogleFonts(html: string, fonts?: DexFontsConfig): string {
	const entries = normalizeFonts(fonts)
	if (entries.length === 0) return html
	if (html.includes('id="dex-fonts-theme"')) return html
	if (!/<\/head>/i.test(html)) return html

	const tags: string[] = []
	const url = buildGoogleFontsUrl(fonts!)
	if (url) {
		if (!html.includes('https://fonts.googleapis.com')) {
			tags.push('<link rel="preconnect" href="https://fonts.googleapis.com">')
		}
		if (!html.includes('https://fonts.gstatic.com')) {
			tags.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>')
		}
		tags.push(`<link rel="stylesheet" href="${escapeHtmlAttr(url)}">`)
	}

	const rootVars = entries
		.map((f) => `  ${f.variable}: '${escapeCssString(f.family)}', sans-serif;`)
		.join('\n')
	const utilityClasses = entries
		.map((f) => `.font-${f.key} { font-family: var(${f.variable}); }`)
		.join('\n')

	tags.push(`<style id="dex-fonts-theme">\n:root {\n${rootVars}\n}\n${utilityClasses}\n</style>`)

	return html.replace(/<\/head>/i, () => `\t\t${tags.join('\n\t\t')}\n\t</head>`)
}

/**
 * Generate a Tailwind v4 @theme CSS block mapping font theme variables.
 */
export function generateFontThemeCss(fonts: DexFontsConfig): string {
	const entries = normalizeFonts(fonts)
	if (entries.length === 0) return ''

	const lines = entries.map(
		(f) => `  ${f.variable}: '${escapeCssString(f.family)}', sans-serif;`
	)
	return `@theme {\n${lines.join('\n')}\n}\n`
}
