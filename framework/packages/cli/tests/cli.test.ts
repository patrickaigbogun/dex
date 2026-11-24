import { test, expect, describe } from 'bun:test'
import { parseArgs, parseSemverLikeTag, compareSemver, bumpSemver, formatSemverTag, cachePathForTemplate, validateTag, safeJoin } from '../src/cli'
import path from 'node:path'

describe('CLI utilities', () => {
	test('parseArgs correctly handles boolean flags and positional arguments', () => {
		const argv = ['scaffold', 'my-app', '--no-cache', '--fresh', '--all', '--force', '--interactive', '--no-install', '-p', '-v', '-f', '--repo', 'owner/repo', 'extra']
		const res = parseArgs(argv)
		expect(res.positional).toEqual(['scaffold', 'my-app', 'extra'])
		expect(res.flags['no-cache']).toBe(true)
		expect(res.flags['fresh']).toBe(true)
		expect(res.flags['all']).toBe(true)
		expect(res.flags['force']).toBe(true)
		expect(res.flags['interactive']).toBe(true)
		expect(res.flags['no-install']).toBe(true)
		expect(res.flags['p']).toBe(true)
		expect(res.flags['v']).toBe(true)
		expect(res.flags['f']).toBe(true)
		expect(res.flags['repo']).toBe('owner/repo')
	})

	test('Semver parsing, comparison, bumping and formatting', () => {
		const parsed = parseSemverLikeTag('v0.2.1')
		expect(parsed).not.toBeNull()
		expect(parsed?.parts).toEqual([0, 2, 1])
		expect(parsed?.strict).toBe(true)

		const loose = parseSemverLikeTag('1.2')
		expect(loose?.parts).toEqual([1, 2, 0])

		expect(compareSemver([0, 2, 2], [0, 2, 1])).toBeGreaterThan(0)
		expect(compareSemver([0, 2, 1], [0, 2, 2])).toBeLessThan(0)
		expect(compareSemver([0, 2, 1], [0, 2, 1])).toBe(0)

		expect(bumpSemver([0, 2, 1], 'patch')).toEqual([0, 2, 2])
		expect(bumpSemver([0, 2, 1], 'minor')).toEqual([0, 3, 0])
		expect(bumpSemver([0, 2, 1], 'major')).toEqual([1, 0, 0])

		expect(formatSemverTag([0, 2, 6])).toBe('v0.2.6')
	})

	test('cachePathForTemplate', () => {
		const p = cachePathForTemplate('foo/bar', 'v1.0.0', 'asset.tgz')
		expect(p).toContain('foo__bar')
		expect(p).toContain('v1.0.0')
		expect(p).toContain('asset.tgz')
	})

	test('validateTag', () => {
		expect(validateTag('v1.0.0')).toBe('v1.0.0')
		expect(validateTag('1.2.3-beta.1')).toBe('1.2.3-beta.1')
		expect(() => validateTag('v1..0')).toThrow()
		expect(() => validateTag('-v1')).toThrow()
		expect(() => validateTag('')).toThrow()
	})

	test('safeJoin', () => {
		const root = '/tmp/dest'
		expect(safeJoin(root, 'foo/bar.ts')).toBe(path.resolve(root, 'foo/bar.ts'))
		expect(() => safeJoin(root, '../outside')).toThrow()
		expect(() => safeJoin(root, 'foo/../../outside')).toThrow()
		expect(() => safeJoin(root, '')).toThrow()
		expect(() => safeJoin(root, '\0')).toThrow()
	})
})
