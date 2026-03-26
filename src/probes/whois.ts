import whois from 'whois-json'
import { type Probe, extractDomain } from '../types.js'

export const whoisProbe: Probe = async (url) => {
  const domain = extractDomain(url)
  // Use the registrable domain (last two parts) for WHOIS
  const parts = domain.split('.')
  const registrableDomain = parts.slice(-2).join('.')

  try {
    const result = await whois(registrableDomain)
    return { name: 'WHOIS', data: result }
  } catch (e) {
    return { name: 'WHOIS', data: null, error: String(e) }
  }
}
