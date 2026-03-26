import dns from 'node:dns/promises'
import { type Probe, extractDomain } from '../types.js'

export const dnsProbe: Probe = async (url) => {
  const domain = extractDomain(url)
  try {
    const [a, aaaa, mx, ns, txt, soa, cname] = await Promise.allSettled([
      dns.resolve4(domain),
      dns.resolve6(domain),
      dns.resolveMx(domain),
      dns.resolveNs(domain),
      dns.resolveTxt(domain),
      dns.resolveSoa(domain),
      dns.resolveCname(domain),
    ])

    const extract = <T>(r: PromiseSettledResult<T>) =>
      r.status === 'fulfilled' ? r.value : null

    return {
      name: 'DNS Records',
      data: {
        A: extract(a),
        AAAA: extract(aaaa),
        MX: extract(mx),
        NS: extract(ns),
        TXT: extract(txt),
        SOA: extract(soa),
        CNAME: extract(cname),
      },
    }
  } catch (e) {
    return { name: 'DNS Records', data: null, error: String(e) }
  }
}
