import Link from 'next/link';
import { PageHeader } from '@/components/page-header';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader eyebrow="Settings" title="Your studio" />
      <div className="grid gap-6 lg:grid-cols-[200px_1fr]">
        <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
          <Link
            href="/settings/account"
            className="rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-paper-3 hover:text-ink"
          >
            Account
          </Link>
          <Link
            href="/settings/billing"
            className="rounded-md px-3 py-2 text-sm text-ink-2 hover:bg-paper-3 hover:text-ink"
          >
            Billing & credits
          </Link>
        </nav>
        <div>{children}</div>
      </div>
    </>
  );
}
