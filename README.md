# zb-osint

Passive OSINT reconnaissance CLI for websites. Runs a pipeline of probes against a target URL and outputs structured JSON and Markdown reports.

## Probes

| Probe | Source | What it collects |
|---|---|---|
| DNS Records | `node:dns` | A, AAAA, MX, NS, TXT, CNAME, SOA |
| WHOIS | `whois-json` | Registrar, creation/expiry dates |
| SSL/TLS Certificate | `node:tls` | Subject, issuer, validity, protocol, SANs |
| HTTP Headers | `fetch` | Server, X-Powered-By, security headers audit |
| robots.txt | `fetch` + `robots-parser` | Raw content, sitemaps, crawl-delay |
| Tech Stack | Puppeteer | CMS, JS frameworks, meta generator |
| Subdomains | crt.sh CT logs | All subdomains from certificate transparency |
| Common Paths | `fetch` HEAD | `/sitemap.xml`, `/.well-known/security.txt`, `/.git/HEAD`, `/.env`, admin paths |
| HTTP Redirect | `fetch` | HTTP → HTTPS redirect check |
| Wayback Machine | archive.org API | Earliest/latest snapshots |
| Puppeteer Analysis | Puppeteer | Console logs, network requests, JS libraries, external domains |
| Search Engine Dorks | Brave Search API | Documents, config files, login pages, leaked credentials, subdomains |

## Setup

```bash
# Requires Node >=20 and pnpm
corepack enable
pnpm install
```

Create a `.env` file for optional features:

```env
# Brave Search API — free tier (2000 req/month): https://api.search.brave.com
BRAVE_API_KEY=your_key_here

# Google Gemini API — required for AI-generated PDF reports (free tier: aistudio.google.com)
GEMINI_API_KEY=your_key_here
# GEMINI_MODEL=gemini-2.5-flash   # optional, this is the default
```

## Configuration

Copy `config.json` and fill in your details (student name, course, university, etc.). This file controls default probe toggles, output formats, and report metadata. All fields can be overridden per-run with CLI flags.

## Usage

```bash
# Single target
pnpm start -- recon -u https://example.com
pnpm start -- recon -u example.com --output ./reports

# Multiple targets — generates a combined report
pnpm start -- recon -u example.com other.com

# Enable PDF output (requires GEMINI_API_KEY)
pnpm start -- recon -u example.com --pdf

# Control probes
pnpm start -- recon -u example.com --disable-probes dorks,puppeteer
pnpm start -- recon -u example.com --enable-probes dorks --disable-probes puppeteer

# Control output formats
pnpm start -- recon -u example.com --pdf --no-md

# Generate a PDF from existing JSON report(s)
pnpm start -- report ./reports/example.com.json
pnpm start -- report ./reports/a.com.json ./reports/b.com.json --language Polish
```

The `-u` / `--url` flag accepts bare domains (`example.com` → `https://example.com`).

Reports are saved to `./reports/` (or `--output` dir):
- `example.com.json` — full structured data
- `example.com.md` — human-readable Markdown
- `example.com.pdf` — AI-generated academic report (when `--pdf` and `GEMINI_API_KEY` set)

## Development

```bash
pnpm build        # compile
pnpm lint         # ESLint (zero warnings)
pnpm format       # auto-fix formatting
pnpm check-types  # TypeScript type check
```
