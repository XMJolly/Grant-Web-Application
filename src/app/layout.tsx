import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'GrantPath',
  description:
    'A source-backed grant and reimbursement assistant for very small community nonprofits.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-ink">{children}</body>
    </html>
  );
}
