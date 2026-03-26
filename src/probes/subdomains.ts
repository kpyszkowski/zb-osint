import { type Probe, extractDomain } from '../types.js'

const RETRIES = 3

async function fetchCrtSh(baseDomain: string): Promise<Response> {
  let lastError: unknown
  for (let attempt = 0; attempt < RETRIES; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2000 * attempt))
    try {
      const res = await fetch(
        `https://crt.sh/?q=%25.${baseDomain}&output=json`,
        { signal: AbortSignal.timeout(45000) },
      )
      if (res.status !== 503) return res
      lastError = new Error(`HTTP 503`)
    } catch (e) {
      lastError = e
    }
  }
  throw lastError
}

export const subdomainsProbe: Probe = async (url) => {
  const domain = extractDomain(url)
  // Use registrable domain for crt.sh
  const parts = domain.split('.')
  const baseDomain = parts.slice(-2).join('.')

  try {
    const res = await fetchCrtSh(baseDomain)

    if (!res.ok) {
      return {
        name: 'Subdomains (crt.sh)',
        data: null,
        error: `HTTP ${res.status}`,
      }
    }

    const entries = (await res.json()) as Array<{
      common_name: string
      name_value: string
      issuer_name: string
      not_after: string
    }>

    // Deduplicate subdomains
    const subdomains = [
      ...new Set(
        entries.flatMap((e) =>
          e.name_value.split('\n').map((n) => n.trim().toLowerCase()),
        ),
      ),
    ].sort()

    return {
      name: 'Subdomains (crt.sh)',
      data: {
        total: subdomains.length,
        subdomains,
      },
    }
  } catch (e) {
    return { name: 'Subdomains (crt.sh)', data: null, error: String(e) }
  }
}
