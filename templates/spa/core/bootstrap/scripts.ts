import { dexBuildClient, dexDev, dexPrepareBuild, dexPrerender } from '@dex/dev'
import { getPublicEnvDefines } from '@dex/server'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dir, '../..') // Adjust if needed

export const runDev = () => dexDev({ rootDir })

export const runBuildClient = () => dexBuildClient({ 
	rootDir, 
	defineArgs: getPublicEnvDefines() 
})

export const runPrepareBuild = () => dexPrepareBuild({ rootDir })

export const runPrerender = () => dexPrerender({ rootDir })
