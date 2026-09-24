import { describe, expect, it } from 'bun:test'
import {
	fileToLayoutName,
	fileToRoute,
	parseSegment,
} from '../src/generate'

describe('parseSegment', () => {
	it('parses static segments', () => {
		expect(parseSegment('about')).toEqual({ kind: 'static', value: 'about' })
		expect(parseSegment('dashboard')).toEqual({ kind: 'static', value: 'dashboard' })
	})

	it('parses dynamic param segments', () => {
		expect(parseSegment('[id]')).toEqual({ kind: 'param', name: 'id' })
		expect(parseSegment('[userId]')).toEqual({ kind: 'param', name: 'userId' })
	})

	it('parses catch-all segments', () => {
		expect(parseSegment('[...slug]')).toEqual({ kind: 'catchAll', name: 'slug' })
		expect(parseSegment('[...rest]')).toEqual({ kind: 'catchAll', name: 'rest' })
	})
})

describe('fileToRoute', () => {
	it('converts root index to /', () => {
		const res = fileToRoute('index')
		expect(res.path).toBe('/')
		expect(res.segments).toEqual([])
	})

	it('converts static page to /name', () => {
		const res = fileToRoute('about')
		expect(res.path).toBe('/about')
		expect(res.segments).toEqual([{ kind: 'static', value: 'about' }])
	})

	it('converts nested index to directory path', () => {
		const res = fileToRoute('admin/index')
		expect(res.path).toBe('/admin')
		expect(res.segments).toEqual([{ kind: 'static', value: 'admin' }])
	})

	it('converts nested dynamic route', () => {
		const res = fileToRoute('blog/[category]/[slug]')
		expect(res.path).toBe('/blog/[category]/[slug]')
		expect(res.segments).toEqual([
			{ kind: 'static', value: 'blog' },
			{ kind: 'param', name: 'category' },
			{ kind: 'param', name: 'slug' },
		])
	})

	it('converts catch-all file route', () => {
		const res = fileToRoute('docs/[...slug]')
		expect(res.path).toBe('/docs/[...slug]')
		expect(res.segments).toEqual([
			{ kind: 'static', value: 'docs' },
			{ kind: 'catchAll', name: 'slug' },
		])
	})
})

describe('fileToLayoutName', () => {
	it('extracts top-level layout name', () => {
		expect(fileToLayoutName('auth')).toBe('auth')
		expect(fileToLayoutName('dashboard')).toBe('dashboard')
	})

	it('extracts nested index layout name', () => {
		expect(fileToLayoutName('admin/index')).toBe('admin')
		expect(fileToLayoutName('settings/team/index')).toBe('settings/team')
	})
})
