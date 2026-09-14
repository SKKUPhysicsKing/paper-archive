import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
const wasmDirectory = path.join(pdfjsRoot, 'wasm');

test('pdf.js distribution contains the JBIG2 decoders copied by Vite', () => {
  const files = new Set(fs.readdirSync(wasmDirectory));
  assert.ok(files.has('jbig2.wasm'));
  assert.ok(files.has('jbig2_nowasm_fallback.js'));
});
