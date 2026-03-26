import { type Probe, extractOrigin } from '../types.js'

const PATHS = [
  '/sitemap.xml',
  '/.well-known/security.txt',
  '/.well-known/humans.txt',
  '/humans.txt',
  '/security.txt',
  '/wp-admin/',
  '/wp-login.php',
  '/administrator/',
  '/admin/',
  '/login',
  '/signin',
  '/.git/HEAD',
  '/.env',
  '/.htaccess',
  '/server-status',
  '/server-info',
  '/phpinfo.php',
  '/web.config',
  '/crossdomain.xml',
  '/clientaccesspolicy.xml',
  '/.DS_Store',
  '/favicon.ico',
]

export const commonPathsProbe: Probe = async (url) => {
  const origin = extractOrigin(url)

  const results = await Promise.allSettled(
    PATHS.map(async (path) => {
      try {
        const res = await fetch(`${origin}${path}`, {
          method: 'HEAD',
          redirect: 'follow',
          signal: AbortSignal.timeout(8000),
        })
        return {
          path,
          status: res.status,
          exists: res.ok,
          contentType: res.headers.get('content-type'),
        }
      } catch {
        return { path, status: null, exists: false, contentType: null }
      }
    }),
  )

  const paths = results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { path: 'unknown', status: null, exists: false, contentType: null },
  )

  return {
    name: 'Common Paths',
    data: {
      found: paths.filter((p) => p.exists),
      notFound: paths.filter((p) => !p.exists),
    },
  }
}
