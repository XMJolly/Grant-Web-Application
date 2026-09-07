/**
 * Shared types and tuning constants for document text extraction.
 *
 * These thresholds decide whether GrantPath says "I read this document" or
 * "I cannot read this document". Getting that wrong in the permissive direction
 * is the worst failure mode in the product: a scanned page that yields a few
 * stray characters of OCR noise would look like a successfully read document,
 * and every fact later drawn from it would be unsupported. The defaults below
 * are deliberately cautious, and they are validated against real files by
 * `scripts/test-extract.ts`.
 */

export interface ExtractedPage {
  pageNumber: number;
  /** What the user is shown when this page is cited, e.g. "Page 4". */
  pageLabel: string;
  content: string;
}

export interface ExtractionResult {
  pages: ExtractedPage[];
  hasTextLayer: boolean;
  /** Present only when the document could not be read. Shown to the user verbatim. */
  failureReason?: string;
}

/** Word documents have no page breaks in the file, so paragraphs are blocked. */
export const PARAGRAPHS_PER_BLOCK = 25;

/**
 * A PDF page carrying fewer than this many characters is treated as having no
 * usable text. Scanned pages typically yield 0; pages that are mostly a figure
 * with a caption yield a few dozen.
 */
export const MIN_CHARS_PER_PAGE = 40;

/**
 * Share of pages that must carry usable text before the whole document counts
 * as readable. Set below half so that a mixed document — a born-digital form
 * with a few scanned attachments — is still usable, while a wholly scanned
 * document is rejected.
 */
export const MIN_READABLE_PAGE_RATIO = 0.4;

/** A document yielding less than this in total is never treated as readable. */
export const MIN_TOTAL_CHARS = 200;

export const SCAN_MESSAGE =
  'This document appears to be a scan or a set of page images. GrantPath can only read documents that contain real text, so no facts will be proposed from it. Please upload an original PDF or Word file if you have one — OCR for scanned documents is not built yet.';

/**
 * Decides whether an extraction is trustworthy enough to build facts on.
 * Pure and side-effect free so it can be unit tested directly.
 */
export function assessReadability(pages: ExtractedPage[]): {
  hasTextLayer: boolean;
  readablePages: number;
  totalChars: number;
} {
  const readablePages = pages.filter((p) => p.content.trim().length >= MIN_CHARS_PER_PAGE).length;
  const totalChars = pages.reduce((sum, p) => sum + p.content.trim().length, 0);
  const hasTextLayer =
    pages.length > 0 &&
    totalChars >= MIN_TOTAL_CHARS &&
    readablePages / pages.length >= MIN_READABLE_PAGE_RATIO;

  return { hasTextLayer, readablePages, totalChars };
}
