import type { Probe } from '../types'

interface NetworkEntry {
  url: string
  method: string
  status: number | null
  type: string
}

export const puppeteerProbe: Probe = async (url) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any
  try {
    // Dynamic import to avoid tsx/esbuild __name transform issues
    const mod = await import('puppeteer')
    const puppeteer = mod.default ?? mod
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()

    const consoleLogs: Array<{ type: string; text: string }> = []
    const networkRequests: NetworkEntry[] = []

    page.on('console', (msg: { type: () => string; text: () => string }) => {
      consoleLogs.push({ type: msg.type(), text: msg.text() })
    })

    page.on(
      'requestfinished',
      (req: {
        url: () => string
        method: () => string
        resourceType: () => string
        response: () => { status: () => number } | null
      }) => {
        const resp = req.response()
        networkRequests.push({
          url: req.url(),
          method: req.method(),
          status: resp?.status() ?? null,
          type: req.resourceType(),
        })
      },
    )

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    // Detect JS libraries from window object
    const jsLibraries = await page.evaluate(() => {
      const libs: Record<string, string | boolean> = {}
      const w = window as unknown as Record<string, unknown>
      if (w.jQuery)
        libs.jQuery =
          (w.jQuery as { fn?: { jquery?: string } })?.fn?.jquery || true
      if (w.React || document.querySelector('[data-reactroot]'))
        libs.React = true
      if (w.Vue) libs.Vue = true
      if (w.angular || w.ng) libs.Angular = true
      if (w.__NEXT_DATA__) libs['Next.js'] = true
      if (w.__NUXT__) libs.Nuxt = true
      if (w.Drupal) libs.Drupal = true
      if (w.wp) libs.WordPress = true
      if (w.google_tag_manager) libs['Google Tag Manager'] = true
      if (w.ga || w.gtag) libs['Google Analytics'] = true
      if (w._paq) libs.Matomo = true
      return libs
    })

    // Get page metadata
    const metadata = await page.evaluate(() => {
      const getMeta = (name: string) =>
        document
          .querySelector(`meta[name="${name}"]`)
          ?.getAttribute('content') ||
        document
          .querySelector(`meta[property="${name}"]`)
          ?.getAttribute('content')
      return {
        title: document.title,
        description: getMeta('description'),
        generator: getMeta('generator'),
        author: getMeta('author'),
        ogTitle: getMeta('og:title'),
        ogImage: getMeta('og:image'),
      }
    })

    // Group network requests by type
    const requestsByType: Record<string, number> = {}
    for (const req of networkRequests) {
      requestsByType[req.type] = (requestsByType[req.type] || 0) + 1
    }

    // External domains contacted
    const targetHost = new URL(url).hostname
    const externalDomains = [
      ...new Set(
        networkRequests
          .map((r) => {
            try {
              return new URL(r.url).hostname
            } catch {
              return null
            }
          })
          .filter((h): h is string => h !== null && !h.includes(targetHost)),
      ),
    ].sort()

    await browser.close()

    return {
      name: 'Puppeteer Browser Analysis',
      data: {
        metadata,
        jsLibraries,
        consoleLogs: consoleLogs.slice(0, 50),
        totalRequests: networkRequests.length,
        requestsByType,
        externalDomains,
        networkRequests: networkRequests.slice(0, 100),
      },
    }
  } catch (e) {
    if (browser) await browser.close()
    return { name: 'Puppeteer Browser Analysis', data: null, error: String(e) }
  }
}
