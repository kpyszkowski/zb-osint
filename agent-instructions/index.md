# Agent Instructions — zb-osint

Quick orientation for any Claude session working in this repo.

## Project Overview

OSINT passive reconnaissance CLI. Runs a pipeline of independent async probes against a target URL and saves JSON + Markdown reports.

## Commands

```bash
pnpm build                                                      # compile with tsdown
pnpm start -- recon -u https://example.com                      # run recon
pnpm start -- recon -u https://example.com --output ./reports
pnpm start -- recon -u example.com other.com --pdf              # multi-target + PDF
pnpm start -- recon -u example.com --disable-probes dorks,puppeteer
pnpm start -- report ./reports/example.com.json                 # PDF from existing JSON
pnpm start -- report ./reports/a.json ./reports/b.json          # multi-target PDF from JSON
pnpm lint                                                        # ESLint (zero warnings policy)
pnpm format                                                      # ESLint --fix
pnpm check-types                                                 # tsc --noEmit
```

> Never run with `tsx src/` — always build first. Puppeteer breaks under tsx due to `__name` transform.

## Environment Variables

Put in `.env` at the project root — loaded automatically via `node --env-file=.env`.

| Variable | Required | Description |
|---|---|---|
| `BRAVE_API_KEY` | For dork results | Brave Search API — free tier (2000 req/month) at https://api.search.brave.com |
| `GEMINI_API_KEY` | For PDF reports | Google Gemini API key — required for AI-generated academic PDF reports (free tier available at aistudio.google.com) |
| `GEMINI_MODEL` | Optional | Gemini model to use (default: `gemini-2.5-flash`) |

## AI Report Generation

When `GEMINI_API_KEY` is set, PDF reports are fully written by Gemini in academic style. The model receives the full probe JSON and the `agent-instructions/` files as system context, then generates a complete, structured academic report with per-probe analysis and conclusions.

Without `GEMINI_API_KEY`, PDF generation is skipped with a warning — only JSON and Markdown outputs are written.

The `language` field in `config.json` (or `--language` CLI flag) controls the output language of the entire report, including headings.

```bash
pnpm start -- recon -u example.com --pdf --language Polish
pnpm start -- report ./reports/example.com.json --language French
```

## Files in This Directory

| File | Covers |
|------|--------|
| [architecture.md](./architecture.md) | Pipeline, probe interface, output system, how to add a probe |
| [toolchain.md](./toolchain.md) | tsdown, ESLint config, Puppeteer quirks, CJS interop |
