/**
 * Entry point for turning uploaded bytes into citable page text.
 *
 * File type is decided by the magic bytes, never by the filename extension or
 * the browser-supplied Content-Type. Both of those are attacker-controlled.
 */

import { extractDocx } from './docx';
import { extractPdf } from './pdf';
import type { ExtractionResult } from './types';

export * from './types';
export { extractDocx, extractPdf };

export const PDF_MIME = 'application/pdf';
export const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type DetectedType = 'pdf' | 'docx' | 'unknown';

/** `%PDF-` and the ZIP local file header `PK\x03\x04`. */
export function detectFileType(bytes: Uint8Array): DetectedType {
  if (bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d) {
    return 'pdf';
  }
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) {
    return 'docx';
  }
  return 'unknown';
}

export function mimeForType(type: Exclude<DetectedType, 'unknown'>): string {
  return type === 'pdf' ? PDF_MIME : DOCX_MIME;
}

export async function extractDocument(
  bytes: Uint8Array,
  type: Exclude<DetectedType, 'unknown'>,
): Promise<ExtractionResult> {
  try {
    return type === 'pdf' ? await extractPdf(bytes) : await extractDocx(bytes);
  } catch (error) {
    return {
      pages: [],
      hasTextLayer: false,
      failureReason:
        'This document could not be read. ' +
        `(${error instanceof Error ? error.message : 'unknown error'})`,
    };
  }
}
