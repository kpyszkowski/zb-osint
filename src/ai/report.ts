import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateText } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { ReconReport, ProbeResult } from '../types.js'
import type { ReportMeta } from '../pdf/template.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const agentInstructionsDir = path.resolve(__dirname, '../../agent-instructions')

async function loadAgentInstructions(): Promise<string> {
  const [index, architecture] = await Promise.all([
    fs.readFile(path.join(agentInstructionsDir, 'index.md'), 'utf-8'),
    fs.readFile(path.join(agentInstructionsDir, 'architecture.md'), 'utf-8'),
  ])
  return `## agent-instructions/index.md\n\n${index}\n\n## agent-instructions/architecture.md\n\n${architecture}`
}

// Trim bulk array fields to keep token count within free-tier limits
function trimProbeData(probe: ProbeResult): ProbeResult {
  if (probe.error || probe.data === null || typeof probe.data !== 'object') {
    return probe
  }

  const data = probe.data as Record<string, unknown>

  if (probe.name === 'Subdomains (crt.sh)' && Array.isArray(data.subdomains)) {
    return {
      ...probe,
      data: {
        ...data,
        subdomains: (data.subdomains as unknown[]).slice(0, 20),
      },
    }
  }

  if (probe.name === 'Search Engine Dorks' && typeof data === 'object') {
    const trimmed: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(data)) {
      const dork = val as Record<string, unknown>
      trimmed[key] = {
        ...dork,
        results: Array.isArray(dork.results)
          ? dork.results.slice(0, 3)
          : dork.results,
      }
    }
    return { ...probe, data: trimmed }
  }

  if (probe.name === 'robots.txt' && typeof data.raw === 'string') {
    return {
      ...probe,
      data: { ...data, raw: (data.raw as string).slice(0, 500) },
    }
  }

  return probe
}

function trimReport(report: ReconReport): ReconReport {
  return { ...report, probes: report.probes.map(trimProbeData) }
}

export async function generateAiReport(
  reports: ReconReport[],
  meta: ReportMeta,
  language: string,
): Promise<string> {
  const agentInstructions = await loadAgentInstructions()
  const model = process.env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY,
  })

  const trimmedReports = reports.map(trimReport)
  const isMulti = trimmedReports.length > 1

  const systemPrompt = `You are an academic OSINT analyst writing a formal reconnaissance report for a university course.

## Tool Context

The following documentation describes the automated OSINT pipeline that produced the data:

${agentInstructions}

## Report Structure

Write a complete, formal academic report in **${language}**. All text — including headings — must be in ${language}.
Use Markdown ATX headings: \`##\` for top-level sections (e.g. \`## 1. Introduction\`), \`###\` for subsections (e.g. \`### 1.1 Background\`), \`####\` for sub-subsections. Never use bold text as a substitute for headings. Do NOT include a top-level \`#\` title heading — the document already has a title page.

${
  isMulti
    ? `The report covers ${trimmedReports.length} targets. Structure it as follows:

1. **Introduction** — Brief scope statement (targets, date, purpose).
2. **Automated Reconnaissance Methodology** — ONE section describing the automated pipeline and each probe technically:
   - Emphasise that all data was collected by an automated tool, not manually
   - For each probe explain: what data source or protocol it uses, what API or technique is involved, and what class of information it exposes (e.g. DNS: iterates record types A/AAAA/MX/NS/TXT/SOA/CNAME via the system resolver; SSL/TLS: connects via node:tls and extracts certificate chain metadata; crt.sh: queries Certificate Transparency logs REST API; Wayback Machine: calls the CDX API; Brave Search dorks: issues 13 predefined operator queries via the Brave Search API with 500 ms throttling; Puppeteer: launches headless Chromium to intercept network requests and inspect the DOM)
3. **Target Analysis** — A numbered chapter per target (e.g. "3. Target 1: example.com", "4. Target 2: other.com"). Each chapter contains ONLY the findings for that target — do NOT re-explain methodology here. Sub-sections per probe with findings and security interpretation.
4. **Comparative Analysis** — Cross-target comparison of security posture, infrastructure similarities/differences, and notable divergences.
5. **Conclusions & Recommendations** — Aggregate risk summary and actionable recommendations.`
    : `Structure it as follows:

1. **Introduction** — Brief scope (target, date, purpose).
2. **Automated Reconnaissance Methodology** — Describe the automated pipeline technically:
   - Emphasise that all data was collected by an automated tool, not manually
   - For each probe used explain: what data source or protocol it queries, what API or technique is involved, and what it reveals (e.g. DNS: iterates record types A/AAAA/MX/NS/TXT/SOA/CNAME via system resolver; SSL/TLS: node:tls TLS handshake, certificate chain extraction; crt.sh: Certificate Transparency logs REST API; Wayback Machine: CDX API; Brave Search dorks: 13 predefined operator queries via Brave Search API with 500 ms throttling; Puppeteer: headless Chromium, network request interception, DOM inspection)
3. **Findings** — A numbered sub-section per probe. Present what was discovered and interpret the security implications. Do not re-explain how the probe works — that is in Methodology.
4. **Conclusions & Recommendations** — Risk summary and actionable recommendations.`
}

Additional guidelines:
- Synthesize findings into narrative prose — never dump raw JSON or lists without interpretation
- Be precise and technical; avoid vague generic statements
- Academic tone: formal, objective, third-person
- Format output as Markdown
- Do NOT include any preamble, meta-commentary, acknowledgment, or transition phrases (e.g. "Below is the report", "As requested", "Prepared in accordance with"). Start directly with the first section heading.`

  const userContent = [
    `Generate a full academic OSINT reconnaissance report for the following data.`,
    `\n## Report Metadata\n${JSON.stringify(meta, null, 2)}`,
    ...trimmedReports.map(
      (r, i) =>
        `\n## ${isMulti ? `Target ${i + 1}: ${r.domain}` : 'Reconnaissance Data'}\n${JSON.stringify(r, null, 2)}`,
    ),
  ].join('\n')

  const { text } = await generateText({
    model: google(model),
    maxRetries: 0,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })

  return text
}
