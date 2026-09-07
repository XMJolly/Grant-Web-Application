'use client';

import { useState } from 'react';

import { Button, Card, Field, Input, Select } from '@/components/ui';

import { CATEGORY_LABELS, SENSITIVE_CATEGORIES } from './status';

import type { DocumentCategory } from '@/lib/database.types';

/**
 * A plain multipart form posting to a route handler, not a server action.
 *
 * Two reasons: server actions carry a small body limit that a 25 MB scan would
 * exceed, and a plain form still works if JavaScript fails — which matters for
 * a user on an old laptop over rural broadband.
 */
export function UploadForm() {
  const [category, setCategory] = useState<DocumentCategory>('determination_letter');
  const sensitive = SENSITIVE_CATEGORIES.includes(category);

  return (
    <Card
      title="Upload a document"
      description="PDF or Word, up to 25 MB. Stored privately for your organization only."
    >
      <form
        action="/api/documents/upload"
        method="post"
        encType="multipart/form-data"
        className="space-y-5"
      >
        <Field label="What kind of document is this?" hint="This decides who on your team can open it.">
          <Select
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value as DocumentCategory)}
          >
            {(Object.keys(CATEGORY_LABELS) as DocumentCategory[]).map((key) => (
              <option key={key} value={key}>
                {CATEGORY_LABELS[key]}
              </option>
            ))}
          </Select>
        </Field>

        {sensitive ? (
          <p className="rounded-lg border border-warn-200 bg-warn-50 px-3 py-2 text-xs text-warn-700">
            Financial and personnel documents are hidden from volunteers automatically.
          </p>
        ) : null}

        <Field label="File" hint="Original files work best. Scans cannot be read yet.">
          <Input type="file" name="file" accept=".pdf,.docx" required />
        </Field>

        <Button type="submit">Upload</Button>
      </form>
    </Card>
  );
}
