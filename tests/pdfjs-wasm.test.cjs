const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const pdfjsRoot = path.dirname(require.resolve('pdfjs-dist/package.json'));
const wasmDirectory = path.join(pdfjsRoot, 'wasm');

test('pdf.js distribution contains the JBIG2 decoders copied by Vite', () => {
  const files = new Set(fs.readdirSync(wasmDirectory));
  assert.ok(files.has('jbig2.wasm'));
  assert.ok(files.has('jbig2_nowasm_fallback.js'));
});
