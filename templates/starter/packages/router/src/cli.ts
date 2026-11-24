import { generateFsRoutes, generateLayouts, watchAndGenerate } from './generate'
import { loadDexConfig } from './config'

function help() {
	console.log(`dex-router

Usage:
  dex-router generate
  dex-router watch

Options:
  --pagesDir <path>
  --layoutsDir <path>
  --outRoutesTs <path>
  --outRoutesJson <path>
  --outLayoutsTs <path>

Paths are resolved with this precedence:
  1. CLI flags
  2. Values from dex.config.* (nearest)
  3. Built-in defaults

All paths are relative to the directory containing the dex.config file (project root).
`)
}

function getArg(flag: string) {
	const i = process.argv.indexOf(flag)
	if (i === -1) return undefined
	return process.argv[i + 1]
}

const cmd = process.argv[2]
if (!cmd || cmd === '-h' || cmd === '--help') {
	help()
	process.exit(0)
}

const { config } = await loadDexConfig()

type PathKey = 'pagesDir' | 'layoutsDir' | 'outRoutesTs' | 'outRoutesJson' | 'outLayoutsTs'

function getValue(flag: string, configKey: PathKey): string | undefined {
	const fromFlag = getArg(flag)
	if (fromFlag !== undefined) return fromFlag
	return config[configKey]
}

const pagesDir = getValue('--pagesDir', 'pagesDir')
const layoutsDir = getValue('--layoutsDir', 'layoutsDir')
const outRoutesTs = getValue('--outRoutesTs', 'outRoutesTs')
const outRoutesJson = getValue('--outRoutesJson', 'outRoutesJson')
const outLayoutsTs = getValue('--outLayoutsTs', 'outLayoutsTs')

if (cmd === 'generate') {
	await generateFsRoutes({ pagesDir, outTs: outRoutesTs, outJson: outRoutesJson })
	await generateLayouts({ layoutsDir, outTs: outLayoutsTs })
	process.exit(0)
}

if (cmd === 'watch') {
	await watchAndGenerate({ pagesDir, layoutsDir, outRoutesTs, outRoutesJson, outLayoutsTs })
	await new Promise<never>(() => {})
}

console.error(`Unknown command: ${cmd}`)
help()
process.exit(1)
