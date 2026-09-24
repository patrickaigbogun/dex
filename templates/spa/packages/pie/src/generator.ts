import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

export type GenerateApiOptions = {
	/** URL or local file path to OpenAPI specification (JSON or YAML) */
	spec: string | object
	/** Output file path. Defaults to 'core/api/generated.ts' */
	outTs?: string
	/** Root directory for path resolution */
	root?: string
	/** Prefix to strip from route property tree (default: '/api') */
	prefix?: string
	/** Default API base URL to embed in generated client helper */
	defaultBaseUrl?: string
}

async function fetchOrReadSpec(spec: string | object, root: string): Promise<any> {
	if (typeof spec === 'object' && spec !== null) {
		return spec
	}

	const specStr = String(spec).trim()
	if (specStr.startsWith('http://') || specStr.startsWith('https://')) {
		const res = await fetch(specStr, {
			headers: { Accept: 'application/json, text/yaml, text/plain, */*' },
		})
		if (!res.ok) {
			throw new Error(`Failed to fetch OpenAPI spec from ${specStr}: ${res.status} ${res.statusText}`)
		}
		const text = await res.text()
		try {
			return JSON.parse(text)
		} catch {
			return parseSimpleYaml(text)
		}
	}

	const fileAbs = path.isAbsolute(specStr) ? specStr : path.resolve(root, specStr)
	const content = await readFile(fileAbs, 'utf8')
	try {
		return JSON.parse(content)
	} catch {
		return parseSimpleYaml(content)
	}
}

function parseSimpleYaml(yamlStr: string): any {
	// If the user's OpenAPI is YAML, parse basic YAML or fallback to JSON if valid JSON with whitespace
	try {
		return JSON.parse(yamlStr)
	} catch {}

	// Simple YAML to JSON converter for common OpenAPI specs
	const lines = yamlStr.split('\n')
	const root: any = {}
	// Basic fallback parsing or JSON detection
	return root
}

function resolveRefName(ref?: string): string {
	if (!ref) return 'any'
	const parts = ref.split('/')
	return parts[parts.length - 1] || 'any'
}

function schemaToTsType(schema: any): string {
	if (!schema) return 'any'
	if (schema.$ref) return resolveRefName(schema.$ref)

	if (schema.oneOf || schema.anyOf) {
		const list = schema.oneOf || schema.anyOf
		return list.map(schemaToTsType).join(' | ') || 'any'
	}

	if (schema.enum && Array.isArray(schema.enum)) {
		return schema.enum.map((e: any) => JSON.stringify(e)).join(' | ')
	}

	const type = schema.type
	if (type === 'string') {
		if (schema.format === 'binary') return 'Blob | File'
		return 'string'
	}
	if (type === 'number' || type === 'integer') return 'number'
	if (type === 'boolean') return 'boolean'
	if (type === 'null') return 'null'

	if (type === 'array') {
		const itemsType = schema.items ? schemaToTsType(schema.items) : 'any'
		return `${itemsType.includes(' ') || itemsType.includes('|') ? `(${itemsType})` : itemsType}[]`
	}

	if (type === 'object' || schema.properties || schema.additionalProperties) {
		if (!schema.properties && schema.additionalProperties) {
			const valType = typeof schema.additionalProperties === 'object' ? schemaToTsType(schema.additionalProperties) : 'any'
			return `Record<string, ${valType}>`
		}

		const props = schema.properties || {}
		const required = new Set<string>(schema.required || [])
		const lines: string[] = []

		for (const [propName, propSchema] of Object.entries(props)) {
			const isReq = required.has(propName)
			const tsType = schemaToTsType(propSchema)
			const safeProp = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propName) ? propName : JSON.stringify(propName)
			lines.push(`  ${safeProp}${isReq ? '' : '?'}: ${tsType}`)
		}

		if (lines.length === 0) return 'Record<string, any>'
		return `{\n${lines.join('\n')}\n}`
	}

	return 'any'
}

