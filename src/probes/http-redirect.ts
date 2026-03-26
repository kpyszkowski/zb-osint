import { type Probe, extractDomain } from '../types.js'

export const httpRedirectProbe: Probe = async (url) => {
  const domain = extractDomain(url)
  const httpUrl = `http://${domain}`

  try {
    const res = await fetch(httpUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(10000),
    })

    const location = res.headers.get('location')
    const redirectsToHttps = location?.startsWith('https://') ?? false

    return {
      name: 'HTTP → HTTPS Redirect',
      data: {
        httpUrl,
        statusCode: res.status,
        redirectLocation: location,
        redirectsToHttps,
        isRedirect: res.status >= 300 && res.status < 400,
        hasHSTS: res.headers.get('strict-transport-security') !== null,
      },
    }
  } catch (e) {
    return { name: 'HTTP → HTTPS Redirect', data: null, error: String(e) }
  }
}
