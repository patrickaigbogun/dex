import { describe, expect, it } from 'bun:test'
import { createPie } from '../src/client'
import { generateApi } from '../src/generator'
import path from 'node:path'
import os from 'node:os'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'

describe('Pie Route Tree Proxy & Client', () => {
	it('dispatches GET requests through nested static subroutes', async () => {
		let capturedUrl = ''
		let capturedInit: RequestInit | undefined

		const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
			capturedUrl = input.toString()
			capturedInit = init
			return new Response(JSON.stringify({ status: 'ok', uptime: 42 }), {
				headers: { 'content-type': 'application/json' },
			})
		}

		type MockApi = {
			v1: {
				health: {
					get: (opts?: any) => Promise<any>
				}
			}
		}

		const api = createPie<MockApi>({
			baseUrl: 'https://api.concord.chat',
			prefix: '/api',
			fetch: mockFetch,
		})

		const res = await api.v1.health.get()
		expect(capturedUrl).toBe('https://api.concord.chat/api/v1/health')
		expect(capturedInit?.method).toBe('GET')
		expect(res.data).toEqual({ status: 'ok', uptime: 42 })
		expect(res.ok).toBe(true)
		expect(res.status).toBe(200)
	})

	it('interpolates dynamic route parameters accurately', async () => {
		let capturedUrl = ''
		const mockFetch = async (input: RequestInfo | URL) => {
			capturedUrl = input.toString()
			return new Response(JSON.stringify([{ id: 'msg_1', content: 'hello' }]), {
				headers: { 'content-type': 'application/json' },
			})
		}

		type ConcordApi = {
			v1: {
				guilds: (guildId: string) => {
					channels: (channelId: string) => {
						messages: {
							get: (opts?: any) => Promise<any>
						}
					}
				}
			}
		}

		const api = createPie<ConcordApi>({
			baseUrl: 'https://api.concord.chat',
			prefix: '/api',
			fetch: mockFetch,
		})

		const res = await api.v1.guilds('guild_123').channels('channel_456').messages.get({
			query: { limit: 50, before: 'msg_99' },
		})

		expect(capturedUrl).toBe(
			'https://api.concord.chat/api/v1/guilds/guild_123/channels/channel_456/messages?limit=50&before=msg_99'
		)
		expect(res.data).toEqual([{ id: 'msg_1', content: 'hello' }])
	})

	it('serializes JSON bodies on POST/PUT requests and attaches headers', async () => {
		let capturedUrl = ''
		let capturedInit: RequestInit | undefined

		const mockFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
			capturedUrl = input.toString()
			capturedInit = init
			return new Response(JSON.stringify({ id: 'msg_new', content: 'created' }), {
				status: 201,
				headers: { 'content-type': 'application/json' },
			})
		}

		type MockApi = {
			channels: (channelId: string) => {
				messages: {
					post: (opts?: any) => Promise<any>
				}
			}
		}

		const api = createPie<MockApi>({
			baseUrl: 'https://api.concord.chat',
			headers: () => ({
				Authorization: 'Bearer auth_token_abc',
			}),
			fetch: mockFetch,
		})

		const res = await api.channels('channel_456').messages.post({
			body: { content: 'created', attachments: [] },
			headers: { 'X-Custom-Header': 'custom_val' },
		})

		expect(capturedUrl).toBe('https://api.concord.chat/channels/channel_456/messages')
		expect(capturedInit?.method).toBe('POST')
		expect(capturedInit?.body).toBe(JSON.stringify({ content: 'created', attachments: [] }))

		const headers = new Headers(capturedInit?.headers)
		expect(headers.get('authorization')).toBe('Bearer auth_token_abc')
		expect(headers.get('content-type')).toBe('application/json')
		expect(headers.get('x-custom-header')).toBe('custom_val')
		expect(res.status).toBe(201)
		expect(res.data).toEqual({ id: 'msg_new', content: 'created' })
	})

	it('allows overriding baseUrl at call time for one-off endpoints', async () => {
		let capturedUrl = ''
		const mockFetch = async (input: RequestInfo | URL) => {
			capturedUrl = input.toString()
			return new Response(JSON.stringify({ microservice: 'voice' }), {
				headers: { 'content-type': 'application/json' },
			})
		}

		type MockApi = {
			voice: {
				session: {
					get: (opts?: any) => Promise<any>
				}
			}
		}

		const api = createPie<MockApi>({
			baseUrl: 'https://api.concord.chat',
			fetch: mockFetch,
		})

		await api.voice.session.get({
			baseUrl: 'https://voice.concord.chat',
		})

		expect(capturedUrl).toBe('https://voice.concord.chat/voice/session')
	})

	it('retries on retryable 500 status codes with backoff', async () => {
		let attempts = 0
		const mockFetch = async () => {
			attempts++
			if (attempts < 3) {
				return new Response('Server Error', { status: 500 })
			}
			return new Response(JSON.stringify({ success: true, attempts }), {
				headers: { 'content-type': 'application/json' },
			})
		}

		type MockApi = {
			flaky: {
				get: (opts?: any) => Promise<any>
			}
		}

		const api = createPie<MockApi>({
			baseUrl: 'https://api.concord.chat',
			fetch: mockFetch,
			retry: {
				retries: 3,
				minDelayMs: 10,
				maxDelayMs: 50,
			},
		})

		const res = await api.flaky.get()
		expect(attempts).toBe(3)
		expect(res.ok).toBe(true)
		expect(res.data).toEqual({ success: true, attempts: 3 })
	})
})

