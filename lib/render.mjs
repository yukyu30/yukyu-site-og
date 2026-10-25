import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import satori from 'satori'
import { Resvg } from '@resvg/resvg-js'

const WIDTH = 1200
const HEIGHT = 630
const DEFAULT_TITLE = 'My default title'
const MAX_TITLE_LENGTH = 100
const BRAND = 'YUKYU.NET / @YUKYU30'

const root = dirname(fileURLToPath(import.meta.url))
const fontsDir = join(root, '..', 'fonts')

const fonts = [
  {
    name: 'Inter',
    data: readFileSync(join(fontsDir, 'Inter-Regular.ttf')),
    weight: 400,
    style: 'normal'
  },
  {
    name: 'Noto Sans JP',
    data: readFileSync(join(fontsDir, 'NotoSansJP-Regular.woff')),
    weight: 400,
    style: 'normal'
  }
]

/**
 * Match the live yukyu-site-og.vercel.app contract: missing or blank `title`
 * becomes "My default title", and the string is capped at 100 UTF-16 code units.
 */
export function normalizeTitle(raw) {
  if (typeof raw !== 'string') return DEFAULT_TITLE
  const cleaned = raw.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim()
  if (!cleaned) return DEFAULT_TITLE
  return cleaned.slice(0, MAX_TITLE_LENGTH)
}

function element(type, style, children) {
  return { type, props: { style, children } }
}

function template(title) {
  return element(
    'div',
    {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f1f1f1',
      backgroundImage:
        'linear-gradient(#d9d9d9 1px, transparent 1px), linear-gradient(to right, #d9d9d9 1px, transparent 1px)',
      backgroundSize: '64px 64px',
      backgroundPosition: '0px 28px',
      position: 'relative'
    },
    [
      element(
        'div',
        {
          display: 'flex',
          fontFamily: 'Inter',
          fontSize: 60,
          fontWeight: 400,
          letterSpacing: '-0.025em',
          lineHeight: 1.4,
          color: '#000000',
          textAlign: 'center',
          padding: '0 120px',
          transform: 'translateY(15px)',
          whiteSpace: 'pre-wrap'
        },
        title
      ),
      element(
        'div',
        {
          position: 'absolute',
          right: 17,
          bottom: 23,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f1f1f1',
          color: '#111111',
          border: '2px solid #111111',
          borderRadius: 999,
          padding: '18px 78px',
          fontFamily: 'Inter',
          fontSize: 20,
          fontWeight: 400,
          letterSpacing: '0.32em',
          lineHeight: 1
        },
        BRAND
      )
    ]
  )
}

export async function renderOgPng(rawTitle) {
  const title = normalizeTitle(rawTitle)
  const svg = await satori(template(title), {
    width: WIDTH,
    height: HEIGHT,
    fonts
  })
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: WIDTH }
  })
    .render()
    .asPng()
  return Buffer.from(png)
}

export const OG_WIDTH = WIDTH
export const OG_HEIGHT = HEIGHT
export const OG_CACHE_CONTROL =
  'public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400'
