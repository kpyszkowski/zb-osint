import { type ReconReport, extractDomain } from './types.js'
import { allProbes } from './probes/index.js'

export async function runPipeline(url: string): Promise<ReconReport> {
  const start = Date.now()
  const domain = extractDomain(url)

  console.log(`\n🔍 Starting OSINT recon on: ${url}`)
  console.log(`   Domain: ${domain}\n`)

  const results = await Promise.allSettled(
    allProbes.map(async (probe) => {
      const result = await probe(url)
      const icon = result.error ? '❌' : '✅'
      console.log(`  ${icon} ${result.name}`)
      return result
    }),
  )

  const probes = results.map((r) =>
    r.status === 'fulfilled'
      ? r.value
      : { name: 'unknown', data: null, error: String(r.reason) },
  )

  const duration = Date.now() - start
  console.log(`\n⏱  Completed in ${(duration / 1000).toFixed(1)}s\n`)

  return {
    target: url,
    domain,
    timestamp: new Date().toISOString(),
    duration,
    probes,
  }
}
