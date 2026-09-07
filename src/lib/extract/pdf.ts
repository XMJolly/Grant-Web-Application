/**
 * PDF text extraction.
 *
 * Uses `unpdf`, a serverless build of pdf.js that runs inside Cloudflare
 * Workers without Node built-ins. Page boundaries are preserved because a page
 * number is the citation unit the product promises the user: "this claim comes
 * from page 4 of your determination letter".
 *
 * There is no OCR here, by decision. A scanned PDF yields no characters, and
 * the honest response is to say so — see SCAN_MESSAGE — rather than silently
 * storing an empty document that later produces facts with no support.
 */

import {
  assessReadability,
  MIN_CHARS_PER_PAGE,
  SCAN_MESSAGE,
  type ExtractedPage,
  type ExtractionResult,
} from './types';

export async function extractPdf(bytes: Uint8Array): Promise<ExtractionResult> {
  // Imported lazily so the PDF engine is only pulled in when a PDF arrives.
  const { extractText, getDocumentProxy } = await import('unpdf');

  let perPage: string[];
  try {
    const pdf = await getDocumentProxy(bytes);
    const result = await extractText(pdf, { mergePages: false });
    perPage = result.text as unknown as string[];
  } catch (error) {
    return {
      pages: [],
      hasTextLayer: false,
      failureReason:
        'This PDF could not be opened. It may be corrupt, or password protected. ' +
        `(${error instanceof Error ? error.message : 'unknown error'})`,
    };
  }

  const pages: ExtractedPage[] = perPage.map((content, index) => ({
    pageNumber: index + 1,
    pageLabel: `Page ${index + 1}`,
    content: normalisePdfText(content ?? ''),
  }));

  const { hasTextLayer } = assessReadability(pages);

  if (!hasTextLayer) {
    return { pages: [], hasTextLayer: false, failureReason: SCAN_MESSAGE };
  }

  // Keep every page, including the thin ones, so page numbering stays true to
  // the original document. A page below the threshold simply carries no text.
  return {
    pages: pages.map((page) =>
      page.content.trim().length >= MIN_CHARS_PER_PAGE ? page : { ...page, content: '' },
    ),
    hasTextLayer: true,
  };
}

/**
 * pdf.js emits text in drawing order with hard line wraps. Collapsing runs of
 * whitespace and rejoining hyphenated line breaks makes the stored text read
 * the way the page does, which matters because this text is quoted back to the
 * user as evidence.
 */
export function normalisePdfText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/-\n(?=[a-z])/g, '') // re-join words split across a line break
    .replace(/[ \t]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
