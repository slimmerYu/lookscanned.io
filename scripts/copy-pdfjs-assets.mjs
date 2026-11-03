import { cpSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const pdfjsDist = resolve(root, 'node_modules/pdfjs-dist')

const targets = [
  { from: resolve(pdfjsDist, 'cmaps'), to: resolve(root, 'public/cmaps') },
  { from: resolve(pdfjsDist, 'standard_fonts'), to: resolve(root, 'public/standard_fonts') }
]

for (const { from, to } of targets) {
  mkdirSync(to, { recursive: true })
  cpSync(from, to, { recursive: true })
  console.log(`[copy-pdfjs-assets] ${from} -> ${to}`)
}
