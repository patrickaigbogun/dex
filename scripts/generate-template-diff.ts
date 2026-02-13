#!/usr/bin/env ts-node
/**
 * Generate template diff between two versions
 * Usage: bun scripts/generate-template-diff.ts <current-version> [previous-version]
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'

const exclude = ['.git', 'node_modules', '.dex', 'build', 'dist', '.generated', 'core/router/.generated']

async function walkDir(dir: string, base = ''): Promise<string[]> {
	const files: string[] = []
	try {
		const entries = await readdir(dir, { withFileTypes: true })
		for (const e of entries) {
			if (exclude.includes(e.name)) continue
			const rel = path.posix.join(base, e.name)
			if (e.isDirectory()) {
				files.push(...(await walkDir(path.join(dir, e.name), rel)))
			} else {
				files.push(rel)
			}
		}
	} catch {
		// ignore
	}
	return files
}

async function main() {
	const currentVersion = process.argv[2]
	if (!currentVersion) {
		console.error('Usage: bun generate-template-diff.ts <current-version> [previous-version]')
		process.exit(1)
	}

	const previousVersion = process.argv[3] || ''
	const starterDir = path.resolve('templates/starter')
	const distDir = path.resolve('dist')

	await mkdir(distDir, { recursive: true })

	// For now, mark all starter files as changed (simplified approach)
	const changedFiles = await walkDir(starterDir)

	const diff = {
		version: currentVersion,
		previousVersion: previousVersion || null,
		changedFiles: changedFiles.sort(),
	}

	const diffPath = path.join(distDir, `dex-diff-${currentVersion}.json`)
	await writeFile(diffPath, JSON.stringify(diff, null, 2) + '\n')
	console.log(`Generated diff: ${diffPath}`)
	console.log(`Changed files: ${changedFiles.length}`)
}

await main()
