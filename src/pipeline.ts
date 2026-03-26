import { type ReconReport, extractDomain } from './types.js'
import { allProbes, probeMap } from './probes/index.js'

export async function runPipeline(
  url: string,
  enabledProbes?: Record<string, boolean>,
): Promise<ReconReport> {
  const start = Date.now()
  const domain = extractDomain(url)

  console.log(`\n🔍 Starting OSINT recon on: ${url}`)
  console.log(`   Domain: ${domain}\n`)

  const probes = enabledProbes
    ? Object.entries(probeMap)
        .filter(([key]) => enabledProbes[key] !== false)
        .map(([, probe]) => probe)
    : allProbes

  const results = await Promise.allSettled(
    probes.map(async (probe) => {
      const result = await probe(url)
      const icon = result.error ? '❌' : '✅'
      console.log(`  ${icon} ${result.name}`)
      return result
    }),
  )

  const probeResults = results.map((r) =>
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
    probes: probeResults,
  }
}
