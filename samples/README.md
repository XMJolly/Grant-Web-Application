# Sample documents

Real files used by `npm run test:extract`. They are git-ignored, because they
are someone's real organizational documents.

| File | What it proves |
|------|----------------|
| `capstone.docx` | A long Word document with tables extracts cleanly |
| `scanned-grant.pdf` | A scanned PDF is correctly refused rather than silently read as empty |

Drop your own files in with these names, or add cases to `scripts/test-extract.ts`.
Missing files are skipped, not failed.
