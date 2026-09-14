export interface LibraryInfo {
  name: string;
  path: string;
}

export interface FolderEntry {
  kind: 'folder';
  name: string;
  relativePath: string;
  representativePdfPath?: string;
}

export interface PaperEntry {
  kind: 'paper';
  title: string;
  originalName: string;
  explanationName?: string;
  originalPath: string;
  explanationPath?: string;
}

export interface DirectoryListing {
  relativePath: string;
  folders: FolderEntry[];
  papers: PaperEntry[];
}

export interface PaperArchiveApi {
  getLibrary(): Promise<LibraryInfo | null>;
  selectLibrary(): Promise<LibraryInfo | null>;
  listDirectory(relativePath: string): Promise<DirectoryListing>;
  readPdf(relativePath: string): Promise<Uint8Array>;
  chooseExplanation(originalRelativePath: string): Promise<string | null>;
  setFullscreen(active: boolean): Promise<boolean>;
}
