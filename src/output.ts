import fs from 'node:fs/promises'
import path from 'node:path'
import { type ReconReport } from './types'

export async function saveReport(
  report: ReconReport,
  outputDir: string,
  outputs?: { json?: boolean; md?: boolean },
) {
  await fs.mkdir(outputDir, { recursive: true })

  const safeName = report.domain.toLowerCase().replace(/[^a-z0-9.-]/g, '-')

  if (outputs?.json !== false) {
    const jsonPath = path.join(outputDir, `${safeName}.json`)
    await fs.writeFile(jsonPath, JSON.stringify(report, null, 2))
    console.log(`📄 JSON report: ${jsonPath}`)
  }

  if (outputs?.md !== false) {
    const mdPath = path.join(outputDir, `${safeName}.md`)
    const md = generateMarkdown(report)
    await fs.writeFile(mdPath, md)
    console.log(`📝 Markdown report: ${mdPath}`)
  }
}

function generateMarkdown(report: ReconReport): string {
  const lines: string[] = []

  lines.push(`# OSINT Recon Report: ${report.domain}`)
  lines.push('')
  lines.push(`- **Target:** ${report.target}`)
  lines.push(`- **Timestamp:** ${report.timestamp}`)
  lines.push(`- **Duration:** ${(report.duration / 1000).toFixed(1)}s`)
  lines.push('')
  lines.push('---')

  for (const probe of report.probes) {
    lines.push('')
    lines.push(`## ${probe.name}`)
    lines.push('')

    if (probe.error) {
      lines.push(`> **Error:** ${probe.error}`)
      lines.push('')
    }

    if (probe.data) {
      lines.push(formatProbeData(probe.name, probe.data))
    }
  }

  return lines.join('\n')
}

function formatProbeData(name: string, data: unknown): string {
  if (name === 'Search Engine Dorks') {
    const dorks = data as Record<
      string,
      {
        query: string
        results: Array<{ title: string; url: string }>
        error?: string
      }
    >
    return Object.entries(dorks)
      .map(([label, entry]) => {
        const lines = [`### ${label}`, `\`\`\``, entry.query, `\`\`\``]
        if (entry.error) {
          lines.push(`> Error: ${entry.error}`)
        } else if (entry.results.length === 0) {
          lines.push('*No results found.*')
        } else {
          for (const r of entry.results) {
            lines.push(`- [${r.title}](${r.url})`)
          }
        }
        return lines.join('\n')
      })
      .join('\n\n')
  }

  if (name === 'robots.txt') {
    const d = data as {
      exists: boolean
      raw?: string
      sitemaps?: string[]
      crawlDelay?: number
      preferredHost?: string | null
    }
    if (!d.exists) return '*No robots.txt found.*'
    const lines: string[] = []
    if (d.sitemaps?.length) lines.push(`**Sitemaps:** ${d.sitemaps.join(', ')}`)
    if (d.crawlDelay != null) lines.push(`**Crawl-delay:** ${d.crawlDelay}s`)
    if (d.preferredHost) lines.push(`**Preferred host:** ${d.preferredHost}`)
    lines.push('', `\`\`\`\n${d.raw}\n\`\`\``)
    return lines.join('\n')
  }

  if (name === 'HTTP Headers') {
    const d = data as {
      statusCode: number
      server: string | null
      poweredBy: string | null
      securityHeaders: Record<string, string | null>
      missingSecurityHeaders: string[]
    }
    const lines: string[] = []
    lines.push(`- **Status:** ${d.statusCode}`)
    lines.push(`- **Server:** ${d.server || 'Not disclosed'}`)
    lines.push(`- **X-Powered-By:** ${d.poweredBy || 'Not disclosed'}`)
    lines.push('')
    lines.push('### Security Headers')
    lines.push('')
    for (const [h, v] of Object.entries(d.securityHeaders)) {
      lines.push(`- **${h}:** ${v || '❌ Missing'}`)
    }
    return lines.join('\n')
  }

  if (name === 'SSL/TLS Certificate') {
    const d = data as Record<string, unknown>
    const lines: string[] = []
    for (const [k, v] of Object.entries(d)) {
      if (v && typeof v === 'object') {
        lines.push(`- **${k}:** ${JSON.stringify(v)}`)
      } else {
        lines.push(`- **${k}:** ${v}`)
      }
    }
    return lines.join('\n')
  }

  if (name === 'Common Paths') {
    const d = data as {
      found: Array<{ path: string; status: number }>
      notFound: Array<{ path: string }>
    }
    const lines: string[] = []
    lines.push('### Found')
    if (d.found.length === 0) {
      lines.push('*None of the checked paths were found.*')
    } else {
      for (const p of d.found) {
        lines.push(`- ✅ \`${p.path}\` (HTTP ${p.status})`)
      }
    }
    lines.push('')
    lines.push('### Not Found')
    for (const p of d.notFound) {
      lines.push(`- \`${p.path}\``)
    }
    return lines.join('\n')
  }

  if (name === 'Subdomains (crt.sh)') {
    const d = data as { total: number; subdomains: string[] }
    const lines: string[] = []
    lines.push(`**Total:** ${d.total} unique subdomains\n`)
    const display = d.subdomains.slice(0, 100)
    for (const s of display) {
      lines.push(`- ${s}`)
    }
    if (d.subdomains.length > 100) {
      lines.push(
        `\n*... and ${d.subdomains.length - 100} more (see JSON report)*`,
      )
    }
    return lines.join('\n')
  }

  if (name === 'Tech Stack') {
    const d = data as {
      detected: Array<{ name: string; category: string }>
      generator: string | null
    }
    const lines: string[] = []
    if (d.generator) lines.push(`**Generator:** ${d.generator}\n`)
    if (d.detected.length === 0) {
      lines.push('*No technologies detected from signatures.*')
    } else {
      const grouped: Record<string, string[]> = {}
      for (const t of d.detected) {
        ;(grouped[t.category] ||= []).push(t.name)
      }
      for (const [cat, techs] of Object.entries(grouped)) {
        lines.push(`### ${cat}`)
        for (const t of techs) lines.push(`- ${t}`)
        lines.push('')
      }
    }
    return lines.join('\n')
  }

  if (name === 'Puppeteer Browser Analysis') {
    const d = data as {
      metadata: Record<string, string | null>
      jsLibraries: Record<string, unknown>
      consoleLogs: Array<{ type: string; text: string }>
      totalRequests: number
      requestsByType: Record<string, number>
      externalDomains: string[]
    }
    const lines: string[] = []

    lines.push('### Page Metadata')
    for (const [k, v] of Object.entries(d.metadata)) {
      if (v) lines.push(`- **${k}:** ${v}`)
    }

    lines.push('\n### JS Libraries (window detection)')
    const libs = Object.entries(d.jsLibraries)
    if (libs.length === 0) lines.push('*None detected*')
    else for (const [lib, ver] of libs) lines.push(`- ${lib}: ${ver}`)

    lines.push(`\n### Network Requests (${d.totalRequests} total)`)
    for (const [type, count] of Object.entries(d.requestsByType)) {
      lines.push(`- ${type}: ${count}`)
    }

    lines.push('\n### External Domains')
    if (d.externalDomains.length === 0) lines.push('*None*')
    else for (const dom of d.externalDomains) lines.push(`- ${dom}`)

    if (d.consoleLogs.length > 0) {
      lines.push('\n### Console Logs')
      for (const log of d.consoleLogs.slice(0, 20)) {
        lines.push(`- [${log.type}] ${log.text.slice(0, 200)}`)
      }
    }

    return lines.join('\n')
  }

  // Default: JSON block
  return `\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``
}
