import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Liquid } from 'liquidjs'
import MarkdownIt from 'markdown-it'
import { buildHtmlDocument, type ReportMeta } from './template.js'

const md = new MarkdownIt()
const engine = new Liquid()

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultTemplatePath = path.resolve(__dirname, '../../templates/report.md')

export async function generatePdf(
  reportJson: Record<string, unknown>,
  outputPath: string,
  meta: ReportMeta,
  templatePath?: string,
): Promise<void> {
  const tplFile = templatePath ?? defaultTemplatePath
  const tplSource = await fs.readFile(tplFile, 'utf-8')

  const date = new Date(meta.timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const vars = {
    ...meta,
    date,
    duration_seconds: ((reportJson.duration as number) / 1000).toFixed(1),
    probes: reportJson.probes,
  }

  const renderedMd = await engine.parseAndRender(tplSource, vars)
  const bodyHtml = md.render(renderedMd)
  const html = buildHtmlDocument(meta, bodyHtml)

  // Dynamic import following existing pattern (src/probes/puppeteer.ts)
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
      headerTemplate: '<span></span>',
      footerTemplate: `
        <div style="font-size:9px; width:100%; text-align:center; color:#888;">
          <span class="pageNumber"></span> / <span class="totalPages"></span>
        </div>`,
    })
  } finally {
    await browser?.close()
  }
}
