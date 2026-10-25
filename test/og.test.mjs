import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createServer } from 'node:http'
import test from 'node:test'
import { handleRequest } from '../server.mjs'
import { OG_CACHE_CONTROL, OG_HEIGHT, OG_WIDTH, normalizeTitle, renderOgPng } from '../lib/render.mjs'

function pngSize(buffer) {
  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
  assert.equal(buffer.subarray(12, 16).toString('ascii'), 'IHDR')
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20)
  }
}

async function withServer(fn) {
  const server = createServer(handleRequest)
  server.listen(0, '127.0.0.1')
  await once(server, 'listening')
  const { port } = server.address()
  try {
    await fn(port)
  } finally {
    server.close()
    await once(server, 'close')
  }
}

test('normalizeTitle matches the live service defaults', () => {
  assert.equal(normalizeTitle(null), 'My default title')
  assert.equal(normalizeTitle('   '), 'My default title')
  assert.equal(normalizeTitle('三連休の記録'), '三連休の記録')
  assert.equal(normalizeTitle('a'.repeat(140)).length, 100)
})

test('renderOgPng returns a 1200x630 PNG', async () => {
  const png = await renderOgPng('Hello World')
  assert.deepEqual(pngSize(png), { width: OG_WIDTH, height: OG_HEIGHT })
  const japanese = await renderOgPng('三連休の記録')
  assert.deepEqual(pngSize(japanese), { width: OG_WIDTH, height: OG_HEIGHT })
  assert.equal(png.equals(japanese), false)
})

test('GET /og and /api/og return the same cached PNG', async () => {
  await withServer(async port => {
    const title = encodeURIComponent('三連休の記録')
    const og = await fetch(`http://127.0.0.1:${port}/og?title=${title}`)
    const api = await fetch(`http://127.0.0.1:${port}/api/og?title=${title}`)
    assert.equal(og.status, 200)
    assert.equal(og.headers.get('content-type'), 'image/png')
    assert.equal(og.headers.get('cache-control'), OG_CACHE_CONTROL)
    const ogBytes = Buffer.from(await og.arrayBuffer())
    const apiBytes = Buffer.from(await api.arrayBuffer())
    assert.deepEqual(pngSize(ogBytes), { width: OG_WIDTH, height: OG_HEIGHT })
    assert.equal(ogBytes.equals(apiBytes), true)

    const missing = await fetch(`http://127.0.0.1:${port}/api/og`)
    assert.equal(missing.status, 200)
    assert.equal(missing.headers.get('content-type'), 'image/png')

    const head = await fetch(`http://127.0.0.1:${port}/og?title=${title}`, { method: 'HEAD' })
    assert.equal(head.status, 200)
    assert.equal(head.headers.get('content-type'), 'image/png')
    assert.equal(head.headers.get('cache-control'), OG_CACHE_CONTROL)
    assert.equal(Buffer.from(await head.arrayBuffer()).length, 0)

    const health = await fetch(`http://127.0.0.1:${port}/health`)
    assert.equal(health.status, 200)
    assert.equal(health.headers.get('cache-control'), 'no-store')

    const other = await fetch(`http://127.0.0.1:${port}/Hello%20World.png`)
    assert.equal(other.status, 404)
    assert.equal(other.headers.get('cache-control'), 'no-store')
  })
})
