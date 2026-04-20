import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api-server';
import { SignOut } from './signout';

interface Me {
  user: { id: string; email: string; name: string | null; role: 'user' | 'admin' };
}

export default async function AccountSettingsPage() {
  const me = await apiFetch<Me>('/v1/me');
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Changes sync with your Supabase auth record.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Field label="Name">
            <Input defaultValue={me.user.name ?? ''} disabled />
          </Field>
          <Field label="Email">
            <Input defaultValue={me.user.email} disabled />
          </Field>
          <p className="text-xs text-ink-3">Contact support to change your email.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent>
          <SignOut />
        </CardContent>
      </Card>
    </div>
  );
}