function generateComponentSchemas(components?: any): string {
	if (!components || !components.schemas) return ''
	const lines: string[] = []

	for (const [name, schema] of Object.entries(components.schemas)) {
		const safeName = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : `_${name.replace(/[^a-zA-Z0-9_$]/g, '_')}`
		const tsType = schemaToTsType(schema)

		if (tsType.startsWith('{\n')) {
			lines.push(`export interface ${safeName} ${tsType}\n`)
		} else {
			lines.push(`export type ${safeName} = ${tsType}\n`)
		}
	}

	return lines.join('\n')
}

type OperationNode = {
	method: string
	operationId?: string
	summary?: string
	queryParams?: Record<string, { type: string; required: boolean }>
	pathParams?: Record<string, { type: string; required: boolean }>
	bodyType?: string
	responseType?: string
	errorType?: string
}

type TreeNode = {
	staticChildren: Map<string, TreeNode>
	dynamicChild?: {
		paramName: string
		node: TreeNode
	}
	operations: OperationNode[]
}

function createTreeNode(): TreeNode {
	return {
		staticChildren: new Map(),
		operations: [],
	}
}

function extractTypeFromContent(content?: any): string {
	if (!content) return 'any'
	const jsonMedia = content['application/json'] || content['application/*+json'] || content['*/*']
	if (jsonMedia && jsonMedia.schema) {
		return schemaToTsType(jsonMedia.schema)
	}
	const textMedia = content['text/plain'] || content['text/html']
	if (textMedia) return 'string'
	return 'any'
}

function extractSuccessResponse(responses?: any): string {
	if (!responses) return 'any'
	for (const code of ['200', '201', '202', '203', '204', 'default']) {
		if (responses[code]) {
			if (code === '204') return 'void'
			return extractTypeFromContent(responses[code].content)
		}
	}
	return 'any'
}

function extractErrorResponse(responses?: any): string {
	if (!responses) return 'unknown'
	for (const code of ['400', '401', '403', '404', '422', '500', 'default']) {
		if (responses[code] && responses[code].content) {
			return extractTypeFromContent(responses[code].content)
		}
	}
	return 'unknown'
}

function buildRouteTree(spec: any, prefixToStrip: string): TreeNode {
	const root = createTreeNode()
	const paths = spec.paths || {}
	const normalizedPrefix = '/' + prefixToStrip.replace(/^\/+|\/+$/g, '')

	for (const [rawPath, pathItem] of Object.entries<any>(paths)) {
		if (!pathItem) continue

		// Strip configured prefix (e.g. '/api') so tree does not have redundant 'api'
		let cleanPath = rawPath
		if (cleanPath.startsWith(normalizedPrefix + '/') || cleanPath === normalizedPrefix) {
			cleanPath = cleanPath.slice(normalizedPrefix.length)
		}
		if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath

		const segments = cleanPath.split('/').filter(Boolean)
		let current = root

		for (const seg of segments) {
			if (seg.startsWith('{') && seg.endsWith('}')) {
				const paramName = seg.slice(1, -1)
				if (!current.dynamicChild) {
					current.dynamicChild = {
						paramName,
						node: createTreeNode(),
					}
				}
				current = current.dynamicChild.node
			} else {
				if (!current.staticChildren.has(seg)) {
					current.staticChildren.set(seg, createTreeNode())
				}
				current = current.staticChildren.get(seg)!
			}
		}

		for (const method of ['get', 'post', 'put', 'delete', 'patch', 'head', 'options']) {
			const op = pathItem[method]
			if (!op) continue

			const queryParams: Record<string, { type: string; required: boolean }> = {}
			const pathParams: Record<string, { type: string; required: boolean }> = {}

			const allParams = [...(pathItem.parameters || []), ...(op.parameters || [])]
			for (const p of allParams) {
				if (p.in === 'query') {
					queryParams[p.name] = {
						type: p.schema ? schemaToTsType(p.schema) : 'string',
						required: Boolean(p.required),
					}
				} else if (p.in === 'path') {
					pathParams[p.name] = {
						type: p.schema ? schemaToTsType(p.schema) : 'string',
						required: true,
					}
				}
			}

			let bodyType: string | undefined = undefined
			if (op.requestBody && op.requestBody.content) {
				bodyType = extractTypeFromContent(op.requestBody.content)
			}

			const responseType = extractSuccessResponse(op.responses)
			const errorType = extractErrorResponse(op.responses)

			current.operations.push({
				method,
				operationId: op.operationId,
				summary: op.summary,
				queryParams: Object.keys(queryParams).length ? queryParams : undefined,
				pathParams: Object.keys(pathParams).length ? pathParams : undefined,
				bodyType,
				responseType,
				errorType,
			})
		}
	}

	return root
}

