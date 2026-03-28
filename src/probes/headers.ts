import { type Probe } from '../types'

const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-frame-options',
  'x-content-type-options',
  'x-xss-protection',
  'referrer-policy',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
]

export const headersProbe: Probe = async (url) => {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })

    const allHeaders: Record<string, string> = {}
    res.headers.forEach((v, k) => (allHeaders[k] = v))

    const securityHeaders: Record<string, string | null> = {}
    for (const h of SECURITY_HEADERS) {
      securityHeaders[h] = res.headers.get(h)
    }

    return {
      name: 'HTTP Headers',
      data: {
        statusCode: res.status,
        server: res.headers.get('server'),
        poweredBy: res.headers.get('x-powered-by'),
        allHeaders,
        securityHeaders,
        missingSecurityHeaders: SECURITY_HEADERS.filter(
          (h) => !res.headers.get(h),
        ),
      },
    }
  } catch (e) {
    return { name: 'HTTP Headers', data: null, error: String(e) }
  }
}
