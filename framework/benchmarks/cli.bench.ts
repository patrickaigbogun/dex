import { mkdtemp, rm, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { performance } from 'node:perf_hooks'

export type CliBenchResult = {
	binarySizeMb: number
	startupMedianMs: number
	pieGenerate100EndpointsMs: number
}

function buildLargeOpenApiYaml(endpoints: number): string {
	const lines: string[] = [
		'openapi: "3.0.3"',
		'info:',
		'  title: "Dex Benchmark API"',
		'  version: "1.0.0"',
		'paths:',
	]
	for (let i = 0; i < endpoints; i++) {
		lines.push(
			`  /api/v1/resource-${i}/{id}:`,
			'    get:',
			'      parameters:',
			'        - name: id',
			'          in: path',
			'          required: true',
			'          schema:',
			'            type: string',
			'        - name: limit',
			'          in: query',
			'          required: false',
			'          schema:',
			'            type: integer',
			'      responses:',
			'        "200":',
			'          description: ok',
			'          content:',
			'            application/json:',
			'              schema:',
			'                $ref: "#/components/schemas/Item"'
		)
	}
	lines.push(
		'components:',
		'  schemas:',
		'    Item:',
		'      type: object',
		'      required:',
		'        - id',
		'        - name',
		'      properties:',
		'        id:',
		'          type: string',
		'        name:',
		'          type: string',
		'        active:',
		'          type: boolean'
	)
	return lines.join('\n') + '\n'
}

export async function runCliBench(): Promise<CliBenchResult> {
	const repoRoot = path.resolve(import.meta.dir, '../..')
	const cliDir = path.join(repoRoot, 'cli')
	const tmp = await mkdtemp(path.join(os.tmpdir(), 'dex-bench-cli-'))
	const binPath = path.join(tmp, 'dex')

	try {
		const goBin = Bun.which('go') ?? '/usr/local/bin/go'
		const buildProc = Bun.spawn(
			[goBin, 'build', '-trimpath', '-ldflags=-s -w -X main.Version=v0.3.0', '-o', binPath, './cmd/dex'],
			{
				cwd: cliDir,
				env: { ...process.env, CGO_ENABLED: '0' },
				stdout: 'ignore',
				stderr: 'pipe',
			}
		)
		if ((await buildProc.exited) !== 0) {
			const errText = await new Response(buildProc.stderr).text()
			throw new Error(`go build failed in cli bench: ${errText}`)
		}

		const s = await stat(binPath)
		const binarySizeMb = Number((s.size / (1024 * 1024)).toFixed(2))

		// Measure median startup latency over 20 runs
		const runs = 20
		const times: number[] = []
		for (let i = 0; i < runs; i++) {
			const t0 = performance.now()
			const p = Bun.spawn([binPath, '--version'], { stdout: 'ignore', stderr: 'ignore' })
			await p.exited
			times.push(performance.now() - t0)
		}
		times.sort((a, b) => a - b)
		const startupMedianMs = Number(times[Math.floor(times.length / 2)]!.toFixed(2))

		// Measure `dex pie generate` on a 100-endpoint OpenAPI YAML spec
		await writeFile(path.join(tmp, 'dex.config.json'), JSON.stringify({ mode: 'spa' }))
		const specPath = path.join(tmp, 'openapi.yaml')
		await writeFile(specPath, buildLargeOpenApiYaml(100))

		const pieStart = performance.now()
		const pieProc = Bun.spawn([binPath, 'pie', 'generate', specPath, '--out', 'generated.ts'], {
			cwd: tmp,
			stdout: 'ignore',
			stderr: 'pipe',
		})
		if ((await pieProc.exited) !== 0) {
			const errText = await new Response(pieProc.stderr).text()
			throw new Error(`dex pie generate failed: ${errText}`)
		}
		const pieGenerate100EndpointsMs = Number((performance.now() - pieStart).toFixed(2))

		return {
			binarySizeMb,
			startupMedianMs,
			pieGenerate100EndpointsMs,
		}
	} finally {
		await rm(tmp, { recursive: true, force: true })
	}
}
