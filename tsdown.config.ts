import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/**/*.ts', '!./src/**/*.d.ts'],
  format: ['esm'],
  treeshake: true,
  dts: true,
  unbundle: true,
  platform: 'node',
})
