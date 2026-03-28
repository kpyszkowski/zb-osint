import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { runPipeline } from './pipeline'
import { saveReport } from './output'
import { type ReconReport } from './types'
import { generatePdf } from './pdf/render'
import { type ReportMeta } from './pdf/template'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultConfigPath = path.resolve(__dirname, '../config.json')

interface AppConfig {
  meta: {
    student: string
    studentId?: string
    course: string
    instructor?: string
    university?: string
    title?: string
    language?: string
    logoPath?: string
  }
  probes?: Record<string, boolean>
  outputs?: {
    json?: boolean
    md?: boolean
    pdf?: boolean
  }
}

async function loadConfig(): Promise<AppConfig> {
  const raw = await fs.readFile(defaultConfigPath, 'utf-8')
  return JSON.parse(raw)
}

function normalizeUrl(url: string): string {
  return url.startsWith('http://') || url.startsWith('https://')
    ? url
    : `https://${url}`
}

function parseProbeOverrides(
  enable?: string,
  disable?: string,
  configProbes?: Record<string, boolean>,
): Record<string, boolean> | undefined {
  if (!enable && !disable) return configProbes

  const probes = { ...configProbes }
  if (enable) {
    for (const key of enable.split(',')) probes[key.trim()] = true
  }
  if (disable) {
    for (const key of disable.split(',')) probes[key.trim()] = false
  }
  return probes
}

function parseOutputOverrides(
  opts: { json?: boolean; md?: boolean; pdf?: boolean },
  configOutputs?: { json?: boolean; md?: boolean; pdf?: boolean },
): { json?: boolean; md?: boolean; pdf?: boolean } {
  return {
    json: opts.json ?? configOutputs?.json,
    md: opts.md ?? configOutputs?.md,
    pdf: opts.pdf ?? configOutputs?.pdf,
  }
}

async function buildMetaAndGeneratePdf(
  reports: ReconReport[],
  outputDir: string,
  config: AppConfig,
  overrides: {
    student?: string
    studentId?: string
    course?: string
    instructor?: string
    university?: string
    title?: string
    language?: string
  },
) {
  if (!process.env.GEMINI_API_KEY) {
    console.warn('⚠️  GEMINI_API_KEY not set — skipping PDF generation')
    return
  }

  const m = config.meta

  const pdfName =
    reports.length === 1
      ? (reports[0]?.domain ?? 'report')
          .toLowerCase()
          .replace(/[^a-z0-9.-]/g, '-')
      : `multi-target-${reports.map((r) => r.domain.toLowerCase().replace(/[^a-z0-9.-]/g, '-')).join('-')}`
  const pdfPath = path.join(outputDir, `${pdfName}.pdf`)

  const language = overrides.language ?? m.language ?? 'English'

  const meta: ReportMeta = {
    title: `${overrides.title ?? m.title ?? 'OSINT Reconnaissance Report'} - ${reports.map((r) => r.domain).join(', ')}`,
    student: overrides.student ?? m.student,
    studentId: overrides.studentId ?? m.studentId,
    course: overrides.course ?? m.course,
    instructor: overrides.instructor ?? m.instructor,
    university: overrides.university ?? m.university,
    targets: reports.map((r) => ({ url: r.target, domain: r.domain })),
    timestamp: reports[0]?.timestamp ?? new Date().toISOString(),
    language,
    logoPath: m.logoPath
      ? path.resolve(path.dirname(defaultConfigPath), m.logoPath)
      : undefined,
  }

  console.log(`🔄 Generating PDF report...`)
  try {
    await generatePdf(reports, pdfPath, meta, language)
    console.log(`📕 PDF report: ${pdfPath}`)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`❌ PDF generation failed: ${message}`)
  }
}

const probeKeys =
  'dns, whois, ssl, headers, techstack, robots, subdomains, puppeteer, wayback, dorks, common-paths, http-redirect'

const program = new Command()

program
  .name('zb-osint')
  .description(
    'OSINT website reconnaissance CLI tool.\n\n' +
      'Configuration is loaded from config.json. ' +
      'CLI flags override config values for the current run.',
  )
  .version('1.0.0')
  .enablePositionalOptions()

// --- shared option helpers ---
function addMetaOptions(cmd: Command): Command {
  return cmd
    .option('--student <name>', 'Student full name')
    .option('--student-id <id>', 'Student ID number')
    .option('--course <name>', 'Course name')
    .option('--instructor <name>', 'Instructor name')
    .option('--university <name>', 'University name')
    .option('--title <title>', 'Report title')
    .option(
      '--language <lang>',
      'Report language (e.g. English, Polish, French)',
    )
}

