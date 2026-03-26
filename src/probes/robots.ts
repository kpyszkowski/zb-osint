import { createRequire } from 'node:module'
import { type Probe, extractOrigin } from '../types.js'

const require = createRequire(import.meta.url)
const robotsParser = require('robots-parser') as (
  url: string,
  robotstxt: string,
) => {
  getSitemaps(): string[]
  getCrawlDelay(ua: string): number | undefined
  getPreferredHost(): string | null
}

export const robotsProbe: Probe = async (url) => {
  const origin = extractOrigin(url)
  const robotsUrl = `${origin}/robots.txt`

  try {
    const res = await fetch(robotsUrl, {
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      return {
        name: 'robots.txt',
        data: { exists: false, statusCode: res.status },
      }
    }

    const raw = await res.text()
    const robots = robotsParser(robotsUrl, raw)

    return {
      name: 'robots.txt',
      data: {
        exists: true,
        raw,
        sitemaps: robots.getSitemaps(),
        crawlDelay: robots.getCrawlDelay('*'),
        preferredHost: robots.getPreferredHost(),
      },
    }
  } catch (e) {
    return { name: 'robots.txt', data: null, error: String(e) }
  }
}
