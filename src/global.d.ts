import type { PaperArchiveApi } from './types';

declare global {
  interface Window {
    paperArchive: PaperArchiveApi;
  }
}

export {};
