# Toolchain

## Build — tsdown

`tsdown` (rolldown-based) compiles unbundled ESM. Config in `tsdown.config.ts`:
- Entry: all `src/**/*.ts` files
- Output: `dist/` mirrors `src/` structure
- Format: ESM only, with `.d.mts` declarations

## ESLint

Flat config in `eslint.config.ts` (loaded via `jiti`). Style rules:
- No semicolons
- Single quotes
- `consistent-type-imports` enforced
- Ignores: `dist/`, `reports/`, `node_modules/`

Run `pnpm format` to auto-fix. Zero warnings policy — CI will fail on any warning.

## Puppeteer

- Installed via `postinstall: pnpm dlx puppeteer browsers install chrome`
- **Must run from compiled `dist/`** — `tsx` transforms Puppeteer's bundled code and breaks it (`__name is not defined`)
- Uses dynamic `import('puppeteer')` in `src/probes/puppeteer.ts` with `mod.default ?? mod` pattern
- `pnpm.onlyBuiltDependencies: ["puppeteer"]` — intentional, do not change
- `.npmrc` sets `node-linker=hoisted` — required for Puppeteer to find its Chrome binary

## CJS Interop

**`robots-parser`** — CJS package with no ESM export. Loaded via:
```ts
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const robotsParser = require('robots-parser') as (url: string, content: string) => RobotsParser
```

**`whois-json`** — no upstream type declarations. Typed in `src/global.d.ts`:
```ts
declare module 'whois-json' {
  function whois(domain: string): Promise<Record<string, unknown>>
  export default whois
}
```

## Node Version

Requires Node >=20. The project uses built-in:
- `fetch` (no node-fetch)
- `node:dns/promises`
- `node:tls`
- `--env-file` flag for `.env` loading
