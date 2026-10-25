import { createServer } from 'node:http'
import { pathToFileURL } from 'node:url'
import { OG_CACHE_CONTROL, renderOgPng } from './lib/render.mjs'

const IMAGE_PATHS = new Set(['/og', '/api/og'])

function send(req, res, status, headers, body) {
  res.writeHead(status, headers)
  res.end(req.method === 'HEAD' ? undefined : body)
}

export function handleRequest(req, res) {
  const method = req.method || 'GET'
  const url = new URL(req.url || '/', 'http://127.0.0.1')

  if (method !== 'GET' && method !== 'HEAD') {
    send(req, res, 405, {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
      allow: 'GET, HEAD'
    }, 'Method Not Allowed\n')
    return
  }

  if (url.pathname === '/health') {
    send(req, res, 200, {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store'
    }, 'ok\n')
    return
  }

  if (!IMAGE_PATHS.has(url.pathname)) {
    send(req, res, 404, {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store'
    }, 'Not Found\n')
    return
  }

  renderOgPng(url.searchParams.get('title'))
    .then(png => {
      send(req, res, 200, {
        'content-type': 'image/png',
        'content-length': String(png.length),
        'cache-control': OG_CACHE_CONTROL
      }, png)
    })
    .catch(error => {
      console.error(error)
      if (!res.headersSent) {
        send(req, res, 500, {
          'content-type': 'text/plain; charset=utf-8',
          'cache-control': 'no-store'
        }, 'Internal Error\n')
      } else {
        res.end()
      }
    })
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href

if (isMain) {
  const port = Number(process.env.PORT || 3000)
  const host = '0.0.0.0'
  createServer(handleRequest).listen(port, host, () => {
    console.log(`og image service listening on ${host}:${port}`)
  })
}
