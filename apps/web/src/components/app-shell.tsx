'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import * as React from 'react';
import { cn } from '@/lib/cn';
import { createClient } from '@/lib/supabase/browser';
import { useMe, type MeResponse } from '@/lib/queries';
import {
  Admin,
  Billing,
  Characters,
  Film,
  Library,
  Logo,
  Settings as SettingsIcon,
  SparkSmall,
  Trend,
  User as UserIcon,
} from './icons';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  adminOnly?: boolean;
}

const nav: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: SparkSmall },
  { href: '/characters', label: 'Characters', icon: Characters },
  { href: '/trends', label: 'Trends', icon: Trend },
  { href: '/generate', label: 'Generate', icon: Film },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/settings/account', label: 'Settings', icon: SettingsIcon },
  { href: '/settings/billing', label: 'Billing', icon: Billing },
  { href: '/admin', label: 'Admin', icon: Admin, adminOnly: true },
];

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  balance: { current: number; pending: number; available: number };
  plan: string;
}

export function AppShell({
  children,
  user,
  initialMe,
}: {
  children: React.ReactNode;
  user: CurrentUser;
  initialMe?: MeResponse;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // Live-poll /v1/me so the sidebar balance + plan stay accurate while the
  // user moves around the app or a background job refunds / charges credits.
  const { data: me } = useMe(initialMe);
  const liveBalance = me?.balance ?? user.balance;
  const livePlan = me?.subscription?.plan ?? user.plan;
  const liveName = me?.user?.name ?? user.name;
  const liveEmail = me?.user?.email ?? user.email;
  const liveRole = me?.user?.role ?? user.role;
  const items = nav.filter((n) => !n.adminOnly || liveRole === 'admin');

  const onSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <div className="min-h-screen lg:flex">
      <aside
        className={cn(
          'border-b lg:border-b-0 lg:border-r border-line bg-sidebar',
          'lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:shrink-0 lg:flex lg:flex-col',
        )}
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-line">
          <Logo size={26} className="text-ink" />
          <span className="font-display text-xl tracking-tight">Remy</span>
        </div>

        <nav
          className={cn(
            'flex-1 flex flex-wrap lg:flex-nowrap lg:flex-col',
            'px-2 py-3 gap-1',
          )}
        >
          {items.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium',
                  'transition-colors duration-fast ease-claude',
                  active
                    ? 'bg-paper-2 text-ink shadow-card'
                    : 'text-ink-2 hover:text-ink hover:bg-paper-3/60',
                )}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="hidden lg:flex lg:flex-col gap-2 border-t border-line p-3">
          <Link
            href="/settings/billing"
            className={cn(
              'block rounded-lg bg-paper-2 border border-line shadow-card p-3',
              'hover:border-line-2 hover:shadow-raised transition',
            )}
          >
            <div className="flex items-center justify-between text-xs text-ink-3">
              <span>Credits</span>
              <span className="capitalize">{livePlan}</span>
            </div>
            <div className="mt-1 font-display text-2xl tabular-nums text-ink">
              {liveBalance.available.toLocaleString()}
            </div>
            <div className="mt-0.5 text-xs text-ink-3">
              {liveBalance.pending > 0
                ? `${liveBalance.pending.toLocaleString()} pending`
                : 'ready to spend'}
            </div>
          </Link>

          <button
            onClick={onSignOut}
            className={cn(
              'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm',
              'text-ink-2 hover:text-ink hover:bg-paper-3/60 transition',
            )}
          >
            <UserIcon size={16} />
            <span className="truncate flex-1 text-left">{liveName ?? liveEmail}</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-8 py-8 pb-24">{children}</div>
      </main>
    </div>
  );
}
