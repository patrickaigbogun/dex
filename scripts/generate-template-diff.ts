#!/usr/bin/env ts-node
/**
 * Generate template diff between two versions
 * Usage: bun scripts/generate-template-diff.ts <current-version> [previous-version]
 */

import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const isExcluded = (rel: string) => rel.split('/').some((seg) => exclude.includes(seg)) || exclude.includes(rel)

async function walkDir(dir: string, base = ''): Promise<string[]> {
	const files: string[] = []
	try {
		const entries = await readdir(dir, { withFileTypes: true })
		for (const e of entries) {
			const rel = path.posix.join(base, e.name)
			if (isExcluded(rel)) continue
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
	if (!currentVersion || currentVersion.startsWith('-')) {
		console.error('Usage: bun scripts/generate-template-diff.ts <current-version> [previous-version]')
		process.exit(1)
	}

	const previousVersion = process.argv[3] || ''
	if (previousVersion.startsWith('-')) {
		console.error('Invalid previous version')
		process.exit(1)
	}
	const starterDir = path.resolve('templates/starter')
	const distDir = path.resolve('dist')

	await mkdir(distDir, { recursive: true })

	let changedFiles: string[] = []
	let deletedFiles: string[] = []

	let usedGitDiff = false
	if (previousVersion) {
		try {
			const proc = Bun.spawn(['git', 'diff', '--name-status', previousVersion, currentVersion, '--', 'templates/starter'], {
				stdout: 'pipe',
				stderr: 'pipe',
			})
			const stdout = await new Response(proc.stdout).text()
			const code = await proc.exited
			if (code === 0) {
				usedGitDiff = true
				const lines = stdout.split('\n')
				for (const line of lines) {
					const trimmed = line.trim()
					if (!trimmed) continue
					const parts = trimmed.split(/\s+/)
					const status = parts[0]!
					if (status.startsWith('A') || status.startsWith('M') || status.startsWith('R')) {
						const filePath = status.startsWith('R') ? parts[2]! : parts[1]!
						if (filePath && filePath.startsWith('templates/starter/')) {
							const rel = filePath.slice('templates/starter/'.length)
							if (!isExcluded(rel) && existsSync(path.join(starterDir, rel))) {
								changedFiles.push(rel)
							}
						}
						// If rename, old file was deleted
						if (status.startsWith('R')) {
							const oldPath = parts[1]!
							if (oldPath && oldPath.startsWith('templates/starter/')) {
								const oldRel = oldPath.slice('templates/starter/'.length)
								if (!isExcluded(oldRel)) {
									deletedFiles.push(oldRel)
								}
							}
						}
					} else if (status.startsWith('D')) {
						const filePath = parts[1]!
						if (filePath && filePath.startsWith('templates/starter/')) {
							const rel = filePath.slice('templates/starter/'.length)
							if (!isExcluded(rel)) {
								deletedFiles.push(rel)
							}
						}
					}
				}
			}
		} catch {
			// git diff failed
		}
	}

	if (!previousVersion || !usedGitDiff) {
		changedFiles = await walkDir(starterDir)
		deletedFiles = []
	}

	// Deduplicate and sort
	changedFiles = Array.from(new Set(changedFiles)).sort()
	deletedFiles = Array.from(new Set(deletedFiles)).sort()

	const checksums: Record<string, string> = {}
	for (const file of changedFiles) {
		const fullPath = path.join(starterDir, file)
		if (existsSync(fullPath)) {
			const content = await readFile(fullPath)
			checksums[file] = crypto.createHash('sha256').update(content).digest('hex')
		}
	}

	const diff = {
		version: currentVersion,
		previousVersion: previousVersion || null,
		changedFiles,
		deletedFiles,
		checksums,
	}

	const diffPath = path.join(distDir, `dex-diff-${currentVersion}.json`)
	await writeFile(diffPath, JSON.stringify(diff, null, 2) + '\n')
	console.log(`Generated diff: ${diffPath}`)
	console.log(`Changed files: ${changedFiles.length}, Deleted files: ${deletedFiles.length}`)
}

await main()

