'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { apiFetch } from '@/lib/api';

interface User {
  id: string;
  email: string;
}

export function AdminAdjust({ users }: { users: User[] }) {
  const { toast } = useToast();
  const [userId, setUserId] = useState(users[0]?.id ?? '');
  const [delta, setDelta] = useState(100);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Adjust credits</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Field label="User">
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="h-10 w-full rounded-md border border-line-2 bg-paper-2 px-3 text-sm"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Delta" hint="Positive to grant, negative to debit.">
          <Input
            type="number"
            value={delta}
            onChange={(e) => setDelta(parseInt(e.target.value, 10) || 0)}
          />
        </Field>
        <Field label="Reason" required>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </Field>
        <Button
          className="w-full"
          loading={loading}
          onClick={async () => {
            if (!reason || !userId) return;
            setLoading(true);
            try {
              await apiFetch('/v1/admin/credits/adjust', {
                method: 'POST',
                body: JSON.stringify({ user_id: userId, delta, reason }),
              });
              toast({ title: 'Balance updated', tone: 'success' });
              setReason('');
            } catch (err) {
              toast({ title: 'Adjustment failed', description: (err as Error).message, tone: 'error' });
            } finally {
              setLoading(false);
            }
          }}
        >
          Apply
        </Button>
      </CardContent>
    </Card>
  );
}
