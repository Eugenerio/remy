'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api';

interface Props {
  data: {
    subscription: { plan: string; status: string; current_period_end: string | null };
    plans: Record<string, { id: string; name: string; monthlyCredits: number; priceMonthly: number }>;
    topups: Record<string, { id: string; credits: number; price: number }>;
    balance: { current: number; pending: number; lifetime_granted: number; lifetime_spent: number };
    invoices: { id: string; status: string; amountPaid: number; currency: string; issuedAt: string; hostedInvoiceUrl: string | null; creditsGranted: number }[];
    transactions: { id: string; kind: string; status: string; amount: number; reason: string | null; createdAt: string }[];
  };
}

export function BillingClient({ data }: Props) {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const openCheckout = async (
    endpoint: '/v1/billing/checkout/subscription' | '/v1/billing/checkout/topup',
    body: unknown,
    key: string,
  ) => {
    setBusy(key);
    try {
      const res = await apiFetch<{ url: string }>(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      window.location.href = res.url;
    } catch (err) {
      toast({ title: 'Checkout unavailable', description: (err as Error).message, tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  const openPortal = async () => {
    setBusy('portal');
    try {
      const res = await apiFetch<{ url: string }>('/v1/billing/portal', { method: 'POST' });
      window.location.href = res.url;
    } catch (err) {
      toast({ title: 'Portal unavailable', description: (err as Error).message, tone: 'error' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Balance</CardTitle>
            <CardDescription>
              {data.balance.lifetime_spent.toLocaleString()} credits spent to date.
            </CardDescription>
          </div>
          <Badge tone="leaf">{data.subscription.plan}</Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-6">
          <Big label="Available" value={data.balance.current - data.balance.pending} />
          <Big label="Reserved" value={data.balance.pending} />
          <Big label="Lifetime granted" value={data.balance.lifetime_granted} muted />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            {data.subscription.status} · renews {data.subscription.current_period_end
              ? new Date(data.subscription.current_period_end).toLocaleDateString()
              : '—'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {Object.values(data.plans)
            .filter((p) => p.priceMonthly > 0)
            .map((p) => {
              const current = data.subscription.plan === p.id;
              return (
                <div
                  key={p.id}
                  className={`rounded-md border p-4 ${
                    current ? 'bg-ink text-paper border-ink' : 'bg-paper-2 border-line'
                  }`}
                >
                  <div className="font-display text-xl">{p.name}</div>
                  <div className={current ? 'text-paper/80' : 'text-ink-2'}>
                    {p.monthlyCredits.toLocaleString()} credits / month
                  </div>
                  <div className="mt-2 font-display text-2xl">
                    ${(p.priceMonthly / 100).toFixed(0)}
                    <span className={`text-sm font-sans ${current ? 'text-paper/70' : 'text-ink-3'}`}>
                      /mo
                    </span>
                  </div>
                  <Button
                    className="mt-3 w-full"
                    variant={current ? 'subtle' : 'primary'}
                    size="sm"
                    loading={busy === `plan:${p.id}`}
                    onClick={() =>
                      current
                        ? openPortal()
                        : openCheckout('/v1/billing/checkout/subscription', { plan: p.id }, `plan:${p.id}`)
                    }
                  >
                    {current ? 'Manage' : 'Upgrade'}
                  </Button>
                </div>
              );
            })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Top-up packs</CardTitle>
          <CardDescription>One-time credit purchases — never expire.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {Object.values(data.topups).map((p) => (
            <div key={p.id} className="rounded-md border border-line bg-paper-2 p-4">
              <div className="font-display text-xl">+{p.credits.toLocaleString()}</div>
              <div className="mt-1 text-ink-2">credits</div>
              <div className="mt-3 font-display text-2xl">${(p.price / 100).toFixed(0)}</div>
              <Button
                className="mt-3 w-full"
                size="sm"
                loading={busy === `pack:${p.id}`}
                onClick={() => openCheckout('/v1/billing/checkout/topup', { pack: p.id }, `pack:${p.id}`)}
              >
                Buy
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-[0.12em] text-ink-3">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Kind</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium text-right">Credits</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id} className="border-t border-line">
                  <td className="px-5 py-2 text-ink-3">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-2">{t.kind.replaceAll('_', ' ')}</td>
                  <td className="px-5 py-2 text-ink-2 truncate max-w-[260px]">{t.reason ?? ''}</td>
                  <td className="px-5 py-2 font-display text-right tabular-nums">
                    {t.amount > 0 ? `+${t.amount}` : t.amount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Big({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.12em] text-ink-3">{label}</div>
      <div className={`font-display text-3xl tabular-nums ${muted ? 'text-ink-3' : ''}`}>
        {value.toLocaleString()}
      </div>
    </div>
  );
}
