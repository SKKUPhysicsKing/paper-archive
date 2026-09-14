import type { DirectoryListing, FolderEntry, LibraryInfo, PaperEntry } from '../types';
import { FolderCard, PaperCard } from './ArchiveCard';

interface LibraryViewProps {
  library: LibraryInfo;
  listing: DirectoryListing;
  loading: boolean;
  error?: string;
  onOpenFolder: (entry: FolderEntry) => void;
  onOpenPaper: (entry: PaperEntry) => void;
  onNavigate: (relativePath: string) => void;
  onSelectLibrary: () => void;
}

function breadcrumbs(library: LibraryInfo, relativePath: string) {
  const parts = relativePath.split('/').filter(Boolean);
  return [
    { label: library.name, path: '' },
    ...parts.map((part, index) => ({
      label: part,
      path: parts.slice(0, index + 1).join('/'),
    })),
  ];
}

export function LibraryView({
  library,
  listing,
  loading,
  error,
  onOpenFolder,
  onOpenPaper,
  onNavigate,
  onSelectLibrary,
}: LibraryViewProps) {
  const crumbs = breadcrumbs(library, listing.relativePath);
  const isEmpty = listing.folders.length === 0 && listing.papers.length === 0;

  return (
    <div className="library-shell">
      <header className="library-header">
        <button className="wordmark" type="button" onClick={() => onNavigate('')}>
          PAPER ARCHIVE
        </button>
        <nav className="breadcrumbs" aria-label="현재 폴더">
          {crumbs.map((crumb, index) => (
            <span className="breadcrumb" key={crumb.path || '__root__'}>
              {index > 0 && <span className="breadcrumb__separator">/</span>}
              <button type="button" onClick={() => onNavigate(crumb.path)}>
                {crumb.label}
              </button>
            </span>
          ))}
        </nav>
        <button className="quiet-action" type="button" onClick={onSelectLibrary}>
          폴더 변경
        </button>
      </header>

      <main className="library-content" aria-busy={loading}>
        {error ? <div className="status-message status-message--error">{error}</div> : null}
        {loading ? <div className="status-message">폴더를 읽는 중입니다.</div> : null}

        {!loading && !error ? (
          <>
            <div className="archive-grid">
              {listing.folders.map((folder) => (
                <FolderCard key={folder.relativePath} entry={folder} onOpen={onOpenFolder} />
              ))}
              {listing.papers.map((paper) => (
                <PaperCard key={paper.originalPath} entry={paper} onOpen={onOpenPaper} />
              ))}
            </div>
            {isEmpty ? (
              <div className="empty-state">
                <p>이 폴더에는 하위 폴더나 PDF가 없습니다.</p>
              </div>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}
