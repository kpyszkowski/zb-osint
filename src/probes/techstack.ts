import { type Probe } from '../types'

interface TechSignature {
  name: string
  category: string
  check: (html: string, headers: Headers) => boolean
}

const SIGNATURES: TechSignature[] = [
  // CMS
  {
    name: 'WordPress',
    category: 'CMS',
    check: (h) => /wp-content|wp-includes|wp-json/i.test(h),
  },
  {
    name: 'Drupal',
    category: 'CMS',
    check: (h) => /Drupal|sites\/default\/files/i.test(h),
  },
  {
    name: 'Joomla',
    category: 'CMS',
    check: (h) => /\/media\/jui\/|com_content/i.test(h),
  },
  { name: 'Typo3', category: 'CMS', check: (h) => /typo3|tx_/i.test(h) },
  { name: 'Liferay', category: 'CMS', check: (h) => /liferay/i.test(h) },

  // JS Frameworks
  {
    name: 'React',
    category: 'Framework',
    check: (h) =>
      /react\.production|__NEXT_DATA__|_next\/static|reactroot/i.test(h),
  },
  {
    name: 'Next.js',
    category: 'Framework',
    check: (h) => /__NEXT_DATA__|_next\/static/i.test(h),
  },
  {
    name: 'Vue.js',
    category: 'Framework',
    check: (h) => /vue\.min\.js|vue\.runtime|v-cloak|data-v-/i.test(h),
  },
  {
    name: 'Nuxt',
    category: 'Framework',
    check: (h) => /__NUXT__|_nuxt\//i.test(h),
  },
  {
    name: 'Angular',
    category: 'Framework',
    check: (h) => /ng-version|ng-app|angular\.min\.js/i.test(h),
  },
  {
    name: 'jQuery',
    category: 'Library',
    check: (h) => /jquery[.-]?\d|jquery\.min\.js/i.test(h),
  },
  {
    name: 'Bootstrap',
    category: 'Library',
    check: (h) => /bootstrap\.min\.(css|js)/i.test(h),
  },
  {
    name: 'Tailwind CSS',
    category: 'Library',
    check: (h) => /tailwindcss|tailwind\.min\.css/i.test(h),
  },

  // Server-side
  {
    name: 'PHP',
    category: 'Language',
    check: (_h, hd) =>
      /php/i.test(hd.get('x-powered-by') || '') || /\.php/i.test(_h),
  },
  {
    name: 'ASP.NET',
    category: 'Language',
    check: (_h, hd) =>
      /asp\.net/i.test(hd.get('x-powered-by') || '') || /\.aspx/i.test(_h),
  },
  {
    name: 'Java/Spring',
    category: 'Language',
    check: (_h, hd) =>
      /servlet|jsessionid/i.test(hd.get('set-cookie') || '') ||
      /\.jsp/i.test(_h),
  },

  // Analytics / Tags
  {
    name: 'Google Analytics',
    category: 'Analytics',
    check: (h) =>
      /google-analytics\.com|gtag|GA_MEASUREMENT_ID|googletagmanager/i.test(h),
  },
  {
    name: 'Google Tag Manager',
    category: 'Analytics',
    check: (h) => /googletagmanager\.com\/gtm\.js/i.test(h),
  },
  {
    name: 'Matomo',
    category: 'Analytics',
    check: (h) => /matomo|piwik/i.test(h),
  },

  // Web Servers (from headers)
  {
    name: 'Nginx',
    category: 'Server',
    check: (_h, hd) => /nginx/i.test(hd.get('server') || ''),
  },
  {
    name: 'Apache',
    category: 'Server',
    check: (_h, hd) => /apache/i.test(hd.get('server') || ''),
  },
  {
    name: 'IIS',
    category: 'Server',
    check: (_h, hd) => /microsoft-iis/i.test(hd.get('server') || ''),
  },
  {
    name: 'Cloudflare',
    category: 'CDN',
    check: (_h, hd) => /cloudflare/i.test(hd.get('server') || ''),
  },
]

export const techstackProbe: Probe = async (url) => {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    })
    const html = await res.text()

    const detected = SIGNATURES.filter((sig) =>
      sig.check(html, res.headers),
    ).map(({ name, category }) => ({ name, category }))

    // Extract meta generator
    const generatorMatch = html.match(
      /<meta[^>]*name=["']generator["'][^>]*content=["']([^"']+)["']/i,
    )
    const generator = generatorMatch?.[1] || null

    if (generator) {
      detected.push({ name: generator, category: 'Generator' })
    }

    return {
      name: 'Tech Stack',
      data: { detected, generator },
    }
  } catch (e) {
    return { name: 'Tech Stack', data: null, error: String(e) }
  }
}
