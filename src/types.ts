export interface ProbeResult {
  name: string
  data: unknown
  error?: string
}

export interface ReconReport {
  target: string
  domain: string
  timestamp: string
  duration: number
  probes: ProbeResult[]
}

export type Probe = (url: string) => Promise<ProbeResult>

export function extractDomain(url: string): string {
  return new URL(url).hostname
}

export function extractOrigin(url: string): string {
  return new URL(url).origin
}
