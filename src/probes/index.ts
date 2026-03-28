import { type Probe } from '../types'
import { dnsProbe } from './dns'
import { whoisProbe } from './whois'
import { sslProbe } from './ssl'
import { headersProbe } from './headers'
import { techstackProbe } from './techstack'
import { robotsProbe } from './robots'
import { subdomainsProbe } from './subdomains'
import { puppeteerProbe } from './puppeteer'
import { waybackProbe } from './wayback'
import { dorksProbe } from './dorks'
import { commonPathsProbe } from './common-paths'
import { httpRedirectProbe } from './http-redirect'

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
