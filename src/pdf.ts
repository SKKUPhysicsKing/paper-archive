const pdfCache = new Map<string, Promise<ArrayBuffer>>();

interface PdfLoadOptions {
  fresh?: boolean;
}

function readPdfBuffer(relativePath: string): Promise<ArrayBuffer> {
  return window.paperArchive.readPdf(relativePath).then((value) => {
    const bytes = new Uint8Array(value);
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  });
}

export function getPdfBytes(
  relativePath: string,
  options: PdfLoadOptions = {},
): Promise<Uint8Array> {
  if (options.fresh) {
    return readPdfBuffer(relativePath).then((buffer) => new Uint8Array(buffer));
  }

  const cached = pdfCache.get(relativePath);
  if (cached) return cached.then((buffer) => new Uint8Array(buffer.slice(0)));

  const pending = readPdfBuffer(relativePath).catch((error) => {
    pdfCache.delete(relativePath);
    throw error;
  });

  pdfCache.set(relativePath, pending);
  return pending.then((buffer) => new Uint8Array(buffer.slice(0)));
}

export function clearPdfCache() {
  pdfCache.clear();
}
