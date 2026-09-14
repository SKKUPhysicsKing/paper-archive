import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const require = createRequire(import.meta.url);
const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
const pdfjsWasmDirectory = path.join(pdfjsRoot, 'wasm');

function pdfjsWasm() {
  const filenames = fs.readdirSync(pdfjsWasmDirectory);
  const allowedFiles = new Set(filenames);

  return {
    name: 'paper-archive-pdfjs-wasm',

    configureServer(server) {
      server.middlewares.use('/wasm', (request, response, next) => {
        const pathname = decodeURIComponent((request.url ?? '').split('?')[0]);
        const filename = path.basename(pathname);
        if (!allowedFiles.has(filename)) {
          next();
          return;
        }

        const absolutePath = path.join(pdfjsWasmDirectory, filename);
        response.statusCode = 200;
        response.setHeader(
          'Content-Type',
          filename.endsWith('.wasm') ? 'application/wasm' : 'text/javascript; charset=utf-8',
        );
        fs.createReadStream(absolutePath).pipe(response);
      });
    },

    generateBundle() {
      for (const filename of filenames) {
        this.emitFile({
          type: 'asset',
          fileName: `wasm/${filename}`,
          source: fs.readFileSync(path.join(pdfjsWasmDirectory, filename)),
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), pdfjsWasm()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
