# Agent Instructions — zb-osint

Quick orientation for any Claude session working in this repo.

## Project Overview

OSINT passive reconnaissance CLI. Runs a pipeline of independent async probes against a target URL and saves JSON + Markdown reports.

## Commands

```bash
pnpm build                                          # compile with tsdown
pnpm recon -- --url https://example.com             # build + run
pnpm recon -- --url https://example.com --output ./reports
pnpm lint                                           # ESLint (zero warnings policy)
pnpm format                                         # ESLint --fix
pnpm check-types                                    # tsc --noEmit
```

> Never run with `tsx src/` — always build first. Puppeteer breaks under tsx due to `__name` transform.

## Environment Variables

Put in `.env` at the project root — loaded automatically via `node --env-file=.env`.

| Variable | Required | Description |
|---|---|---|
| `BRAVE_API_KEY` | For dork results | Brave Search API — free tier (2000 req/month) at https://api.search.brave.com |

## Files in This Directory

| File | Covers |
|------|--------|
| [architecture.md](./architecture.md) | Pipeline, probe interface, output system, how to add a probe |
| [toolchain.md](./toolchain.md) | tsdown, ESLint config, Puppeteer quirks, CJS interop |
