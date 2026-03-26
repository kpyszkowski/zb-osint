import { Command } from 'commander'
import { runPipeline } from './pipeline.js'
import { saveReport } from './output.js'

const program = new Command()

program
  .name('zb-osint')
  .description('OSINT website reconnaissance CLI tool')
  .requiredOption(
    '-u, --url <url>',
    'Target URL (e.g. https://www.put.poznan.pl)',
  )
  .option('-o, --output <dir>', 'Output directory for reports', './reports')
  .action(async (opts: { url: string; output: string }) => {
    // Normalize URL
    let url = opts.url
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`
    }

    try {
      const report = await runPipeline(url)
      await saveReport(report, opts.output)
    } catch (e) {
      console.error('Fatal error:', e)
      process.exit(1)
    }
  })

program.parse()
