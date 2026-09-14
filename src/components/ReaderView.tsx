import { useEffect, useState } from 'react';
import type { PaperEntry } from '../types';
import { PdfPane } from './PdfPane';

interface ReaderViewProps {
  paper: PaperEntry;
  onBack: () => void;
}

export function ReaderView({ paper, onBack }: ReaderViewProps) {
  const [swapped, setSwapped] = useState(false);
  const [explanationPath, setExplanationPath] = useState(paper.explanationPath);

  useEffect(() => {
    setSwapped(false);
    setExplanationPath(paper.explanationPath);
  }, [paper]);

  const selectExplanation = async () => {
    const selected = await window.paperArchive.chooseExplanation(paper.originalPath);
    if (selected) setExplanationPath(selected);
  };

  const original = <PdfPane relativePath={paper.originalPath} />;
  const explanation = explanationPath ? (
    <PdfPane relativePath={explanationPath} />
  ) : (
    <MissingExplanation onSelect={selectExplanation} />
  );

  return (
    <div className="reader-shell">
      <header className="reader-header">
        <button className="reader-header__back" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span>
          <span>라이브러리</span>
        </button>
        <div className="reader-header__title" title={paper.title}>
          {paper.title}
        </div>
        <button className="reader-header__swap" type="button" onClick={() => setSwapped(!swapped)}>
          좌우 바꾸기
        </button>
      </header>
      <main className="pdf-split">
        {swapped ? explanation : original}
        {swapped ? original : explanation}
      </main>
    </div>
  );
}

function MissingExplanation({ onSelect }: { onSelect: () => void }) {
  return (
    <section className="pdf-pane pdf-pane--missing">
      <div className="pdf-pane__toolbar">
        <span className="pdf-pane__filename">해설 PDF</span>
      </div>
      <div className="missing-explanation">
        <p>연결된 해설 PDF가 없습니다.</p>
        <button type="button" onClick={onSelect}>
          해설 PDF 선택
        </button>
      </div>
    </section>
  );
}
