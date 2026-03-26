import fs from 'node:fs/promises'
import path from 'node:path'
import MarkdownIt from 'markdown-it'
import { generateAiReport } from '../ai/report.js'
import { buildHtmlDocument, type ReportMeta } from './template.js'
import type { ReconReport } from '../types.js'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
})
  .enable('table')
  .disable('hr')

export async function generatePdf(
  reports: ReconReport[],
  outputPath: string,
  meta: ReportMeta,
  language?: string,
): Promise<void> {
  console.log(`🤖 Generating AI report (language: ${language ?? 'English'})...`)
  const raw = await generateAiReport(reports, meta, language ?? 'English')
  // Strip leading H1 — title page already covers this
  // Strip markdown horizontal rules (--- / *** / ___) — no separators in PDF
  const reportMd = raw.replace(/^#\s+.+\n+/, '').replace(/^[-*_]{3,}\s*$/gm, '')

  let logoDataUri: string | undefined
  if (meta.logoPath) {
    try {
      const ext = path.extname(meta.logoPath).slice(1).toLowerCase()
      const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext}`
      const buf = await fs.readFile(meta.logoPath)
      logoDataUri = `data:${mime};base64,${buf.toString('base64')}`
    } catch {
      // logo file missing or unreadable — skip silently
    }
  }

  const bodyHtml = md.render(reportMd)
  const html = buildHtmlDocument(meta, bodyHtml, logoDataUri)

  const mod = await import('puppeteer')
  const puppeteer = mod.default ?? mod
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let browser: any

  try {
    browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })

    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: { top: '25mm', bottom: '25mm', left: '25mm', right: '25mm' },
      displayHeaderFooter: true,
      headerTemplate: `<span></span>`,
      footerTemplate: `
        <div style="font-family:'Times New Roman',Times,serif; font-size:12pt; width:100%; text-align:center; color:#111;">
          <span class="pageNumber"></span>
        </div>`,
    })
  } finally {
    await browser?.close()
  }
}
