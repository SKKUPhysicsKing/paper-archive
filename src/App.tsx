import { useCallback, useEffect, useRef, useState } from 'react';
import { LibraryView } from './components/LibraryView';
import { ReaderView } from './components/ReaderView';
import { clearPdfCache } from './pdf';
import type { DirectoryListing, FolderEntry, LibraryInfo, PaperEntry } from './types';

const EMPTY_LISTING: DirectoryListing = {
  relativePath: '',
  folders: [],
  papers: [],
};

export default function App() {
  const [library, setLibrary] = useState<LibraryInfo | null>();
  const [listing, setListing] = useState<DirectoryListing>(EMPTY_LISTING);
  const [activePaper, setActivePaper] = useState<PaperEntry>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const requestId = useRef(0);

  const navigate = useCallback(async (relativePath: string) => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(undefined);
    try {
      const nextListing = await window.paperArchive.listDirectory(relativePath);
      if (currentRequest === requestId.current) setListing(nextListing);
    } catch (reason) {
      if (currentRequest === requestId.current) setError(readableError(reason));
    } finally {
      if (currentRequest === requestId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    window.paperArchive
      .getLibrary()
      .then((currentLibrary) => {
        if (!active) return;
        setLibrary(currentLibrary);
        if (currentLibrary) navigate('');
      })
      .catch((reason) => {
        if (!active) return;
        setLibrary(null);
        setError(readableError(reason));
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  const selectLibrary = async () => {
    try {
      const selected = await window.paperArchive.selectLibrary();
      if (!selected) return;
      clearPdfCache();
      setLibrary(selected);
      setActivePaper(undefined);
      setListing(EMPTY_LISTING);
      await navigate('');
    } catch (reason) {
      setError(readableError(reason));
    }
  };

  if (library === undefined) {
    return <div className="launch-state">Loading library</div>;
  }

  if (!library) {
    return <Welcome error={error} onSelectLibrary={selectLibrary} />;
  }

  if (activePaper) {
    return (
      <ReaderView
        paper={activePaper}
        onBack={() => {
          setActivePaper(undefined);
          navigate(listing.relativePath);
        }}
      />
    );
  }

  return (
    <LibraryView
      library={library}
      listing={listing}
      loading={loading}
      error={error}
      onOpenFolder={(folder: FolderEntry) => navigate(folder.relativePath)}
      onOpenPaper={(paper: PaperEntry) => setActivePaper(paper)}
      onNavigate={navigate}
      onSelectLibrary={selectLibrary}
    />
  );
}

function Welcome({
  error,
  onSelectLibrary,
}: {
  error?: string;
  onSelectLibrary: () => void;
}) {
  return (
    <main className="welcome">
      <div className="welcome__content">
        <h1>Open a local paper library</h1>
        <p>Your files remain in their original folders.</p>
        <button type="button" onClick={onSelectLibrary}>
          Choose folder
        </button>
        {error ? <div className="welcome__error">{error}</div> : null}
      </div>
    </main>
  );
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to read this folder.';
}
