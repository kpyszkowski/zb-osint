import { type Probe, extractDomain } from '../types.js'

export const waybackProbe: Probe = async (url) => {
  const domain = extractDomain(url)
  try {
    const res = await fetch(
      `https://archive.org/wayback/available?url=${domain}`,
      { signal: AbortSignal.timeout(15000) },
    )
    const data = await res.json()
    return { name: 'Wayback Machine', data }
  } catch (e) {
    return { name: 'Wayback Machine', data: null, error: String(e) }
  }
}
