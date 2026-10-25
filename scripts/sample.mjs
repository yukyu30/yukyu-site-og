import { mkdirSync, writeFileSync } from 'node:fs'
import { renderOgPng } from '../lib/render.mjs'

const outDir = process.argv[2] || 'tmp/samples'
mkdirSync(outDir, { recursive: true })

const samples = [
  ['hello.png', 'Hello World'],
  ['japanese.png', '三連休の記録'],
  ['long.png', 'これはとても長いタイトルで折り返しがどうなるかを確認するためのサンプル文章です'],
  ['default.png', null]
]

for (const [name, title] of samples) {
  const png = await renderOgPng(title)
  const path = `${outDir}/${name}`
  writeFileSync(path, png)
  console.log(`${path} ${png.length} bytes`)
}
