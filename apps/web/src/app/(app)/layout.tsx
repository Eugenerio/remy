import { redirect } from 'next/navigation';
import { AppShell, type CurrentUser } from '@/components/app-shell';
import { apiFetch } from '@/lib/api-server';

interface MeResponse {
  user: { id: string; email: string; name: string | null; role: 'user' | 'admin'; onboarded_at: string | null };
  balance: { current: number; pending: number; available: number };
  subscription: { plan: string; status: string };
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // We intentionally skip a separate `supabase.auth.getUser()` here — the
  // middleware already gates unauthenticated access, and `/v1/me` below
  // verifies the token on the API side. One less Supabase round-trip.
  let me: MeResponse;
  try {
    me = await apiFetch<MeResponse>('/v1/me');
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401) redirect('/login');
    // First-request race (trigger not yet run): show a friendly placeholder.
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-ink-2">Setting up your studio…</div>
      </div>
    );
  }

  if (!me.user.onboarded_at) {
    redirect('/onboarding');
  }

  const currentUser: CurrentUser = {
    id: me.user.id,
    email: me.user.email,
    name: me.user.name,
    role: me.user.role,
    balance: me.balance,
    plan: me.subscription.plan,
  };

  // Pass the SSR payload as initialMe so the sidebar hydrates with the
  // server-fetched data; AppShell live-polls /v1/me for ongoing updates.
  return (
    <AppShell user={currentUser} initialMe={me as unknown as never}>
      {children}
    </AppShell>
  );
}
