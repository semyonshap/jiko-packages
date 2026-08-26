import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    console: 'src/console.ts',
    node: 'src/node.ts',
  },
  outDir: 'dist',
  format: ['cjs', 'esm'],
  sourcemap: true,
  dts: true,
  deps: {
    neverBundle: ['next', '@logtape/logtape'],
  },
})
