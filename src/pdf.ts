const pdfCache = new Map<string, Promise<Uint8Array>>();

export function getPdfBytes(relativePath: string): Promise<Uint8Array> {
  const cached = pdfCache.get(relativePath);
  if (cached) return cached;

  const pending = window.paperArchive
    .readPdf(relativePath)
    .then((value) => new Uint8Array(value))
    .catch((error) => {
      pdfCache.delete(relativePath);
      throw error;
    });

  pdfCache.set(relativePath, pending);
  return pending;
}

export function clearPdfCache() {
  pdfCache.clear();
}
