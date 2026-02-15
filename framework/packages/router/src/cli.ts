import { generateFsRoutes, generateLayouts, watchAndGenerate } from './generate'

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

const pagesDir = getArg('--pagesDir')
const layoutsDir = getArg('--layoutsDir')
const outRoutesTs = getArg('--outRoutesTs')
const outRoutesJson = getArg('--outRoutesJson')
const outLayoutsTs = getArg('--outLayoutsTs')

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
