import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Command } from 'commander'
import { runPipeline } from './pipeline.js'
import { saveReport } from './output.js'
import { type ReconReport } from './types.js'
import { generatePdf } from './pdf/render.js'
import { type ReportMeta } from './pdf/template.js'

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
  report: ReconReport,
  outputDir: string,
  config: AppConfig,
  overrides: {
    student?: string
    studentId?: string
    course?: string
    instructor?: string
    university?: string
    title?: string
    template?: string
  },
) {
  const m = config.meta
  const safeName = report.domain.replace(/[^a-zA-Z0-9.-]/g, '_')
  const pdfPath = path.join(outputDir, `${safeName}.pdf`)

  const meta: ReportMeta = {
    title: overrides.title ?? m.title ?? 'OSINT Reconnaissance Report',
    student: overrides.student ?? m.student,
    studentId: overrides.studentId ?? m.studentId,
    course: overrides.course ?? m.course,
    instructor: overrides.instructor ?? m.instructor,
    university: overrides.university ?? m.university,
    domain: report.domain,
    timestamp: report.timestamp,
    target: report.target,
  }

  console.log(`🔄 Generating PDF report...`)
  await generatePdf(
    report as unknown as Record<string, unknown>,
    pdfPath,
    meta,
    overrides.template,
  )
  console.log(`📕 PDF report: ${pdfPath}`)
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

// --- shared option helpers ---
function addMetaOptions(cmd: Command): Command {
  return cmd
    .option('--student <name>', 'Student full name')
    .option('--student-id <id>', 'Student ID number')
    .option('--course <name>', 'Course name')
    .option('--instructor <name>', 'Instructor name')
    .option('--university <name>', 'University name')
    .option('--title <title>', 'Report title')
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
    'Run passive reconnaissance against a target URL.\n\n' +
      'Examples:\n' +
      '  $ pnpm start -- recon -u https://example.com\n' +
      '  $ pnpm start -- recon -u example.com --disable-probes dorks,puppeteer --pdf',
  )
  .requiredOption(
    '-u, --url <url>',
    'Target URL (e.g. https://www.put.poznan.pl)',
  )
  .option('-o, --output <dir>', 'Output directory for reports', './reports')

addMetaOptions(reconCmd)
addProbeOptions(reconCmd)
addOutputOptions(reconCmd)

reconCmd.action(
  async (
    opts: { url: string; output: string } & MetaOpts & ProbeOpts & OutputOpts,
  ) => {
    let url = opts.url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    try {
      const config = await loadConfig()
      const probes = parseProbeOverrides(
        opts.enableProbes,
        opts.disableProbes,
        config.probes,
      )
      const outputs = parseOutputOverrides(opts, config.outputs)

      const report = await runPipeline(url, probes)
      await saveReport(report, opts.output, outputs)

      if (outputs.pdf) {
        await buildMetaAndGeneratePdf(report, opts.output, config, opts)
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
    'Generate a PDF academic report from an existing JSON report.\n\n' +
      'Examples:\n' +
      '  $ pnpm start -- report ./reports/example.com.json\n' +
      '  $ pnpm start -- report ./reports/example.com.json --student "Jan Kowalski"\n' +
      '  $ pnpm start -- report ./reports/example.com.json --template ./my-template.md',
  )
  .argument('<json-file>', 'Path to the JSON report file')
  .option('--template <path>', 'Path to a custom Liquid/Markdown template')
  .option(
    '-o, --output <dir>',
    'Output directory (defaults to same directory as input file)',
  )

addMetaOptions(reportCmd)

reportCmd.action(
  async (
    jsonFile: string,
    opts: { template?: string; output?: string } & MetaOpts,
  ) => {
    try {
      const config = await loadConfig()

      const raw = await fs.readFile(jsonFile, 'utf-8')
      const report: ReconReport = JSON.parse(raw)

      const outputDir = opts.output ?? path.dirname(jsonFile)
      await buildMetaAndGeneratePdf(report, outputDir, config, opts)
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

    let url = opts.url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    try {
      const config = await loadConfig()
      const report = await runPipeline(url, config.probes)
      await saveReport(report, opts.output, config.outputs)

      if (config.outputs?.pdf) {
        await buildMetaAndGeneratePdf(report, opts.output, config, {})
      }
    } catch (e) {
      console.error('Fatal error:', e)
      process.exit(1)
    }
  })

program.parse()
