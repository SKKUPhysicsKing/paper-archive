const pdfCache = new Map<string, Promise<ArrayBuffer>>();

export function getPdfBytes(relativePath: string): Promise<Uint8Array> {
  const cached = pdfCache.get(relativePath);
  if (cached) return cached.then((buffer) => new Uint8Array(buffer.slice(0)));

  const pending = window.paperArchive
    .readPdf(relativePath)
    .then((value) => {
      const bytes = new Uint8Array(value);
      return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    })
    .catch((error) => {
      pdfCache.delete(relativePath);
      throw error;
    });

  pdfCache.set(relativePath, pending);
  return pending.then((buffer) => new Uint8Array(buffer.slice(0)));
}

export function clearPdfCache() {
  pdfCache.clear();
}
