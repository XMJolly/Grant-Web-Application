/**
 * DOCX text extraction with no third-party dependencies.
 *
 * A .docx is a ZIP archive; the body text lives in `word/document.xml`. This
 * reads the ZIP central directory directly and inflates the one entry it needs
 * using `DecompressionStream`, which is a web standard available both in
 * Cloudflare Workers and in Node 18+. That keeps the parser identical in
 * production and in tests, and keeps the dependency surface of a security
 * sensitive code path at zero.
 *
 * Word has no fixed page boundaries in the file (pagination is decided by the
 * renderer), so paragraphs are grouped into stable, numbered blocks instead.
 * Those blocks are what evidence will later cite, which is why the label says
 * "Part 3 of 12" rather than pretending to know a page number.
 */

import { PARAGRAPHS_PER_BLOCK, type ExtractedPage, type ExtractionResult } from './types';

const TEXT_DECODER = new TextDecoder();

interface ZipEntry {
  fileName: string;
  compressionMethod: number;
  compressedSize: number;
  uncompressedSize: number;
  localHeaderOffset: number;
}

/** Locates the End Of Central Directory record, scanning back from the tail. */
function findEndOfCentralDirectory(view: DataView): number {
  const maxCommentLength = 0xffff;
  const start = Math.max(0, view.byteLength - maxCommentLength - 22);
  for (let i = view.byteLength - 22; i >= start; i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  throw new Error('Not a ZIP archive: no end-of-central-directory record found.');
}

function readCentralDirectory(bytes: Uint8Array): ZipEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocd = findEndOfCentralDirectory(view);
  const entryCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);

  const entries: ZipEntry[] = [];
  for (let i = 0; i < entryCount; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const fileName = TEXT_DECODER.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));

    entries.push({
      fileName,
      compressionMethod,
      compressedSize,
      uncompressedSize,
      localHeaderOffset,
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflate(raw: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(
    new Blob([raw as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw')),
  );
  return new Uint8Array(await stream.arrayBuffer());
}

async function readEntry(bytes: Uint8Array, entry: ZipEntry): Promise<Uint8Array> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const local = entry.localHeaderOffset;
  if (view.getUint32(local, true) !== 0x04034b50) {
    throw new Error(`Corrupt ZIP entry header for ${entry.fileName}.`);
  }
  const nameLength = view.getUint16(local + 26, true);
  const extraLength = view.getUint16(local + 28, true);
  const dataStart = local + 30 + nameLength + extraLength;
  const raw = bytes.subarray(dataStart, dataStart + entry.compressedSize);

  if (entry.compressionMethod === 0) return raw; // stored
  if (entry.compressionMethod === 8) return inflate(raw); // deflate
  throw new Error(`Unsupported ZIP compression method ${entry.compressionMethod}.`);
}

const XML_ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&(amp|lt|gt|quot|apos);/g, (m) => XML_ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(parseInt(code, 16)));
}

/**
 * Pulls readable paragraphs out of WordprocessingML.
 *
 * Handled explicitly rather than by stripping all tags, because `<w:tab/>` and
 * `<w:br/>` carry meaning, and because table cells must not be run together
 * into one unreadable line. Anything the reader would see as a line break
 * becomes one here too, so the extracted text matches what a person sees.
 */
export function paragraphsFromDocumentXml(xml: string): string[] {
  const body = xml.slice(xml.indexOf('<w:body'));
  const paragraphs: string[] = [];

  for (const match of body.matchAll(/<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g)) {
    const inner = match[1] ?? '';
    let text = '';
    // Walk the runs in document order so tabs and breaks land in place.
    for (const token of inner.matchAll(
      /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?>|<w:br\b[^>]*\/?>|<w:cr\b[^>]*\/?>/g,
    )) {
      if (token[1] !== undefined) text += decodeXmlEntities(token[1]);
      else if (token[0].startsWith('<w:tab')) text += '\t';
      else text += '\n';
    }
    const cleaned = text.replace(/[ \t]+\n/g, '\n').trim();
    if (cleaned.length > 0) paragraphs.push(cleaned);
  }
  return paragraphs;
}

export async function extractDocx(bytes: Uint8Array): Promise<ExtractionResult> {
  const entries = readCentralDirectory(bytes);
  const documentEntry = entries.find((e) => e.fileName === 'word/document.xml');
  if (!documentEntry) {
    return {
      pages: [],
      hasTextLayer: false,
      failureReason: 'This .docx file has no word/document.xml part, so it cannot be read.',
    };
  }

  const xml = TEXT_DECODER.decode(await readEntry(bytes, documentEntry));
  const paragraphs = paragraphsFromDocumentXml(xml);

  if (paragraphs.length === 0) {
    return {
      pages: [],
      hasTextLayer: false,
      failureReason:
        'No readable text was found in this Word document. If the content is a pasted image or a scan, GrantPath cannot read it yet.',
    };
  }

  const blockCount = Math.ceil(paragraphs.length / PARAGRAPHS_PER_BLOCK);
  const pages: ExtractedPage[] = [];
  for (let i = 0; i < blockCount; i++) {
    const slice = paragraphs.slice(i * PARAGRAPHS_PER_BLOCK, (i + 1) * PARAGRAPHS_PER_BLOCK);
    pages.push({
      pageNumber: i + 1,
      pageLabel: `Part ${i + 1} of ${blockCount}`,
      content: slice.join('\n\n'),
    });
  }

  return { pages, hasTextLayer: true };
}