function addProbeOptions(cmd: Command): Command {
  return cmd
    .option(
      '--enable-probes <list>',
      `Enable specific probes (comma-separated). Available: ${probeKeys}`,
    )
    .option(
      '--disable-probes <list>',
      'Disable specific probes (comma-separated)',
    )
}

function addOutputOptions(cmd: Command): Command {
  return cmd
    .option('--json', 'Enable JSON output')
    .option('--no-json', 'Disable JSON output')
    .option('--md', 'Enable Markdown output')
    .option('--no-md', 'Disable Markdown output')
    .option('--pdf', 'Enable PDF output')
    .option('--no-pdf', 'Disable PDF output')
}

interface MetaOpts {
  student?: string
  studentId?: string
  course?: string
  instructor?: string
  university?: string
  title?: string
  language?: string
}

interface ProbeOpts {
  enableProbes?: string
  disableProbes?: string
}

interface OutputOpts {
  json?: boolean
  md?: boolean
  pdf?: boolean
}

// --- recon command ---
const reconCmd = new Command('recon')
  .description(
    'Run passive reconnaissance against one or more target URLs.\n\n' +
      'Examples:\n' +
      '  $ pnpm start -- recon -u https://example.com\n' +
      '  $ pnpm start -- recon -u example.com other.com --pdf\n' +
      '  $ pnpm start -- recon -u example.com --disable-probes dorks,puppeteer --pdf',
  )
  .requiredOption(
    '-u, --url <urls...>',
    'Target URL(s) — pass multiple to generate a combined multi-target report',
  )
  .option('-o, --output <dir>', 'Output directory for reports', './reports')

addMetaOptions(reconCmd)
addProbeOptions(reconCmd)
addOutputOptions(reconCmd)

reconCmd.action(
  async (
    opts: { url: string[]; output: string } & MetaOpts & ProbeOpts & OutputOpts,
  ) => {
    const urls = opts.url.map(normalizeUrl)

    try {
      const config = await loadConfig()
      const probes = parseProbeOverrides(
        opts.enableProbes,
        opts.disableProbes,
        config.probes,
      )
      const outputs = parseOutputOverrides(opts, config.outputs)

      // Run pipelines sequentially so logs stay grouped per target
      const reports: ReconReport[] = []
      for (const url of urls) {
        reports.push(await runPipeline(url, probes))
      }

      // Save individual JSON/MD outputs per target
      await Promise.all(
        reports.map((report) => saveReport(report, opts.output, outputs)),
      )

      if (outputs.pdf) {
        await buildMetaAndGeneratePdf(reports, opts.output, config, opts)
      }
    } catch (e) {
      console.error('Fatal error:', e)
      process.exit(1)
    }
  },
)

program.addCommand(reconCmd)

// --- report command ---
const reportCmd = new Command('report')
  .description(
    'Generate a PDF academic report from one or more existing JSON reports.\n\n' +
      'Examples:\n' +
      '  $ pnpm start -- report ./reports/example.com.json\n' +
      '  $ pnpm start -- report ./reports/a.com.json ./reports/b.com.json\n' +
      '  $ pnpm start -- report ./reports/example.com.json --language Polish',
  )
  .argument('<json-files...>', 'Path(s) to JSON report file(s)')
  .option(
    '-o, --output <dir>',
    'Output directory (defaults to directory of first input file)',
  )

addMetaOptions(reportCmd)

reportCmd.action(
  async (jsonFiles: string[], opts: { output?: string } & MetaOpts) => {
    try {
      const config = await loadConfig()

      const reports: ReconReport[] = await Promise.all(
        jsonFiles.map(async (f) => JSON.parse(await fs.readFile(f, 'utf-8'))),
      )

      const outputDir = opts.output ?? path.dirname(jsonFiles[0] ?? '.')
      await buildMetaAndGeneratePdf(reports, outputDir, config, opts)
    } catch (e) {
      console.error('Fatal error:', e)
      process.exit(1)
    }
  },
)

program.addCommand(reportCmd)

// --- default action: bare --url as shorthand for recon ---
program
  .option('-u, --url <url>', 'Target URL — shorthand for `recon --url`')
  .option('-o, --output <dir>', 'Output directory for reports', './reports')
  .action(async (opts: { url?: string; output: string }) => {
    if (!opts.url) {
      program.help()
      return
    }

    const url = normalizeUrl(opts.url)

    try {
      const config = await loadConfig()
      const report = await runPipeline(url, config.probes)
      await saveReport(report, opts.output, config.outputs)

      if (config.outputs?.pdf) {
        await buildMetaAndGeneratePdf([report], opts.output, config, {})
      }
    } catch (e) {
      console.error('Fatal error:', e)
      process.exit(1)
    }
  })

program.parse()