describe('OpenAPI Code Generator', () => {
	it('generates TypeScript schemas and route tree from OpenAPI spec', async () => {
		const mockOpenApiSpec = {
			openapi: '3.0.0',
			info: { title: 'Concord Phoenix API', version: '1.0.0' },
			components: {
				schemas: {
					Message: {
						type: 'object',
						required: ['id', 'content'],
						properties: {
							id: { type: 'string' },
							content: { type: 'string' },
							channelId: { type: 'string' },
						},
					},
					CreateMessageDto: {
						type: 'object',
						required: ['content'],
						properties: {
							content: { type: 'string' },
						},
					},
				},
			},
			paths: {
				'/api/v1/health': {
					get: {
						summary: 'Health check',
						responses: {
							'200': {
								content: {
									'application/json': {
										schema: {
											type: 'object',
											properties: { status: { type: 'string' } },
										},
									},
								},
							},
						},
					},
				},
				'/api/v1/guilds/{guildId}/channels/{channelId}/messages': {
					get: {
						parameters: [
							{ name: 'guildId', in: 'path', required: true, schema: { type: 'string' } },
							{ name: 'channelId', in: 'path', required: true, schema: { type: 'string' } },
							{ name: 'limit', in: 'query', schema: { type: 'integer' } },
						],
						responses: {
							'200': {
								content: {
									'application/json': {
										schema: {
											type: 'array',
											items: { $ref: '#/components/schemas/Message' },
										},
									},
								},
							},
						},
					},
					post: {
						parameters: [
							{ name: 'guildId', in: 'path', required: true, schema: { type: 'string' } },
							{ name: 'channelId', in: 'path', required: true, schema: { type: 'string' } },
						],
						requestBody: {
							content: {
								'application/json': {
									schema: { $ref: '#/components/schemas/CreateMessageDto' },
								},
							},
						},
						responses: {
							'201': {
								content: {
									'application/json': {
										schema: { $ref: '#/components/schemas/Message' },
									},
								},
							},
						},
					},
				},
			},
		}

		const tmpDir = path.join(os.tmpdir(), `dex-pie-test-${Date.now()}`)
		mkdirSync(tmpDir, { recursive: true })
		const outPath = path.join(tmpDir, 'core/api/generated.ts')

		const resultPath = await generateApi({
			spec: mockOpenApiSpec,
			outTs: outPath,
			prefix: '/api',
			defaultBaseUrl: 'http://localhost:4000',
		})

		expect(resultPath).toBe(outPath)
		const generatedCode = readFileSync(outPath, 'utf8')

		// Verify exported schemas
		expect(generatedCode).toContain('export interface Message')
		expect(generatedCode).toContain('export interface CreateMessageDto')

		// Verify route tree contract
		expect(generatedCode).toContain('export type ApiRoutes =')
		expect(generatedCode).toContain('v1:')
		expect(generatedCode).toContain('guilds:')
		expect(generatedCode).toContain('channels:')
		expect(generatedCode).toContain('messages:')

		// Verify no double api in route tree
		expect(generatedCode).not.toContain('api: {\n    v1:')

		// Verify client factory
		expect(generatedCode).toContain('export function createApiClient')
		expect(generatedCode).toContain("prefix: \"/api\"")
		expect(generatedCode).toContain('baseUrl: "http://localhost:4000"')
	})
})
