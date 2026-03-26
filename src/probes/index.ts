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

export const allProbes: Probe[] = [
  dnsProbe,
  whoisProbe,
  sslProbe,
  headersProbe,
  techstackProbe,
  robotsProbe,
  subdomainsProbe,
  puppeteerProbe,
  waybackProbe,
  dorksProbe,
  commonPathsProbe,
  httpRedirectProbe,
]