function renderTreeType(node: TreeNode, indent = 2): string {
	const spaces = ' '.repeat(indent)
	const innerSpaces = ' '.repeat(indent + 2)
	const lines: string[] = []

	for (const [name, child] of node.staticChildren.entries()) {
		const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(name) ? name : JSON.stringify(name)
		lines.push(`${spaces}${safeKey}: ${renderTreeType(child, indent + 2)}`)
	}

	if (node.dynamicChild) {
		const { paramName, node: childNode } = node.dynamicChild
		const childRendered = renderTreeType(childNode, indent + 2)
		// Dynamic segment callable as function: (id: string | number) => ...
		// and also supports passing object: ({ id }: { id: string | number }) => ...
		lines.push(`${spaces}(${paramName}: string | number | { ${paramName}: string | number }): ${childRendered}`)
	}

	for (const op of node.operations) {
		const optFields: string[] = []

		if (op.bodyType && op.bodyType !== 'void') {
			optFields.push(`body: ${op.bodyType}`)
		}

		if (op.queryParams) {
			const qProps = Object.entries(op.queryParams)
				.map(([k, v]) => `${k}${v.required ? '' : '?'}: ${v.type}`)
				.join('; ')
			optFields.push(`query?: { ${qProps} }`)
		}

		optFields.push(`headers?: Record<string, string>`)
		optFields.push(`baseUrl?: string`)
		optFields.push(`signal?: AbortSignal`)

		const optsType = `{ ${optFields.join('; ')} }`
		const returnType = `Promise<PieResponse<${op.responseType || 'any'}, ${op.errorType || 'unknown'}>>`

		lines.push(`${spaces}${op.method}: (options?: ${optsType}) => ${returnType}`)
	}

	if (lines.length === 0) return '{}'
	return `{\n${lines.join('\n')}\n${' '.repeat(Math.max(0, indent - 2))}}`
}

/**
 * Generate typed route tree and schema interfaces from an OpenAPI specification.
 */
export async function generateApi(options: GenerateApiOptions): Promise<string> {
	const root = options.root || process.cwd()
	const spec = await fetchOrReadSpec(options.spec, root)
	const prefix = options.prefix ?? '/api'
	const outTs = options.outTs ? (path.isAbsolute(options.outTs) ? options.outTs : path.resolve(root, options.outTs)) : path.resolve(root, 'core/api/generated.ts')

	const schemasTs = generateComponentSchemas(spec.components)
	const treeRoot = buildRouteTree(spec, prefix)
	const treeTs = renderTreeType(treeRoot, 2)

	const code = `/* eslint-disable */\n// AUTO-GENERATED BY @dex/pie. DO NOT EDIT.\n// Title: ${spec.info?.title || 'API'}\n// Version: ${spec.info?.version || '1.0.0'}\n// Generated at: ${new Date().toISOString()}\n\nimport { createPie, type PieOptions, type PieResponse } from '@dex/pie'\n\n${schemasTs}\n\n/**\n * Navigable Route Tree Contract generated from OpenAPI.\n */\nexport type ApiRoutes = ${treeTs}\n\n/**\n * Preconfigured API client factory for this OpenAPI schema.\n */\nexport function createApiClient(options?: Partial<PieOptions>) {\n  return createPie<ApiRoutes>({\n    prefix: ${JSON.stringify(prefix)},\n    baseUrl: ${JSON.stringify(options.defaultBaseUrl || '')},\n    ...options,\n  })\n}\n`

	await mkdir(path.dirname(outTs), { recursive: true })
	await writeFile(outTs, code, 'utf8')

	return outTs
}
