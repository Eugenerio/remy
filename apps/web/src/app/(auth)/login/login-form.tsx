'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Field, Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { createClient } from '@/lib/supabase/browser';

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/dashboard';
  const [mode, setMode] = useState<'password' | 'magic'>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    try {
      if (mode === 'magic') {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        toast({ title: 'Check your email', description: `We sent a magic link to ${email}.`, tone: 'success' });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(next);
        router.refresh();
      }
    } catch (error) {
      toast({
        title: 'Sign in failed',
        description: (error as Error).message,
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Field label="Email" required>
        <Input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </Field>
      {mode === 'password' && (
        <Field label="Password" required>
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
      )}

      <Button type="submit" size="lg" loading={loading} className="mt-2">
        {mode === 'password' ? 'Sign in' : 'Email me a link'}
      </Button>

      <button
        type="button"
        onClick={() => setMode((m) => (m === 'password' ? 'magic' : 'password'))}
        className="text-sm text-ink-3 hover:text-ink-2 underline underline-offset-2"
      >
        {mode === 'password' ? 'Use a magic link instead' : 'Use a password'}
      </button>
    </form>
  );
}
