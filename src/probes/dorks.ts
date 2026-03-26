import { type Probe, extractDomain } from '../types.js'

interface DorkResult {
  title: string
  url: string
  description?: string
}

interface DorkEntry {
  query: string
  results: DorkResult[]
  error?: string
}

function buildDorks(domain: string): Record<string, string> {
  return {
    documents: `site:${domain} ext:doc OR ext:docx OR ext:odt OR ext:rtf OR ext:ppt OR ext:pptx OR ext:pdf OR ext:csv OR ext:xls OR ext:xlsx`,
    directoryListing: `site:${domain} intitle:"index of"`,
    configFiles: `site:${domain} ext:xml OR ext:conf OR ext:cnf OR ext:ini OR ext:log OR ext:yml OR ext:yaml OR ext:toml OR ext:env`,
    databaseFiles: `site:${domain} ext:sql OR ext:db OR ext:dbf OR ext:mdb`,
    backupFiles: `site:${domain} ext:bak OR ext:old OR ext:backup OR ext:tar OR ext:gz OR ext:zip`,
    loginPages: `site:${domain} inurl:login OR inurl:signin OR inurl:admin OR inurl:dashboard OR inurl:wp-admin`,
    sqlErrors: `site:${domain} "sql syntax" OR "mysql_fetch" OR "unclosed quotation" OR "ORA-"`,
    phpErrors: `site:${domain} "Fatal error" OR "Warning:" OR "Parse error"`,
    exposedEmails: `site:${domain} intext:"@${domain}"`,
    subdomains: `site:${domain} -www`,
    sensitiveInfo: `site:${domain} intext:"password" OR intext:"api_key" OR intext:"secret"`,
    githubLeaks: `"${domain}" site:github.com OR site:gitlab.com`,
    waybackSearch: `site:web.archive.org "${domain}"`,
  }
}

async function searchBrave(
  query: string,
  apiKey: string,
): Promise<DorkResult[]> {
  const res = await fetch(
    `https://api.search.brave.com/res/v1/web/search?${new URLSearchParams({ q: query, count: '10' })}`,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey,
      },
      signal: AbortSignal.timeout(15000),
    },
  )

  if (!res.ok) throw new Error(`Brave HTTP ${res.status}`)

  const data = (await res.json()) as {
    web?: {
      results?: Array<{ title: string; url: string; description?: string }>
    }
  }
  return (data.web?.results ?? []).map((r) => ({
    title: r.title,
    url: r.url,
    description: r.description,
  }))
}

export const dorksProbe: Probe = async (url) => {
  const apiKey = process.env['BRAVE_API_KEY']
  const domain = extractDomain(url)
  const dorks = buildDorks(domain)
  const results: Record<string, DorkEntry> = {}

  if (!apiKey) {
    for (const [key, query] of Object.entries(dorks)) {
      results[key] = {
        query,
        results: [],
        error: 'BRAVE_API_KEY not set — queries listed for manual use',
      }
    }
    return { name: 'Search Engine Dorks', data: results }
  }

  for (const [key, query] of Object.entries(dorks)) {
    try {
      const hits = await searchBrave(query, apiKey)
      results[key] = { query, results: hits }
    } catch (e) {
      results[key] = { query, results: [], error: String(e) }
    }
    // Throttle between queries to stay within rate limits
    await new Promise((r) => setTimeout(r, 500))
  }

  return { name: 'Search Engine Dorks', data: results }
}
