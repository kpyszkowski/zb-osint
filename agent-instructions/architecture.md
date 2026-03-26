# Architecture

## Pipeline

`src/pipeline.ts` runs all probes in parallel via `Promise.allSettled`, collects results into a `ReconReport`, and returns it to the CLI.

## Probe Interface

```ts
type Probe = (url: string) => Promise<ProbeResult>

interface ProbeResult {
  name: string
  data: unknown
  error?: string
}
```

Every probe must return a result — never throw. Errors go into `result.error`.

Helper utilities in `src/types.ts`:
- `extractDomain(url)` — returns `hostname` (e.g. `www.put.poznan.pl`)
- `extractOrigin(url)` — returns `origin` (e.g. `https://www.put.poznan.pl`)

## Probes

| File | Probe name | Source |
|---|---|---|
| `probes/dns.ts` | DNS Records | `node:dns/promises` |
| `probes/whois.ts` | WHOIS | `whois-json` |
| `probes/ssl.ts` | SSL/TLS Certificate | `node:tls` |
| `probes/headers.ts` | HTTP Headers | `fetch` |
| `probes/robots.ts` | robots.txt | `fetch` + `robots-parser` |
| `probes/techstack.ts` | Tech Stack | Puppeteer |
| `probes/subdomains.ts` | Subdomains (crt.sh) | crt.sh CT logs API |
| `probes/common-paths.ts` | Common Paths | `fetch` HEAD |
| `probes/http-redirect.ts` | HTTP Redirect | `fetch` redirect:manual |
| `probes/wayback.ts` | Wayback Machine | archive.org API |
| `probes/puppeteer.ts` | Puppeteer Browser Analysis | Puppeteer |
| `probes/dorks.ts` | Search Engine Dorks | Brave Search API |

## Adding a New Probe

1. Create `src/probes/my-probe.ts` — export `myProbe: Probe`
2. Re-export from `src/probes/index.ts`
3. Add to the probes array in `src/pipeline.ts`
4. Add a formatter branch in `formatProbeData()` in `src/output.ts` (falls back to a JSON block if omitted)

## Output System

`src/output.ts` renders a `ReconReport` to both formats:
- **JSON** — `JSON.stringify(report, null, 2)`
- **Markdown** — `generateMarkdown()` calls `formatProbeData(name, data)` per probe

`formatProbeData` matches on `probe.name` (string) with a branch per probe type. The default fallback is a fenced JSON block. When renaming a probe's `name` field, update the matching branch in `formatProbeData` too.
