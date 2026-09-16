export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-2xl font-semibold tracking-tight text-navy-900">Vouch</p>
          <p className="mt-1 text-sm text-ink-faint">
            Source-backed grant help for small community nonprofits
          </p>
        </div>
        {children}
      </div>
    </main>
  );
}
