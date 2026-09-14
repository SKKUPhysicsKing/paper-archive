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

  useEffect(() => {
    void window.paperArchive.setFullscreen(true);
    return () => {
      void window.paperArchive.setFullscreen(false);
    };
  }, []);

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
      <main className="pdf-split">
        {swapped ? explanation : original}
        {swapped ? original : explanation}
      </main>
      <div className="reader-controls">
        <button className="reader-controls__back" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span><span>Library</span>
        </button>
        <div className="reader-controls__title" title={paper.title}>
          {paper.title}
        </div>
        <button
          className="reader-controls__swap"
          type="button"
          onClick={() => setSwapped((current) => !current)}
        >
          Swap sides
        </button>
      </div>
    </div>
  );
}

function MissingExplanation({ onSelect }: { onSelect: () => void }) {
  return (
    <section className="pdf-pane pdf-pane--missing">
      <div className="missing-explanation">
        <div className="missing-explanation__message">
          No commentary PDF is linked.
        </div>
        <button className="glass-control" type="button" onClick={onSelect}>
          Choose commentary PDF
        </button>
      </div>
    </section>
  );
}
