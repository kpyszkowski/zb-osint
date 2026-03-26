import { type Probe } from '../types.js'
import { dnsProbe } from './dns.js'
import { whoisProbe } from './whois.js'
import { sslProbe } from './ssl.js'
import { headersProbe } from './headers.js'
import { techstackProbe } from './techstack.js'
import { robotsProbe } from './robots.js'
import { subdomainsProbe } from './subdomains.js'
import { puppeteerProbe } from './puppeteer.js'
import { waybackProbe } from './wayback.js'
import { dorksProbe } from './dorks.js'
import { commonPathsProbe } from './common-paths.js'
import { httpRedirectProbe } from './http-redirect.js'

export const probeMap: Record<string, Probe> = {
  dns: dnsProbe,
  whois: whoisProbe,
  ssl: sslProbe,
  headers: headersProbe,
  techstack: techstackProbe,
  robots: robotsProbe,
  subdomains: subdomainsProbe,
  puppeteer: puppeteerProbe,
  wayback: waybackProbe,
  dorks: dorksProbe,
  'common-paths': commonPathsProbe,
  'http-redirect': httpRedirectProbe,
}

export const allProbes: Probe[] = Object.values(probeMap)
