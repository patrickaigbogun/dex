import { mkdir, rm, copyFile } from 'node:fs/promises'
import path from 'node:path'

const rootDir = path.resolve(import.meta.dir, '..')
const buildDir = path.join(rootDir, 'build')

await rm(buildDir, { recursive: true, force: true })
await mkdir(path.join(buildDir, 'assets'), { recursive: true })

await copyFile(path.join(rootDir, 'web/public/index.html'), path.join(buildDir, 'index.html'))
