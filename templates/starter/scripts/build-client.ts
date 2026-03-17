import { getPublicEnvDefines } from '@dex/server'

// Explicitly pass environment defines
const defineArgs = getPublicEnvDefines()

const proc = Bun.spawn(
	[
		'bun',
		'build',
		'core/bootstrap/web.tsx',
		'--target',
		'browser',
		'--minify',
		'--outfile',
		'build/assets/client.js',
		...defineArgs,
	],
	{ stdout: 'inherit', stderr: 'inherit', stdin: 'inherit' }
)

const code = await proc.exited
if (code !== 0) process.exit(code)
