import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page } from 'react-pdf';
import { useElementWidth } from '../hooks/useElementWidth';
import { getPdfBytes, pdfDocumentOptions } from '../pdf';

interface PdfCoverProps {
  relativePath?: string;
  blurred?: boolean;
}

export function PdfCover({ relativePath, blurred = false }: PdfCoverProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const width = useElementWidth(hostRef);
  const [visible, setVisible] = useState(false);
  const [bytes, setBytes] = useState<Uint8Array>();
  const [failed, setFailed] = useState(false);
  const file = useMemo(() => (bytes ? { data: bytes } : undefined), [bytes]);

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '500px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setBytes(undefined);
    setFailed(false);
    if (!visible || !relativePath) return;
    let active = true;
    getPdfBytes(relativePath)
      .then((value) => {
        if (active) setBytes(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [relativePath, visible]);

  return (
    <div
      ref={hostRef}
      className={['pdf-cover', blurred ? 'pdf-cover--blurred' : ''].filter(Boolean).join(' ')}
      aria-hidden="true"
    >
      {file && !failed ? (
        <Document
          key={relativePath}
          file={file}
          options={pdfDocumentOptions}
          loading={null}
          error={null}
          onLoadError={() => setFailed(true)}
        >
          <Page
            pageNumber={1}
            width={Math.max(width, 120)}
            renderAnnotationLayer={false}
            renderTextLayer={false}
            loading={null}
          />
        </Document>
      ) : null}
      {(!relativePath || failed) && <div className="pdf-cover__paper" />}
    </div>
  );
}
