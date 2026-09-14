import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { Document, Page } from 'react-pdf';
import { useElementWidth } from '../hooks/useElementWidth';
import { getPdfBytes, pdfDocumentOptions } from '../pdf';

interface PdfPaneProps {
  relativePath: string;
}

export function PdfPane({ relativePath }: PdfPaneProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const paneWidth = useElementWidth(scrollRef);
  const [bytes, setBytes] = useState<Uint8Array>();
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [error, setError] = useState<string>();
  const [pageRatios, setPageRatios] = useState<Record<number, number>>({});
  const file = useMemo(() => (bytes ? { data: bytes } : undefined), [bytes]);
  const filename = relativePath.split('/').at(-1) ?? relativePath;
  const pageWidth = Math.max(260, paneWidth * zoom);

  useEffect(() => {
    let active = true;
    setBytes(undefined);
    setNumPages(0);
    setPageRatios({});
    setZoom(1);
    setError(undefined);
    getPdfBytes(relativePath, { fresh: true })
      .then((value) => {
        if (active) setBytes(value);
      })
      .catch((reason) => {
        if (active) setError(readableError(reason));
      });
    return () => {
      active = false;
    };
  }, [relativePath]);

  const handleLoad = useCallback((document: PDFDocumentProxy) => {
    setNumPages(document.numPages);
  }, []);

  const rememberRatio = useCallback((page: PDFPageProxy) => {
    const viewport = page.getViewport({ scale: 1 });
    setPageRatios((current) => {
      const ratio = viewport.height / viewport.width;
      return current[page.pageNumber] === ratio
        ? current
        : { ...current, [page.pageNumber]: ratio };
    });
  }, []);

  const adjustZoom = (amount: number) => {
    setZoom((current) => Math.min(1.8, Math.max(0.65, current + amount)));
  };

  return (
    <section className="pdf-pane">
      <div className="pdf-pane__scroll" ref={scrollRef}>
        {error ? <div className="pdf-message">{error}</div> : null}
        {!file && !error ? <div className="pdf-message">PDF를 여는 중입니다.</div> : null}
        {file ? (
          <Document
            key={relativePath}
            file={file}
            options={pdfDocumentOptions}
            onLoadSuccess={handleLoad}
            onLoadError={(reason) => setError(readableError(reason))}
            loading={<div className="pdf-message">PDF를 여는 중입니다.</div>}
            error={<div className="pdf-message">PDF를 표시할 수 없습니다.</div>}
          >
            <div className="pdf-pages">
              {Array.from({ length: numPages }, (_, index) => {
                const pageNumber = index + 1;
                return (
                  <LazyPage
                    key={pageNumber}
                    pageNumber={pageNumber}
                    width={pageWidth}
                    ratio={pageRatios[pageNumber] ?? 1.4142}
                    onLoad={rememberRatio}
                  />
                );
              })}
            </div>
          </Document>
        ) : null}
      </div>

      <div className="pdf-pane__floating-toolbar">
        <span className="glass-label pdf-pane__filename" title={filename}>
          {filename}
        </span>
        <div className="glass-control zoom-control" aria-label="확대/축소">
          <button type="button" onClick={() => adjustZoom(-0.1)} aria-label="축소">−</button>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => adjustZoom(0.1)} aria-label="확대">+</button>
        </div>
      </div>
    </section>
  );
}

interface LazyPageProps {
  pageNumber: number;
  width: number;
  ratio: number;
  onLoad: (page: PDFPageProxy) => void;
}

function LazyPage({ pageNumber, width, ratio, onLoad }: LazyPageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: '1400px 0px' },
    );
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={hostRef} className="pdf-page-shell" style={{ width, minHeight: width * ratio }}>
      {visible ? (
        <Page
          pageNumber={pageNumber}
          width={width}
          onLoadSuccess={onLoad}
          loading={null}
          renderAnnotationLayer
          renderTextLayer
        />
      ) : null}
    </div>
  );
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'PDF를 표시할 수 없습니다.';
}
