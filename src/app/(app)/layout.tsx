import Link from 'next/link';

import { requireSession } from '@/lib/auth';

import { SignOutButton } from './SignOutButton';

const NAV: { href: string; label: string; ready: boolean }[] = [
  { href: '/dashboard', label: 'Home', ready: true },
  { href: '/organization', label: 'Organization profile', ready: true },
  { href: '/documents', label: 'Documents', ready: true },
  { href: '/members', label: 'People and roles', ready: true },
  { href: '/facts', label: 'Verified facts', ready: false },
  { href: '/opportunities', label: 'Opportunities', ready: false },
  { href: '/applications', label: 'Applications', ready: false },
  { href: '/reporting', label: 'Reporting', ready: false },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="shrink-0 bg-navy-900 text-white md:w-64">
        <div className="px-5 py-5">
          <p className="text-lg font-semibold tracking-tight">GrantPath</p>
          <p className="mt-0.5 truncate text-xs text-white/60">
            {session.organization.legal_name}
          </p>
        </div>

        <nav className="px-3 pb-4">
          <ul className="space-y-0.5">
            {NAV.map((item) =>
              item.ready ? (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="block rounded-lg px-3 py-2 text-sm text-white/85 hover:bg-navy-700 hover:text-white"
                  >
                    {item.label}
                  </Link>
                </li>
              ) : (
                <li
                  key={item.href}
                  className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-white/35"
                  title="Not built yet"
                >
                  <span>{item.label}</span>
                  <span className="rounded border border-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                    Soon
                  </span>
                </li>
              ),
            )}
          </ul>
        </nav>

        <div className="mt-auto border-t border-white/10 px-5 py-4">
          <p className="truncate text-xs text-white/70">{session.user.email}</p>
          <p className="mt-0.5 text-xs capitalize text-white/45">{session.member.role}</p>
          <SignOutButton />
        </div>
      </aside>

      <main className="flex-1 px-5 py-8 md:px-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
