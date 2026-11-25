/**
 * Run Dex development mode using `@dex/dev` (loaded dynamically).
 */
export async function runDev(rootDir = process.cwd(), opts?: { noWatch?: boolean }): Promise<void> {
	const { dexDev } = await import('@dex/dev')
	await dexDev({ rootDir, noWatch: opts?.noWatch })
}
