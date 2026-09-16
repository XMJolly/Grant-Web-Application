/**
 * Extraction tests. Run with:  npm run test:extract
 *
 * These run against real files rather than fixtures invented for the test,
 * because the thing being verified is a judgement call about messy real
 * documents: "can Vouch actually read this, or is it a scan?".
 *
 * Put sample documents in `samples/` — see samples/README.md. Any that are
 * missing are skipped with a notice rather than failing the run, so the suite
 * is still useful on a fresh clone.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { extractDocx, paragraphsFromDocumentXml } from '../src/lib/extract/docx';
import { normalisePdfText } from '../src/lib/extract/pdf';
import { detectFileType } from '../src/lib/extract/index';
import { assessReadability, type ExtractedPage } from '../src/lib/extract/types';

let passed = 0;
let failed = 0;
let skipped = 0;

function check(label: string, condition: boolean, detail = ''): void {
  if (condition) {
    passed++;
    console.log(`pass  ${label}`);
  } else {
    failed++;
    console.log(`FAIL  ${label}${detail ? `  — ${detail}` : ''}`);
  }
}

function skip(label: string, why: string): void {
  skipped++;
  console.log(`skip  ${label}  (${why})`);
}

function page(pageNumber: number, content: string): ExtractedPage {
  return { pageNumber, pageLabel: `Page ${pageNumber}`, content };
}

const SAMPLES = join(import.meta.dirname ?? join(process.cwd(), 'scripts'), '..', 'samples');
const sample = (name: string) => join(SAMPLES, name);

async function main(): Promise<void> {
  console.log('\n=== 1. File type detection (magic bytes, not file extension) ===');

  check('a PDF is detected as pdf', detectFileType(new TextEncoder().encode('%PDF-1.7\n...')) === 'pdf');
  check('a ZIP/DOCX is detected as docx', detectFileType(new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0])) === 'docx');
  check('an executable is rejected', detectFileType(new Uint8Array([0x4d, 0x5a, 0x90, 0x00])) === 'unknown');
  check('an HTML file renamed to .pdf is rejected',
    detectFileType(new TextEncoder().encode('<!doctype html><script>')) === 'unknown');
  check('an empty file is rejected', detectFileType(new Uint8Array([])) === 'unknown');

  console.log('\n=== 2. Scan detection ===');

  const scanned = Array.from({ length: 8 }, (_, i) => page(i + 1, ''));
  check('an 8-page scan with no text layer is not readable',
    assessReadability(scanned).hasTextLayer === false);

  const ocrNoise = Array.from({ length: 8 }, (_, i) => page(i + 1, 'l1I0 ~'));
  check('a scan yielding only stray characters is not readable',
    assessReadability(ocrNoise).hasTextLayer === false);

  const realText = Array.from({ length: 8 }, (_, i) =>
    page(i + 1, 'To be eligible, applicants must have been a registered charity for a minimum of 12 months.'));
  check('a born-digital document is readable',
    assessReadability(realText).hasTextLayer === true);

  const mixed = [...realText.slice(0, 5), ...scanned.slice(0, 3)];
  check('a mostly-digital document with scanned attachments is readable',
    assessReadability(mixed).hasTextLayer === true);

  const mostlyScanned = [...realText.slice(0, 2), ...scanned.slice(0, 6)];
  check('a mostly-scanned document is not readable',
    assessReadability(mostlyScanned).hasTextLayer === false);

  check('a cover page alone is not enough to call a document readable',
    assessReadability([page(1, 'Community Grant Application'), ...scanned.slice(0, 7)]).hasTextLayer === false);

  check('no pages at all is not readable', assessReadability([]).hasTextLayer === false);

  console.log('\n=== 3. PDF text normalisation ===');

  check('hyphenated line breaks are rejoined',
    normalisePdfText('reimburse-\nment') === 'reimbursement');
  check('run-together whitespace is collapsed',
    normalisePdfText('Award   range:    $5,000') === 'Award range: $5,000');
  check('paragraph breaks survive',
    normalisePdfText('First line.\n\n\n\nSecond line.') === 'First line.\n\nSecond line.');
  check('a real hyphenated compound is left alone',
    normalisePdfText('tax-exempt status') === 'tax-exempt status');

  console.log('\n=== 4. WordprocessingML paragraph extraction ===');

  const xml = `<w:document><w:body>
    <w:p><w:r><w:t>Jolly Dream Foundation</w:t></w:r></w:p>
    <w:p><w:r><w:t xml:space="preserve">Serves </w:t></w:r><w:r><w:t>Charles County</w:t></w:r></w:p>
    <w:p><w:r><w:t>Budget:</w:t></w:r><w:tab/><w:r><w:t>$412,000</w:t></w:r></w:p>
    <w:p><w:r><w:t>Line one</w:t></w:r><w:br/><w:r><w:t>Line two</w:t></w:r></w:p>
    <w:p></w:p>
    <w:p><w:r><w:t>Fish &amp; chips &lt;tag&gt; &#8212; dash</w:t></w:r></w:p>
  </w:body></w:document>`;
  const paras = paragraphsFromDocumentXml(xml);

  check('one paragraph per w:p', paras.length === 5, `got ${paras.length}`);
  check('runs inside a paragraph are joined', paras[1] === 'Serves Charles County', paras[1]);
  check('tabs are preserved', paras[2] === 'Budget:\t$412,000', JSON.stringify(paras[2]));
  check('line breaks are preserved', paras[3] === 'Line one\nLine two', JSON.stringify(paras[3]));
  check('empty paragraphs are dropped', !paras.includes(''));
  check('XML entities are decoded', paras[4] === 'Fish & chips <tag> — dash', paras[4]);

  console.log('\n=== 5. Real documents ===');

  const capstone = sample('capstone.docx');
  if (existsSync(capstone)) {
    const bytes = new Uint8Array(readFileSync(capstone));
    check('the capstone .docx is detected as docx', detectFileType(bytes) === 'docx');

    const result = await extractDocx(bytes);
    check('the capstone .docx is readable', result.hasTextLayer === true, result.failureReason);
    check('it produced numbered blocks', result.pages.length > 1, `${result.pages.length} blocks`);
    check('block labels are human readable', /^Part 1 of \d+$/.test(result.pages[0]?.pageLabel ?? ''),
      result.pages[0]?.pageLabel);
    check('block numbering is contiguous',
      result.pages.every((p, i) => p.pageNumber === i + 1));

    const all = result.pages.map((p) => p.content).join('\n');
    check('known content is present: Jolly Dream Foundation', all.includes('Jolly Dream Foundation'));
    check('known content is present: eMMA', all.includes('eMMA'));
    check('table cell text is captured', /Gloria Jolly/i.test(all));
    console.log(`      → ${result.pages.length} blocks, ${all.length.toLocaleString()} characters`);
  } else {
    skip('capstone .docx extraction', 'samples/capstone.docx not present');
  }

  const scannedPdf = sample('scanned-grant.pdf');
  if (existsSync(scannedPdf)) {
    const bytes = new Uint8Array(readFileSync(scannedPdf));
    check('the scanned grant PDF is detected as pdf', detectFileType(bytes) === 'pdf');
    // The extraction itself needs `unpdf`, which is exercised by the app; here
    // we only assert the file is what the scan-detection test assumes it is.
  } else {
    skip('scanned PDF detection', 'samples/scanned-grant.pdf not present');
  }

  console.log(`\n${failed === 0 ? '✓' : '✗'} ${passed} passed, ${failed} failed, ${skipped} skipped\n`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
