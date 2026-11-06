import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const source = fileURLToPath(new URL('../src', import.meta.url));

// Node.js build of the CLI. The output is dist/src/<module>.js.
export default defineConfig({
  root,
  logLevel: 'silent',
  envDir: false,
  publicDir: false,
  resolve: { alias: { '@tarot': source } },
  build: {
    target: 'node26',
    outDir: 'dist',
    minify: false,
    sourcemap: false,
    emptyOutDir: true,
    copyPublicDir: false,
    reportCompressedSize: false,
    lib: { entry: { cli: `${source}/cli.ts` }, formats: ['es'] },
    rolldownOptions: {
      external: [/^node:/],
      output: { preserveModules: true, preserveModulesRoot: source, entryFileNames: 'src/[name].js' }
    }
  }
});
