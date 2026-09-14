import type { FolderEntry, PaperEntry } from '../types';
import { PdfCover } from './PdfCover';

interface FolderCardProps {
  entry: FolderEntry;
  onOpen: (entry: FolderEntry) => void;
}

export function FolderCard({ entry, onOpen }: FolderCardProps) {
  return (
    <button className="archive-card folder-card" onClick={() => onOpen(entry)} type="button">
      <div className="archive-card__sheet">
        <PdfCover relativePath={entry.representativePdfPath} blurred />
        <div className="folder-card__veil" />
        <div className="folder-card__label">{entry.name}</div>
      </div>
    </button>
  );
}

interface PaperCardProps {
  entry: PaperEntry;
  onOpen: (entry: PaperEntry) => void;
}

export function PaperCard({ entry, onOpen }: PaperCardProps) {
  return (
    <button className="archive-card paper-card" onClick={() => onOpen(entry)} type="button">
      <div className="archive-card__sheet">
        <PdfCover relativePath={entry.originalPath} />
        <div className="paper-card__caption">{entry.title}</div>
      </div>
    </button>
  );
}
