import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api-server';
import { AdminAdjust } from './adjust';

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  balance: number;
  pending: number;
  created_at: string;
}

interface FailedJob {
  id: string;
  kind: string;
  error: string | null;
  updatedAt: string;
  user: { email: string };
}

export default async function AdminPage() {
  const [users, failed] = await Promise.all([
    apiFetch<{ items: AdminUser[] }>('/v1/admin/users'),
    apiFetch<{ items: FailedJob[] }>('/v1/admin/jobs/failed'),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Operations."
        description="User list, credit adjustments, and recent failures."
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase tracking-[0.12em] text-ink-3">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">Email</th>
                  <th className="text-left px-5 py-3 font-medium">Plan</th>
                  <th className="text-right px-5 py-3 font-medium">Balance</th>
                  <th className="text-right px-5 py-3 font-medium">Pending</th>
                </tr>
              </thead>
              <tbody>
                {users.items.map((u) => (
                  <tr key={u.id} className="border-t border-line">
                    <td className="px-5 py-2">
                      <div className="font-medium truncate">{u.name ?? u.email}</div>
                      <div className="text-xs text-ink-3">{u.email}</div>
                    </td>
                    <td className="px-5 py-2">
                      <Badge tone="slate">{u.plan}</Badge>
                    </td>
                    <td className="px-5 py-2 text-right font-display tabular-nums">
                      {u.balance.toLocaleString()}
                    </td>
                    <td className="px-5 py-2 text-right text-ink-3 tabular-nums">
                      {u.pending.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <AdminAdjust users={users.items} />
          <Card>
            <CardHeader>
              <CardTitle>Recent failures</CardTitle>
            </CardHeader>
            <CardContent>
              {failed.items.length === 0 ? (
                <p className="text-sm text-ink-3">No failures. Nice.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {failed.items.map((j) => (
                    <li key={j.id} className="rounded-md border border-line p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{j.kind}</span>
                        <span className="text-xs text-ink-3">{j.user.email}</span>
                      </div>
                      {j.error && <p className="mt-1 text-xs text-rose line-clamp-2">{j.error}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
